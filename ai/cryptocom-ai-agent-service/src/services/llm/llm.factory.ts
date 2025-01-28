import { LLMProvider, Options } from '../agent/agent.interfaces.js';
import { DeepSeekService } from './deepseek.service.js';
import { GeminiService } from './gemini.service.js';
import { LLMService } from './llm.interface.js';
import { OpenAIService } from './openai.service.js';
import { VertexAIService } from './vertexai.service.js';

export function createLLMService(options: Options): LLMService {
  switch (options.llmProvider) {
    case LLMProvider.DeepSeek:
      if (!options.deepSeek?.apiKey) {
        throw new Error('DeepSeek API key is required');
      }
      return new DeepSeekService({
        apiKey: options.deepSeek.apiKey,
        model: options.deepSeek.model,
      });

    case LLMProvider.OpenAI:
      if (!options.openAI?.apiKey) {
        throw new Error('OpenAI API key is required');
      }
      return new OpenAIService({
        apiKey: options.openAI.apiKey,
        model: options.openAI.model,
      });

    case LLMProvider.Gemini:
      if (!options.gemini?.apiKey) {
        throw new Error('Gemini API key is required');
      }
      return new GeminiService({
        apiKey: options.gemini.apiKey,
        model: options.gemini.model,
      });

    case LLMProvider.VertexAI:
      if (!options.vertexAI?.projectId) {
        throw new Error('Vertex AI project ID is required');
      }
      return new VertexAIService({
        projectId: options.vertexAI.projectId,
        location: options.vertexAI.location,
        model: options.vertexAI.model,
      });

    default:
      throw new Error(`Unsupported LLM provider: ${options.llmProvider}`);
  }
}
