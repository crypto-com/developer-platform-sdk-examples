import { OpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/index.js';
import { logger } from '../../helpers/logger.helper.js';
import { OpenAIModelError, OpenAIUnauthorizedError } from '../../lib/errors/service.errors.js';
import { SmartWalletService } from '../smartwallet/smartwallet.service.js';
import { SSOWalletService } from '../ssowallet/ssowallet.service.js';
import { CONTENT, MAX_CONTEXT_LENGTH, TOOLS } from './agent.constants.js';
import {
  AIMessageResponse,
  Function,
  FunctionArgs,
  FunctionCallResponse,
  Options,
  QueryContext,
  Role,
  Status,
  TransferArgs,
} from './agent.interfaces.js';
import { validateArgs } from './agent.helpers.js';

/**
 * AIAgentService class handles Chain AI operations.
 *
 * @class AIAgentService
 */
export class AIAgentService {
  private options: Options;
  private client: OpenAI;
  private smartWalletService: SmartWalletService;
  private ssoWalletService: SSOWalletService;
  private readonly FUNCTION_REGISTRY: Record<string, (args: FunctionArgs) => Promise<FunctionCallResponse>>;

  /**
   * @param {Options} options - Configuration options including chain details.
   */
  constructor(options: Options) {
    this.options = options;
    this.client = new OpenAI({ apiKey: options.openAI.apiKey });
    this.smartWalletService = new SmartWalletService();
    this.ssoWalletService = new SSOWalletService();
    this.FUNCTION_REGISTRY = {
      [Function.CreateSSOWallet]: async () => this.ssoWalletService.createWallet(),
      [Function.CreateSSOSession]: async (args) => this.ssoWalletService.createSSOSession(args),
      [Function.TransferFunds]: async (args) => this.ssoWalletService.transfer(args as TransferArgs),
      [Function.AccountRequest]: async () => this.smartWalletService.accountRequest(),
      [Function.InitCopyTrade]: async (args) => this.smartWalletService.initCopyTrade(args.from),
    };
  }

  /**
   * Interprets a user's query using AI to determine appropriate function calls.
   *
   * @async
   * @param {string} query - The user's query to interpret.
   * @param {QueryContext[]} context - The conversation context.
   * @returns {Promise<ChatCompletion>} - A Promise resolving to the AI's interpretation and suggested function calls.
   * @memberof AIAgentService
   */
  public async interpretUserQuery(query: string, context: QueryContext[]): Promise<AIMessageResponse> {
    try {
      const messages: Array<ChatCompletionMessageParam> = [
        {
          role: Role.System,
          content: CONTENT,
        },
        ...context,
        { role: Role.User, content: query },
      ];
      const chatCompletion = await this.client.chat.completions.create({
        model: this.options.openAI.model || 'gpt-4-turbo',
        messages: messages,
        tools: TOOLS,
        tool_choice: 'auto',
      }, {
        stream: true,
      });
      return chatCompletion.choices[0].message as AIMessageResponse;
    } catch (e) {
      if (e instanceof Error && e.message.includes('Incorrect API key provided')) {
        throw new OpenAIUnauthorizedError(`OpenAI API key is invalid. ${e.message}`);
      }
      if (e instanceof Error && e.message.includes('The model') && e.message.includes('does not exist')) {
        throw new OpenAIModelError(`${e.message}`);
      }
      logger.error('Unknown error while interpreting user query: ', e);
      throw e;
    }
  }

  /**
   * Process AI's interpretation of the user's query, and returns a list of function responses.
   *
   * @async
   * @param {AIMessageResponse} interpretation - The AI's interpretation of the user's query.
   * @returns {Promise<FunctionCallResponse[]>} - A Promise resolving to the processed blockchain function responses.
   * @memberof AIAgentService
   */
  public async processInterpretation(interpretation: AIMessageResponse): Promise<FunctionCallResponse[]> {
    let functionResponses: FunctionCallResponse[] = [];
    const functionsToExecute = interpretation.tool_calls;

    if (functionsToExecute) {
      functionResponses = await Promise.all(
        functionsToExecute.map(async (toolCall) => {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          return await this.executeFunction(functionName, functionArgs);
        })
      );
    } else {
      functionResponses.push({
        status: Status.NoFunctionCalled,
        data: { content: JSON.stringify(interpretation.content) },
      });
    }
    return functionResponses;
  }

  /**
   * Execute a function. Returns a BlockchainFunctionResponse regardless of the function execution status.
   *
   * @async
   * @param {BlockchainFunction} functionName - The blockchain function to execute.
   * @param {FunctionArgs} functionArgs - The arguments required for the function.
   * @returns {Promise<FunctionCallResponse>} - A Promise resolving to the blockchain function response.
   * @memberof AIAgentService
   */
  private async executeFunction(functionName: Function, functionArgs: FunctionArgs): Promise<FunctionCallResponse> {
    const func = this.FUNCTION_REGISTRY[functionName];
    if (!func) {
      return { status: Status.Failed, data: { message: `Unknown function: ${functionName}` } };
    }

    if (!validateArgs(functionName, functionArgs)) {
      return { status: Status.Failed, data: { message: `Missing required arguments for ${functionName}` } };
    }

    try {
      return await func(functionArgs);
    } catch (e) {
      logger.error(`Error executing function ${functionName}:`, e);
      return { status: Status.Failed, data: { message: `Error executing function: ${e}` } };
    }
  }

  /**
   * Updates the conversation context with the user's query and the AI's response.
   *
   * @async
   * @param {QueryContext[]} context - The current conversation context.
   * @param {string} query - The user's query.
   * @param {string} response - Stringified JSON response from the AI.
   * @returns {QueryContext} - The updated context.
   * @memberof AIAgentService
   */
  public updateContext(context: QueryContext[], query: string, response: string): QueryContext[] {
    const newContext = [...context];
    newContext.push({ role: Role.User, content: query });
    newContext.push({ role: Role.Assistant, content: response });

    // Ensure context does not exceed the maximum allowed length
    if (newContext.length > MAX_CONTEXT_LENGTH) {
      return newContext.slice(-MAX_CONTEXT_LENGTH); // Keep the most recent messages
    }

    return newContext;
  }
}
