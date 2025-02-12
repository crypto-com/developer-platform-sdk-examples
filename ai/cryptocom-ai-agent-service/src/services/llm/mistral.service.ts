import { Mistral } from '@mistralai/mistralai';
import { AssistantMessage } from '@mistralai/mistralai/models/components/assistantmessage.js';
import { SystemMessage } from '@mistralai/mistralai/models/components/systemmessage.js';
import { ToolMessage } from '@mistralai/mistralai/models/components/toolmessage.js';
import { UserMessage } from '@mistralai/mistralai/models/components/usermessage.js';
import { logger } from '../../helpers/logger.helper.js';
import { CONTENT, MISTRAL_TOOLS } from '../agent/agent.constants.js';
import { AIMessageResponse, FunctionCallResponse, QueryContext, Role, ToolCall } from '../agent/agent.interfaces.js';
import { LLMConfig, LLMService } from './llm.interface.js';

export type MistralMessageType =
  | (SystemMessage & { role: 'system' })
  | (UserMessage & { role: 'user' })
  | (AssistantMessage & { role: 'assistant' })
  | (ToolMessage & { role: 'tool' });

export class MistralService implements LLMService {
  private apiKey: string;
  private model: string;
  private client: Mistral;
  private lastAssistantMessage: AIMessageResponse | null = null;

  constructor(config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error('Mistral API key is required');
    }
    this.apiKey = config.apiKey;
    this.model = config.model || 'ministral-3b-latest';
    this.client = new Mistral({ apiKey: this.apiKey });
  }

  private formatContextForMistral(context: QueryContext[]): MistralMessageType[] {
    return context.map(
      (ctx) =>
        ({
          role: this.mapRoleToMistral(ctx.role),
          content: ctx.content,
        }) as MistralMessageType
    );
  }

  private mapRoleToMistral(role: Role): string {
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
      const messages: MistralMessageType[] = [
        {
          role: 'system' as const,
          content: CONTENT,
        },
        ...this.formatContextForMistral(context),
        {
          role: 'user' as const,
          content: query,
        },
      ];

      const chatCompletion = await this.client.chat.complete({
        model: this.model,
        messages: messages,
        tools: MISTRAL_TOOLS,
      });

      if (!chatCompletion.choices || !chatCompletion.choices[0]?.message) {
        throw new Error('No response received from Mistral');
      }

      this.lastAssistantMessage = {
        content: chatCompletion.choices[0].message.content as string,
        tool_calls: chatCompletion.choices[0].message.toolCalls as ToolCall[],
      };

      return this.lastAssistantMessage;
    } catch (error) {
      logger.error('Error in Mistral interpretUserQuery:', error);
      throw new Error(`Mistral API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async generateFinalResponse(
    query: string,
    functionResponses: FunctionCallResponse[],
    context: QueryContext[]
  ): Promise<string> {
    try {
      const messages: MistralMessageType[] = [
        {
          role: 'system',
          content:
            'You are a helpful blockchain assistant powered by Mistral. Generate a clear, concise response based on the function results: ' +
            JSON.stringify(functionResponses, null, 2),
        },
        ...this.formatContextForMistral(context),
        {
          role: 'user',
          content: query,
        },
      ];

      const chatCompletion = await this.client.chat.complete({
        model: this.model,
        messages: messages,
      });

      if (!chatCompletion.choices || !chatCompletion.choices[0]?.message?.content) {
        return 'Unable to generate response';
      }

      return (chatCompletion.choices[0].message.content as string) || 'Unable to generate response';
    } catch (error) {
      logger.error('Error in Mistral generateFinalResponse:', error);
      throw new Error(`Mistral API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
