import { TOKEN_SYMBOLS_ADDRESSES } from './constants/token.constants.js';

export const sendTransactionParameters = {
  type: 'object',
  properties: {
    to: { type: 'string', description: "Recipient's Ethereum address" },
    amount: { type: 'number', description: 'Amount to be send' },
    contractAddress: {
      type: 'string',
      description: `Contract address of the token to send. Symbol to token mapping: ${JSON.stringify(TOKEN_SYMBOLS_ADDRESSES)}`,
    },
  },
  required: ['to', 'amount'],
};

export const getBalanceParameters = {
  type: 'object',
  properties: {
    address: {
      type: 'string',
      description: 'Wallet address to get balance for',
    },
  },
  required: ['address'],
};

export const getLatestBlockParameters = {
  type: 'object',
  properties: {},
};

export const getTransactionsByAddressParameters = {
  type: 'object',
  properties: {
    address: {
      type: 'string',
      description: 'Cronos address to get transactions for',
    },
    session: {
      type: 'string',
      description: 'Previous page session. Leave empty for first page',
    },
    limit: {
      type: 'number',
      description: 'Page size (max 100)',
      minimum: 1,
      maximum: 100,
      default: 20,
    },
  },
  required: ['address'],
};

export const getContractAbiParameters = {
  type: 'object',
  properties: {
    address: {
      type: 'string',
      description: 'Contract address to get ABI for',
    },
  },
  required: ['address'],
};

export const getTransactionByHash = {
  type: 'object',
  properties: {
    txHash: {
      type: 'string',
      description: 'Transaction hash to get details for',
    },
  },
  required: ['txHash'],
};

export const getBlockByTagParameters = {
  type: 'object',
  properties: {
    blockTag: {
      type: 'string',
      description: 'Block number in integer, or "earliest", "latest", or "pending"',
    },
    txDetail: {
      type: 'boolean',
      description: 'If true, returns full transaction objects; if false, only transaction hashes',
      default: false,
    },
  },
  required: ['blockTag'],
};

export const getTransactionStatusParameters = {
  type: 'object',
  properties: {
    txHash: {
      type: 'string',
      description: 'Transaction hash to get status for',
    },
  },
  required: ['txHash'],
};

export const createWalletParameters = {
  type: 'object',
  properties: {},
};

export const wrapTokenParameters = {
  type: 'object',
  properties: {
    amount: {
      type: 'number',
      description: 'Amount of native token to be wrapped',
    },
  },
  required: ['amount'],
};

export const SwapTokenParameters = {
  type: 'object',
  properties: {
    amount: {
      type: 'number',
      description: 'Amount of token to be swapped',
    },
    fromContractAddress: {
      type: 'string',
      description: `Contract address of the token to be swapped from. Symbol to token mapping: ${JSON.stringify(TOKEN_SYMBOLS_ADDRESSES)}`,
    },
    toContractAddress: {
      type: 'string',
      description: `Contract address of the token to be swapped to. Symbol to token mapping: ${JSON.stringify(TOKEN_SYMBOLS_ADDRESSES)}`,
    },
  },
  required: ['amount', 'fromContractAddress', 'toContractAddress'],
};

export const getCurrentTimeParameters = {
  type: 'object',
  properties: {},
};

export const getErc20BalanceParameters = {
  type: 'object',
  properties: {
    address: {
      type: 'string',
      description: 'The wallet address to check balance for',
    },
    contractAddress: {
      type: 'string',
      description: `The ERC20 token contract address or token symbol. Symbol to token mapping: ${JSON.stringify(TOKEN_SYMBOLS_ADDRESSES)}`,
    },
  },
  required: ['address', 'contractAddress'],
};
