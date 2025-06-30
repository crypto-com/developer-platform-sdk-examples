import {
  Block,
  Client,
  Contract,
  Token,
  Transaction,
  Wallet,
} from '@crypto.com/developer-platform-client';
import { validateFunctionArgs } from '../../helpers/agent.helpers.js';
import { DASHBOARD_API_KEY, DEVELOPER_PLATFORM_PROVIDER_URL, EXPLORER_API_KEY } from '../../helpers/constants/global.constants.js';
import { logger } from '../../helpers/logger.helper.js';
import { BaseError } from '../../lib/errors/base.error.js';
import { DeepSeekService } from '../llm/deepseek.service.js';
import { GeminiService } from '../llm/gemini.service.js';
import { LLMService } from '../llm/llm.interface.js';
import { MistralService } from '../llm/mistral.service.js';
import { OpenAIService } from '../llm/openai.service.js';
import { VertexAIService } from '../llm/vertexai.service.js';
import {
  AIMessageResponse,
  BlockchainFunction,
  FunctionArgs,
  FunctionCallResponse,
  LLMProvider,
  Options,
  QueryContext,
  Role,
  Status,
} from './agent.interfaces.js';

/**
 * Initialize Developer Platform SDK
 */
Client.init({
  provider: DEVELOPER_PLATFORM_PROVIDER_URL,
  apiKey: DASHBOARD_API_KEY,
});

/**
 * AIAgentService class handles Chain AI operations.
 * This service processes user queries, interprets them using LLM providers,
 * and executes blockchain-related functions based on the interpretation.
 *
 * @class AIAgentService
 */
export class AIAgentService {
  private options: Options;
  private llmService: LLMService;

  /**
   * Creates an instance of AIAgentService.
   *
   * @param {Options} options - Configuration options including chain details and LLM provider settings
   * @throws {Error} When required LLM provider configuration is missing
   */
  constructor(options: Options) {
    this.options = options;
    this.llmService = this.initializeLLMService(options.llmProvider || LLMProvider.OpenAI);
  }

  /**
   * Interprets a user's query using the configured LLM service.
   *
   * @param {string} query - The user's natural language query
   * @param {QueryContext[]} context - Previous conversation context
   * @returns {Promise<AIMessageResponse>} The LLM's interpretation of the query
   */
  public async interpretUserQuery(query: string, context: QueryContext[]): Promise<AIMessageResponse> {
    return this.llmService.interpretUserQuery(query, context);
  }

  /**
   * Processes the AI's interpretation of the query and executes relevant blockchain functions.
   *
   * @param {AIMessageResponse} interpretation - The AI's interpretation of the user's query
   * @param {string} query - The original user query
   * @param {QueryContext[]} context - The conversation context
   * @returns {Promise<{functionResponses: FunctionCallResponse[], finalResponse: string}>}
   */
  public async processInterpretation(
    interpretation: AIMessageResponse,
    query: string,
    context: QueryContext[]
  ): Promise<{ functionResponses: FunctionCallResponse[]; finalResponse: string }> {
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
    }

    const finalResponse = await this.generateFinalResponse(query, functionResponses, context);
    return { functionResponses, finalResponse };
  }

  /**
   * Updates the conversation context with new query and response.
   * Maintains a rolling window of the last 10 context entries.
   *
   * @param {QueryContext[]} context - Current conversation context
   * @param {string} query - User's query to add to context
   * @param {string} response - AI's response to add to context
   * @returns {QueryContext[]} Updated context array
   */
  public updateContext(context: QueryContext[], query: string, response: string): QueryContext[] {
    context.push({ role: Role.User, content: query });
    context.push({ role: Role.Assistant, content: response });
    if (context.length > 10) context.shift();
    return context;
  }

  /**
   * Initializes the appropriate LLM service based on the provider configuration.
   *
   * @private
   * @param {LLMProvider} provider - The LLM provider to initialize
   * @returns {LLMService} Initialized LLM service
   * @throws {Error} When provider configuration is missing or provider is unsupported
   */
  private initializeLLMService(provider: LLMProvider): LLMService {
    switch (provider) {
      case LLMProvider.DeepSeek:
        if (!this.options.deepSeek) {
          throw new Error('DeepSeek configuration is required when using DeepSeek provider');
        }
        return new DeepSeekService(this.options.deepSeek);
      case LLMProvider.OpenAI:
        if (!this.options.openAI) {
          throw new Error('OpenAI configuration is required when using OpenAI provider');
        }
        return new OpenAIService(this.options.openAI);
      case LLMProvider.Gemini:
        if (!this.options.gemini) {
          throw new Error('Gemini configuration is required when using Gemini provider');
        }
        return new GeminiService(this.options.gemini);
      case LLMProvider.VertexAI:
        if (!this.options.vertexAI) {
          throw new Error('Vertex AI configuration is required when using Vertex AI provider');
        }
        return new VertexAIService(this.options.vertexAI);
      case LLMProvider.Mistral:
        if (!this.options.mistral) {
          throw new Error('Mistral configuration is required when using Mistral provider');
        }
        return new MistralService(this.options.mistral);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  /**
   * Executes a blockchain function with the provided arguments.
   *
   * @private
   * @param {BlockchainFunction} functionName - The blockchain function to execute
   * @param {FunctionArgs} functionArgs - Arguments for the function
   * @returns {Promise<FunctionCallResponse>} Result of the function execution
   */
  private async executeFunction(
    functionName: BlockchainFunction,
    functionArgs: FunctionArgs
  ): Promise<FunctionCallResponse> {
    try {
      validateFunctionArgs(functionArgs);

      switch (functionName) {
        case BlockchainFunction.GetBalance:
          return await Wallet.balance(functionArgs.address);
        case BlockchainFunction.GetLatestBlock:
          return await Block.getBlockByTag('latest');
        case BlockchainFunction.GetTransactionsByAddress:
          return await Transaction.getTransactionsByAddress(
            functionArgs.address,
            functionArgs.session,
            functionArgs.limit
          );
        case BlockchainFunction.GetContractABI:
          return await Contract.getContractABI(functionArgs.address, EXPLORER_API_KEY);
        case BlockchainFunction.GetTransactionByHash:
          return await Transaction.getTransactionByHash(functionArgs.txHash);
        case BlockchainFunction.GetBlockByTag:
          return await Block.getBlockByTag(functionArgs.blockTag);
        case BlockchainFunction.GetTransactionStatus:
          return await Transaction.getTransactionStatus(functionArgs.txHash);
        case BlockchainFunction.CreateWallet:
          return Wallet.create();
        case BlockchainFunction.TransferToken:
          return await Token.transfer({
            to: functionArgs.to,
            amount: functionArgs.amount,
            contractAddress: functionArgs.contractAddress,
          });
        /**
        @EXPERIMENTAL This example is for demonstration purposes only. 
        USE AT YOUR OWN RISK and DO NOT use it in a production environment. 
        DO NOT send any mainnet tokens to the accounts involved, as this may result in the loss of funds. 
        We are not responsible for any loss of digital assets.
        It is risky and unsafe to have private key in cleartext in the machine.

        To use this feature, 
        - replace the case below with the the values above for BlockchainFunction.TransferToken
        - uncomment line 54, 46, and 27
        - add relevant env
        - sample query: "transfer 1 native token to 0x1cA1304F2cA3e5A1e45fD2b64EcD83EB58a420Ab",

        case BlockchainFunction.TransferToken:
          return await this.tokenService.transfer(
            functionArgs.to,
            functionArgs.amount.toString(),
            functionArgs.contractAddress
          );
        */

        case BlockchainFunction.WrapToken:
          return await Token.wrap({
            amount: functionArgs.amount,
          });
        case BlockchainFunction.SwapToken:
          return await Token.swap({
            fromContractAddress: functionArgs.fromContractAddress,
            toContractAddress: functionArgs.toContractAddress,
            amount: functionArgs.amount,
          });
        case BlockchainFunction.GetCurrentTime: {
          const now = new Date();
          return {
            status: Status.Success,
            data: {
              localTime: now.toLocaleString(),
              utcTime: now.toUTCString(),
            },
          };
        }
        case BlockchainFunction.GetErc20Balance:
          return await Token.getERC20TokenBalance(functionArgs.address, functionArgs.contractAddress);
        default:
          return {
            status: Status.Failed,
            data: {
              message: `Received unknown function: ${functionName}`,
            },
          };
      }
    } catch (error: unknown) {
      if (error instanceof BaseError) {
        return {
          status: Status.Failed,
          data: {
            message: `Error during execution: ${error.message}`,
          },
        };
      }
      logger.error('Unknown error during execution: ', error);
      return {
        status: Status.Failed,
        data: {
          message: error instanceof Error ? error.message : 'Unknown error during execution',
        },
      };
    }
  }

  /**
   * Generates a final response using the LLM service based on the query and function responses.
   *
   * @private
   * @param {string} query - Original user query
   * @param {FunctionCallResponse[]} functionResponses - Results from executed functions
   * @param {QueryContext[]} context - Conversation context
   * @returns {Promise<string>} Generated final response
   */
  private async generateFinalResponse(
    query: string,
    functionResponses: FunctionCallResponse[],
    context: QueryContext[]
  ): Promise<string> {
    return this.llmService.generateFinalResponse(query, functionResponses, context);
  }
}
