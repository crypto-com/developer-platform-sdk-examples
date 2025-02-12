import { FunctionCallResponse, Options, QueryContext } from '../agent/agent.interfaces.js';
import { AIAgentService } from '../agent/agent.service.js';

/**
 * QueryService class handles query operations.
 *
 * @class QueryService
 */
export class QueryService {
  private AIAgentService: AIAgentService;

  /**
   * Creates an instance of the QueryService.
   * This service is responsible for generating and processing queries using the AIAgentService.
   *
   * @param {Options} options - The options object used to configure the AIAgentService.
   */
  constructor(options: Options) {
    this.AIAgentService = new AIAgentService(options);
  }

  /**
   * Interpret a given query, process it and return the array of function responses.
   *
   * @async
   * @param {string} query - The input query string to be processed.
   * @param {QueryContext[]} [context=[]] - The context array to be used in the query interpretation.
   * @returns {Promise<{
   *   functionResponses: BlockchainFunctionResponse<BlockchainFunctionType>[];
   *   context: QueryContext[];
   *   finalResponse: string;
   * }>} - A promise that resolves to an object containing both function responses and context.
   * @memberof QueryService
   */
  public async generateResponse(
    query: string,
    context: QueryContext[] = []
  ): Promise<{
    functionResponses: FunctionCallResponse[];
    context: QueryContext[];
    finalResponse: string;
  }> {
    const interpretation = await this.AIAgentService.interpretUserQuery(query, context);
    const { functionResponses, finalResponse } = await this.AIAgentService.processInterpretation(
      interpretation,
      query,
      context
    );

    // Update context with both the query and the final AI response
    const updatedContext = this.AIAgentService.updateContext(context, query, finalResponse);

    return { functionResponses, context: updatedContext, finalResponse };
  }
}
