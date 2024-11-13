export interface ClientConfig {
  openAI: {
    apiKey: string;
  };
}

export interface ChainAiApiResponse {
  status: string;
  hasErrors: boolean;
  finalResponse?: string;
  results: Array<{
    status?: string;
    data: object;
  }>;
  context: Array<{
    role: string;
    content: string;
  }>;
}

export interface ChainAiApiResponseError {
  response: {
    data: {
      error: string;
    };
  };
}
