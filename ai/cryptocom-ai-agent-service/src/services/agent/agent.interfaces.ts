export enum LLMProvider {
  OpenAI = 'openai',
  Gemini = 'gemini',
}

export interface OpenAIOptions {
  apiKey: string;
  model?: string;
}

export interface ExplorerKeys {
  apiKey: string;
}

export interface Options {
  openAI?: OpenAIOptions;
  gemini?: GeminiOptions;
  llmProvider?: LLMProvider;
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
  Tool = 'tool',
}

export interface FunctionArgs {
  contractAddress: string;
  address: string;
  session: string;
  limit: string;
  txHash: string;
  blockTag: string;
  txDetail: boolean;
  to: string;
  amount: number;
  symbol: Symbol;
  fromContractAddress: string;
  toContractAddress: string;
  name: string;
  cronosId: string;
}

export enum Symbol {
  TCRO = 'TCRO',
  ETH = 'ETH',
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
  id: string;
  type: 'function';
  function: {
    name: BlockchainFunction;
    arguments: string;
  };
}

export enum BlockchainFunction {
  TransferToken = 'transfertoken',
  GetBalance = 'getBalance',
  GetLatestBlock = 'getLatestBlock',
  GetTransactionsByAddress = 'getTransactionsByAddress',
  GetContractABI = 'getContractABI',
  GetTransactionByHash = 'getTransactionByHash',
  GetBlockByTag = 'getBlockByTag',
  GetTransactionStatus = 'getTransactionStatus',
  CreateWallet = 'createWallet',
  WrapToken = 'wrapToken',
  SwapToken = 'swapToken',
  GetCurrentTime = 'getCurrentTime',
  FunctionNotFound = 'functionNotFound',
  GetErc20Balance = 'getErc20Balance',
  ResolveCronosId = 'resolveCronosId',
  ReverseResolveCronosId = 'reverseResolveCronosId',
}

export interface BlockchainFunctionResponse<T> {
  status: Status;
  data?: T;
}

export enum Status {
  Success = 'Success',
  Failed = 'Failed',
}

export interface Block {
  size: string;
  parentHash: string;
  logsBloom: string;
  difficulty: string;
  transactions: string[];
  hash: string;
  l1BatchNumber: number;
  mixHash: string;
  gasLimit: string;
  l1BatchTimestamp: number;
  totalDifficulty: string;
  uncles: string[];
  sha3Uncles: string;
  miner: string;
  transactionsRoot: string;
  gasUsed: string;
  extraData: string;
  timestamp: string;
  sealFields: string[];
  nonce: string;
  stateRoot: string;
  receiptsRoot: string;
  number: string;
  baseFeePerGas: string;
}

export interface MagicLinkData {
  magicLink: string;
}

export interface GetBalanceData {
  balances: Balance[];
}

export interface GetLatestBlockData {
  blockHeight: number;
  timestamp: string;
}

export interface GetContractAbiData {
  abi: string | null;
}

export interface GetTransactionsByAddressData {
  transactions: Transaction[];
  pagination?: Pagination;
}

export interface Pagination {
  totalRecord: number;
  totalPage: number;
  currentPage: number;
  limit: number;
  session: string;
}

export interface CreateWalletData {
  address: string;
  privateKey: string;
  mnemonic: string;
}

export interface GetBlockByTag {
  block: Block;
}

export enum BlockTagString {
  Latest = 'latest',
  Earliest = 'earliest',
}

export interface GetTransactionByHashData {
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  nonce: number;
  transactionIndex: number;
  gas: number;
}
export interface GetTransactionStatusData {
  status: number | string;
  isError: number | boolean;
  errDescription: string;
}

interface Balance {
  address: string;
  balanceWei?: string;
  balanceEth?: string;
  error?: string;
}

export enum Unit {
  Ether = 'ether',
  Gwei = 'gwei',
}

export interface Transaction {
  blockNumber: number;
  transactionHash: string;
  status: number;
  error: string;
  from: {
    address: string;
    isContract: boolean;
  };
  to: {
    address: string;
    isContract: boolean;
  };
  gas: string;
  gasPrice: string;
  gasLimit: string;
  timestamp: number;
  methodId: string;
  methodName: string;
  index: number;
  value: string;
  type: string;
  nonce: number;
  input: string;
  contractAddress: string;
  confirmations: number;
  transactionIndex: string;
}

export interface FunctionCallResponse {
  status: Status;
  data: object;
}

export interface TimeData {
  localTime: string;
  utcTime: string;
}

export interface GeminiOptions {
  apiKey: string;
  model?: string;
}
