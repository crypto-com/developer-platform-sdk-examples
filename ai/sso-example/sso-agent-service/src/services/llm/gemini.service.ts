import { AIMessageResponse, FunctionCallResponse, QueryContext, Role } from '../agent/agent.interfaces.js';
import { LLMConfig, LLMService } from './llm.interface.js';
import { logger } from '../../helpers/logger.helper.js';
// disable no-unused-vars

import { CONTENT, GEMINI_TOOLS } from '../agent/agent.constants.js';
//import { CONTENT } from '../agent/agent.constants.js';
import axios from 'axios';

// Add interfaces for Gemini's message structure
interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

interface GeminiFunctionResponse {
  name: string;
  response: {
    result: string;
  };
}

interface GeminiMessagePart {
  text?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: GeminiFunctionResponse;
}

interface GeminiMessage {
  role: string;
  parts: GeminiMessagePart[];
}

export class GeminiService implements LLMService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private lastAssistantMessage: AIMessageResponse | null = null;

  constructor(config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-1.5-pro';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  private formatContextForGemini(context: QueryContext[]): GeminiMessage[] {
    return context.map((ctx) => ({
      role: this.mapRoleToGemini(ctx.role),
      parts: [{ text: ctx.content }],
    }));
  }

  private mapRoleToGemini(role: Role): string {
    switch (role) {
      case Role.System:
        return 'system';
      case Role.User:
        return 'user';
      case Role.Assistant:
        return 'assistant';
      case Role.Tool:
        return 'function';
      default:
        return 'user';
    }
  }

  public async interpretUserQuery(query: string, context: QueryContext[]): Promise<AIMessageResponse> {
    try {
      const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

      const messages: GeminiMessage[] = [
        { role: 'model', parts: [{ text: CONTENT }] },
        ...this.formatContextForGemini(context),
        { role: 'user', parts: [{ text: query }] },
      ];

      const payload = {
        contents: messages,
        tools: GEMINI_TOOLS,
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
        },
      };

      const response = await axios.post(url, payload);

      const content = response.data.candidates[0].content;

      if (content.parts[0].functionCall) {
        const functionCall = content.parts[0].functionCall;
        this.lastAssistantMessage = {
          content: '',
          tool_calls: [
            {
              id: `call-${Date.now()}`,
              type: 'function',
              function: {
                name: functionCall.name,
                arguments: JSON.stringify(functionCall.args),
              },
            },
          ],
        };
      } else {
        this.lastAssistantMessage = {
          content: content.parts[0].text,
          tool_calls: undefined,
        };
      }

      return this.lastAssistantMessage;
    } catch (error) {
      logger.error('Error in Gemini interpretUserQuery:', error);
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async generateFinalResponse(
    query: string,
    functionResponses: FunctionCallResponse[],
    context: QueryContext[]
  ): Promise<string> {
    try {
      const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

      const messages: GeminiMessage[] = [
        {
          role: 'model',
          parts: [
            {
              text: 'You are a helpful blockchain assistant. Generate a clear, concise response based on the function results.',
            },
          ],
        },
        ...this.formatContextForGemini(context),
        { role: 'user', parts: [{ text: query }] },
      ];

      if (this.lastAssistantMessage?.tool_calls) {
        // Add the original assistant message with function call
        const toolCall = this.lastAssistantMessage.tool_calls[0];
        messages.push({
          role: 'assistant',
          parts: [
            {
              functionCall: {
                name: toolCall.function.name,
                args: JSON.parse(toolCall.function.arguments),
              },
            },
          ],
        });

        // Add function responses in the correct format
        functionResponses.forEach((response) => {
          messages.push({
            role: 'function',
            parts: [
              {
                functionResponse: {
                  name: toolCall.function.name,
                  response: {
                    result: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
                  },
                },
              },
            ],
          });
        });
      }

      const payload = {
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
        },
      };

      const response = await axios.post(url, payload);
      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      logger.error('Error in Gemini generateFinalResponse:', error);
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateResponse(context: QueryContext[]): Promise<AIMessageResponse> {
    const lastMessage = context[context.length - 1];
    return this.interpretUserQuery(lastMessage.content, context);
  }
}
