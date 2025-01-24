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

export interface TransferArgs {
  from?: string;
  to: string;
  amount: string;
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
  CreateSSOWallet = 'createSSOWallet',
  CreateSSOSession = 'createSSOSession',
  TransferFunds = 'transferFunds'
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

export interface SSOWalletArgs {
  passKeyId?: string;
}

export interface SSOSessionArgs {
  expiry: string;
  feeLimit: string;
  transfers?: {
    to: string;
    valueLimit: string;
  }[];
}

export interface TransferArgs {
  to: string;
  amount: string;
  token?: string;
}
