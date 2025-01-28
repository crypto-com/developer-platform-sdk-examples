import { OpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/index.js';
import { logger } from '../../helpers/logger.helper.js';
import { DeepSeekModelError, DeepSeekUnauthorizedError } from '../../lib/errors/service.errors.js';
import { CONTENT, TOOLS } from '../agent/agent.constants.js';
import { AIMessageResponse, FunctionCallResponse, QueryContext, Role } from '../agent/agent.interfaces.js';
import { LLMConfig, LLMService } from './llm.interface.js';

type DeepSeekRole = 'system' | 'user' | 'assistant' | 'tool' | 'function';

export class DeepSeekService implements LLMService {
  private client: OpenAI;
  private model: string;
  private lastAssistantMessage: AIMessageResponse | null = null;

  constructor(config: LLMConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: 'https://api.deepseek.com' });
    this.model = config.model || 'deepseek-chat';
  }

  private mapRoleToDeepSeek(role: Role): DeepSeekRole {
    switch (role) {
      case Role.System:
        return 'system';
      case Role.User:
        return 'user';
      case Role.Assistant:
        return 'assistant';
      case Role.Tool:
        return 'tool';
      default:
        return 'user'; // Default fallback
    }
  }

  private createMessage(role: DeepSeekRole, content: string): ChatCompletionMessageParam {
    return {
      role,
      content,
    } as ChatCompletionMessageParam;
  }

  public async interpretUserQuery(query: string, context: QueryContext[]): Promise<AIMessageResponse> {
    console.log('DEEPSEEK - deepseek.service.ts:44');
    try {
      const messages: ChatCompletionMessageParam[] = [
        this.createMessage('system', CONTENT),
        ...context.map((ctx) => this.createMessage(this.mapRoleToDeepSeek(ctx.role), ctx.content)),
        this.createMessage('user', query),
      ];

      const chatCompletion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        tools: TOOLS,
        tool_choice: 'auto',
      });

      this.lastAssistantMessage = chatCompletion.choices[0].message as AIMessageResponse;
      return this.lastAssistantMessage;
    } catch (e) {
      if (e instanceof Error && e.message.includes('Incorrect API key provided')) {
        throw new DeepSeekUnauthorizedError(`DeepSeek API key is invalid. ${e.message}`);
      }
      if (e instanceof Error && e.message.includes('The model') && e.message.includes('does not exist')) {
        throw new DeepSeekModelError(`${e.message}`);
      }
      logger.error('Unknown error while interpreting user query: ', e);
      throw e;
    }
  }

  public async generateFinalResponse(
    query: string,
    functionResponses: FunctionCallResponse[],
    context: QueryContext[]
  ): Promise<string> {
    try {
      const messages: ChatCompletionMessageParam[] = [
        this.createMessage(
          'system',
          'You are a helpful blockchain assistant powered by DeepSeek. Generate a clear, concise response based on the function results.'
        ),
        ...context.map((ctx) => this.createMessage(this.mapRoleToDeepSeek(ctx.role), ctx.content)),
        this.createMessage('user', query),
      ];

      // Add the last assistant message with tool calls
      if (this.lastAssistantMessage && this.lastAssistantMessage.tool_calls) {
        messages.push({
          role: 'assistant',
          content: this.lastAssistantMessage.content,
          tool_calls: this.lastAssistantMessage.tool_calls,
        } as ChatCompletionMessageParam);

        // Add function responses as tool messages
        functionResponses.forEach((response, index) => {
          messages.push({
            role: 'tool',
            content: JSON.stringify(response.data, null, 2),
            tool_call_id: this.lastAssistantMessage?.tool_calls?.[index]?.id,
          } as ChatCompletionMessageParam);
        });
      }

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
      });

      return completion.choices[0].message.content || 'Unable to generate response';
    } catch (e) {
      logger.error('Error generating final response:', e);
      return 'Error generating final response';
    }
  }

  async generateResponse(context: QueryContext[]): Promise<AIMessageResponse> {
    const lastMessage = context[context.length - 1];
    return this.interpretUserQuery(lastMessage.content, context);
  }
}
