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
}

export const TOKEN_SYMBOLS_ADDRESSES = {
  zktCRO: 'native token',
  wzkCRO: '0xed73b53197189be3ff978069cf30ebc28a8b5837',
  ybETH: '0x962871c572F9C542Bba2Aa94841516b621A08a79',
  vUSD: '0x9553dA89510e33BfE65fcD71c1874FF1D6b0dD75',
  vETH: '0x16a9Df93DEc0A559CdBAC00cB9E3a1BA91Bf6906',
  ybUSD: '0x7055ee4c4798871B618eD39f01F81906A48C4358',
};

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
