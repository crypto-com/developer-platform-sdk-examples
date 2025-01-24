import axios, { AxiosInstance } from "axios";
import { ChainAiApiResponse } from "./chain-ai.interface";

const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_API_URL,
});

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
    context: Array<{ role: string; content: string }> = []
  ): Promise<ChainAiApiResponse> => {
    const url = `/api/v1/cdc-ai-agent-service/query`;

    try {
      const response = await instance.post<ChainAiApiResponse>(url, {
        query,
        options: {
          openAI: {
            apiKey: import.meta.env.VITE_OPEN_AI_KEY,
          },
          context,
        },
      });
      const aiResponse = response.data;
      return aiResponse;
    } catch (e) {
      console.error("[chainAiInstance/sendQuery] error:", e);
      throw e;
    }
  },
};
