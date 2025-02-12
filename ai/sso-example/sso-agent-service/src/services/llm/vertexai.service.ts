import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import { LLMConfig, LLMService } from './llm.interface.js';
import {
  AIMessageResponse,
  FunctionCallResponse,
  QueryContext,
  Role,
  BlockchainFunction,
} from '../agent/agent.interfaces.js';
import { TOOLS } from '../agent/agent.constants.js';
import { ChatCompletionTool } from 'openai/resources/index.js';
import {
  Tool,
  FunctionDeclarationSchemaProperty,
  Part,
  FunctionCall,
} from '@google-cloud/vertexai/build/src/types/content';

// Define Vertex AI specific types
enum FunctionDeclarationSchemaType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  OBJECT = 'OBJECT',
}

// Define interfaces for tool conversion
interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
}

export class VertexAIService implements LLMService {
  private vertexai: VertexAI;
  private model: GenerativeModel;
  private projectId: string;
  private location: string;
  private modelName: string;

  constructor(config: LLMConfig) {
    if (!config.projectId) {
      throw new Error('Project ID is required for Vertex AI');
    }
    this.projectId = config.projectId;
    this.location = config.location || 'us-central1';
    this.modelName = config.model || 'gemini-1.0-pro';

    this.vertexai = new VertexAI({
      project: this.projectId,
      location: this.location,
    });

    this.model = this.vertexai.getGenerativeModel({
      model: this.modelName,
      generation_config: {
        temperature: 0.1,
        top_p: 0.95,
        max_output_tokens: 8192,
      },
      tools: this.convertToolsToVertexAIFormat(TOOLS),
    });
  }

  private convertToolsToVertexAIFormat(tools: ChatCompletionTool[]): Tool[] {
    return [
      {
        function_declarations: tools.map((tool) => {
          if (!tool.function?.parameters) {
            throw new Error('Invalid tool format: missing parameters');
          }

          const required = Array.isArray(tool.function.parameters.required) ? tool.function.parameters.required : [];

          return {
            name: tool.function.name,
            description: tool.function.description || '',
            parameters: {
              type: FunctionDeclarationSchemaType.OBJECT,
              properties: this.convertParametersToVertexAIFormat(
                tool.function.parameters.properties as Record<string, ToolParameter>
              ),
              required: required,
            },
          };
        }),
      },
    ];
  }

  private convertParametersToVertexAIFormat(properties: Record<string, ToolParameter>): {
    [k: string]: FunctionDeclarationSchemaProperty;
  } {
    const result: { [k: string]: FunctionDeclarationSchemaProperty } = {};

    for (const [key, value] of Object.entries(properties)) {
      const type = this.mapJsonSchemaTypeToVertexAI(value.type);

      if (value.enum) {
        result[key] = {
          type,
          description: value.description,
          enum: value.enum,
        };
      } else {
        result[key] = {
          type,
          description: value.description,
        };
      }
    }

    return result;
  }

  private mapJsonSchemaTypeToVertexAI(type: string): FunctionDeclarationSchemaType {
    switch (type) {
      case 'string':
        return FunctionDeclarationSchemaType.STRING;
      case 'number':
        return FunctionDeclarationSchemaType.NUMBER;
      case 'boolean':
        return FunctionDeclarationSchemaType.BOOLEAN;
      case 'object':
        return FunctionDeclarationSchemaType.OBJECT;
      default:
        return FunctionDeclarationSchemaType.STRING;
    }
  }

  async generateResponse(context: QueryContext[]): Promise<AIMessageResponse> {
    try {
      const messages = context.map((msg) => ({
        role: msg.role === Role.System ? 'user' : msg.role.toLowerCase(),
        parts: [{ text: msg.content }],
      }));

      // Add a more flexible system message for general queries
      messages.unshift({
        role: 'user',
        parts: [
          {
            text: 'You are a helpful AI assistant with knowledge about blockchain and general topics. For blockchain operations, you can interact with Ethereum and Cronos chains.',
          },
        ],
      });

      const result = await this.model.generateContent({
        contents: messages,
        tools: this.convertToolsToVertexAIFormat(TOOLS),
      });

      const response = result.response;
      const content = response.candidates[0]?.content;

      if (!content) {
        throw new Error('No content generated');
      }

      // Handle multiple function calls
      if (content.parts && content.parts.length > 0) {
        const functionCalls = content.parts.filter(
          (part: Part) => 'functionCall' in part && part.functionCall !== undefined
        );

        if (functionCalls.length > 0) {
          return {
            content: '',
            tool_calls: functionCalls.map((part: Part, index) => {
              const functionCall = (part as { functionCall: FunctionCall }).functionCall;
              return {
                id: `call-${index + 1}`,
                type: 'function',
                function: {
                  name: functionCall.name as BlockchainFunction,
                  arguments: JSON.stringify(functionCall.args),
                },
              };
            }),
          };
        }

        // If no function calls, return text response
        return {
          content: content.parts[0].text || '',
          tool_calls: undefined,
        };
      }

      throw new Error('Invalid response format from model');
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  async interpretUserQuery(query: string, context: QueryContext[]): Promise<AIMessageResponse> {
    const fullContext = [...context, { role: Role.User, content: query }];
    return this.generateResponse(fullContext);
  }

  async generateFinalResponse(
    query: string,
    functionResponses: FunctionCallResponse[],
    context: QueryContext[]
  ): Promise<string> {
    const functionResults = functionResponses
      .map((response, index) => `Function ${index + 1} result: ${JSON.stringify(response)}`)
      .join('\n');

    const prompt = `
      Original query: ${query}\n
      Function results: ${functionResults}\n
      Please provide a natural language response based on these results.
    `;

    const response = await this.interpretUserQuery(prompt, context);
    return response.content;
  }
}
