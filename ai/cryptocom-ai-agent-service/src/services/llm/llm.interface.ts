import { AIMessageResponse, QueryContext, FunctionCallResponse } from '../agent/agent.interfaces.js';

export interface LLMConfig {
  apiKey?: string;
  model?: string;
  projectId?: string;
  location?: string;
}

export interface LLMService {
  generateResponse(context: QueryContext[]): Promise<AIMessageResponse>;
  interpretUserQuery(query: string, context: QueryContext[]): Promise<AIMessageResponse>;
  generateFinalResponse(
    query: string,
    functionResponses: FunctionCallResponse[],
    context: QueryContext[]
  ): Promise<string>;
}
