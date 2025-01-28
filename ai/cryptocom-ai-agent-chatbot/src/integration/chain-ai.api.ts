import axios, { AxiosInstance } from 'axios';
import { LLMConfig, LLMProvider } from '../components/Chatbot';
import { ChainAiApiResponse } from './chain-ai.interface';

const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_API_URL,
});

const getProviderApiKey = (provider: string): string | undefined => {
  switch (provider) {
    case LLMProvider.OpenAI:
      return import.meta.env.VITE_OPEN_AI_KEY;
    case LLMProvider.DeepSeek:
      return import.meta.env.VITE_DEEP_SEEK_KEY;
    case LLMProvider.Gemini:
      return import.meta.env.VITE_GEMINI_KEY;
    default:
      return undefined;
  }
};

const optionsBuilder = (llmConfig: LLMConfig): any => {
  switch (llmConfig.llmProvider) {
    case LLMProvider.OpenAI:
      return {
        openAI: {
          apiKey: getProviderApiKey(llmConfig.llmProvider),
          model: llmConfig.model,
        },
      };
    case LLMProvider.DeepSeek:
      return {
        deepSeek: {
          apiKey: getProviderApiKey(llmConfig.llmProvider),
          model: llmConfig.model,
        },
      };
    case LLMProvider.Gemini:
      return {
        gemini: {
          apiKey: getProviderApiKey(llmConfig.llmProvider),
          model: llmConfig.model,
        },
      };
    default:
      return {
        openAI: {
          apiKey: getProviderApiKey(llmConfig.llmProvider),
          model: llmConfig.model,
        },
      };
  }
};

/**
 * chainAiInstance integration for managing Chain AI service API requests.
 *
 * @fileoverview This file provides helper functions for Chain AI service API interactions.
 * @namespace chainAiInstance
 */
export const chainAiInstance = {
  /**
   * Sends a query to the Chain AI API and fetches the AI-generated response.
   *
   * @param {string} query - The query string to be sent to the Chain AI service.
   * @param {AxiosInstance} instance - The Axios instance configured for the Chain AI service API.
   *
   * @example
   * const response = await chainAiInstance.sendQuery('Send 1USDC to ADDRESS', axiosInstance);
   * console.log('Chain AI Response:', response);
   */
  sendQuery: async (
    query: string,
    context: Array<{ role: string; content: string }>,
    llmConfig: LLMConfig
  ): Promise<ChainAiApiResponse> => {
    const url = `/api/v1/cdc-ai-agent-service/query`;

    try {
      const response = await instance.post<ChainAiApiResponse>(url, {
        query,
        options: {
          ...optionsBuilder(llmConfig),
          context,
          llmProvider: llmConfig.llmProvider,
        },
      });
      const aiResponse = response.data;
      return aiResponse;
    } catch (e) {
      console.error('[chainAiInstance/sendQuery] error:', e);
      throw e;
    }
  },
};
