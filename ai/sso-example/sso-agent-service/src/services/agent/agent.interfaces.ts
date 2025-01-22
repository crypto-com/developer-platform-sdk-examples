export interface OpenAIOptions {
  apiKey: string;
  model?: string;
}

export interface ExplorerKeys {
  apiKey: string;
}

export interface Options {
  openAI: OpenAIOptions;
  chainId: number;
  context: QueryContext[];
}

export interface Tool<T> {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: T;
  };
}

export enum Role {
  User = 'user',
  Assistant = 'assistant',
  System = 'system',
}

export interface FunctionArgs {
  from: string;
}

export interface QueryContext {
  role: Role;
  content: string;
}

export interface AIMessageResponse {
  content: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  function: {
    name: Function;
    arguments: string;
  };
}

export enum Function {
  FunctionNotFound = 'functionNotFound',
  AccountRequest = 'generateAndAuthorizeWallet',
  InitCopyTrade = 'initiateCopyTrading',
}

export interface FunctionResponse<T> {
  status: Status;
  data?: T;
}

export enum Status {
  Success = 'Success',
  Failed = 'Failed',
  NoFunctionCalled = 'NoFunctionCalled',
}

export interface FunctionCallResponse {
  status: Status;
  data: object;
}
