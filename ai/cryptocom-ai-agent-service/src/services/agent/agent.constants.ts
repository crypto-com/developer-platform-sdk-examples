import OpenAI from 'openai';
import {
  SwapTokenParameters,
  createWalletParameters,
  getBalanceParameters,
  getBlockByTagParameters,
  getContractAbiParameters,
  getLatestBlockParameters,
  getTransactionByHash,
  getTransactionStatusParameters,
  getTransactionsByAddressParameters,
  sendTransactionParameters,
  wrapTokenParameters,
  getCurrentTimeParameters,
  getErc20BalanceParameters,
  resolveCronosIdParameters,
  reverseResolveCronosIdParameters,
} from '../../helpers/chain-ai.helpers.js';
import { BlockchainFunction } from './agent.interfaces.js';

export const CONTENT: string =
  "You are an AI assistant that helps users interact with Ethereum and Cronos blockchains. You can use multiple functions if needed to fulfill the user's request.";

export const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: BlockchainFunction.TransferToken,
      description: 'Transfer native token or a token (specified by its contract address) to a recipient address',
      parameters: sendTransactionParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: BlockchainFunction.GetBalance,
      description: 'Get the current balance of specified  wallet addresses',
      parameters: getBalanceParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: BlockchainFunction.GetLatestBlock,
      description: 'Get the latest block height from the Cronos blockchain',
      parameters: getLatestBlockParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: BlockchainFunction.GetTransactionsByAddress,
      description: 'Get the list of transactions for a specified Cronos address',
      parameters: getTransactionsByAddressParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: BlockchainFunction.GetContractABI,
      description: 'Get the ABI of a verified smart contract',
      parameters: getContractAbiParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: BlockchainFunction.GetTransactionByHash,
      description: 'Get the details of a transaction by its hash',
      parameters: getTransactionByHash,
    },
  },
  {
    type: 'function',
    function: {
      name: BlockchainFunction.GetBlockByTag,
      description: 'Get information about block by its number or tag (e.g. "latest", "earliest", "pending")',
      parameters: getBlockByTagParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: BlockchainFunction.GetTransactionStatus,
      description: 'Get the status of a transaction by its hash',
      parameters: getTransactionStatusParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: BlockchainFunction.CreateWallet,
      description: 'Create a new random wallet',
      parameters: createWalletParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: BlockchainFunction.WrapToken,
      description: 'Wrap a token',
      parameters: wrapTokenParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: BlockchainFunction.SwapToken,
      description: 'Swap a token from `fromContractAddress` to `toContractAddress`',
      parameters: SwapTokenParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: BlockchainFunction.GetCurrentTime,
      description: 'Get the current local and UTC time',
      parameters: getCurrentTimeParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: BlockchainFunction.GetErc20Balance,
      description: 'Get the balance of an ERC20 token for a specific wallet address',
      parameters: getErc20BalanceParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: BlockchainFunction.ResolveCronosId,
      description: 'Resolve a CronosId (.cro) to its corresponding wallet address',
      parameters: resolveCronosIdParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: BlockchainFunction.ReverseResolveCronosId,
      description: 'Resolve a wallet address to its corresponding CronosId (.cro)',
      parameters: reverseResolveCronosIdParameters,
    },
  },
];

export const GEMINI_TOOLS = {
  function_declarations: [
    {
      name: BlockchainFunction.GetLatestBlock,
      description: "Get information about block by its number or tag (e.g. 'latest', 'earliest', 'pending')",
      parameters: {
        type: 'OBJECT',
        properties: {
          tag: {
            type: 'STRING',
            description: 'The tag or number of the block',
          },
        },
        required: ['tag'],
      },
    },
    {
      name: BlockchainFunction.GetTransactionStatus,
      description: 'Get the status of a transaction by its hash',
      parameters: {
        type: 'OBJECT',
        properties: {
          hash: {
            type: 'STRING',
            description: 'The hash of the transaction',
          },
        },
        required: ['hash'],
      },
    },
    {
      name: BlockchainFunction.CreateWallet,
      description: 'Create a new random wallet',
    },
    {
      name: BlockchainFunction.WrapToken,
      description: 'Wrap a token',
      parameters: {
        type: 'OBJECT',
        properties: {
          token: {
            type: 'STRING',
            description: 'The token to be wrapped',
          },
        },
        required: ['token'],
      },
    },
    {
      name: BlockchainFunction.SwapToken,
      description: 'Swap a token from `fromContractAddress` to `toContractAddress`',
      parameters: {
        type: 'OBJECT',
        properties: {
          fromContractAddress: {
            type: 'STRING',
            description: 'The contract address of the token to be swapped from',
          },
          toContractAddress: {
            type: 'STRING',
            description: 'The contract address of the token to be swapped to',
          },
        },
        required: ['fromContractAddress', 'toContractAddress'],
      },
    },
    {
      name: BlockchainFunction.GetCurrentTime,
      description: 'Get the current local and UTC time',
    },
    {
      name: BlockchainFunction.TransferToken,
      description: 'Transfer native token or a token (specified by its contract address) to a recipient address',
      parameters: {
        type: 'OBJECT',
        properties: {
          recipientAddress: {
            type: 'STRING',
            description: 'The recipient address',
          },
          amount: {
            type: 'STRING',
            description: 'The amount to transfer',
          },
          contractAddress: {
            type: 'STRING',
            description: 'The contract address of the token (optional for native token)',
          },
        },
        required: ['recipientAddress', 'amount'],
      },
    },
    {
      name: BlockchainFunction.GetBalance,
      description: 'Get the current balance of specified wallet address',
      parameters: {
        type: 'OBJECT',
        properties: {
          address: {
            type: 'STRING',
            description: 'Wallet address to get balance for',
          },
        },
        required: ['address'],
      },
    },
    {
      name: BlockchainFunction.GetTransactionsByAddress,
      description: 'Get the list of transactions for a specified Cronos address',
      parameters: {
        type: 'OBJECT',
        properties: {
          address: {
            type: 'STRING',
            description: 'The address to get transactions for',
          },
        },
        required: ['address'],
      },
    },
    {
      name: BlockchainFunction.GetContractABI,
      description: 'Get the ABI of a verified smart contract',
      parameters: {
        type: 'OBJECT',
        properties: {
          contractAddress: {
            type: 'STRING',
            description: 'The contract address',
          },
        },
        required: ['contractAddress'],
      },
    },
    {
      name: BlockchainFunction.GetTransactionByHash,
      description: 'Get the details of a transaction by its hash',
      parameters: {
        type: 'OBJECT',
        properties: {
          hash: {
            type: 'STRING',
            description: 'The hash of the transaction',
          },
        },
        required: ['hash'],
      },
    },
    {
      name: BlockchainFunction.GetBlockByTag,
      description: 'Get information about block by its number or tag (e.g. "latest", "earliest", "pending")',
      parameters: {
        type: 'OBJECT',
        properties: {
          tag: {
            type: 'STRING',
            description: 'The tag or number of the block',
          },
        },
        required: ['tag'],
      },
    },
    {
      name: BlockchainFunction.GetErc20Balance,
      description: 'Get the balance of an ERC20 token for a specific wallet address',
      parameters: {
        type: 'OBJECT',
        properties: {
          address: {
            type: 'STRING',
            description: 'The wallet address to check balance for',
          },
          contractAddress: {
            type: 'STRING',
            description: 'The ERC20 token contract address',
          },
        },
        required: ['address', 'contractAddress'],
      },
    },
    {
      name: BlockchainFunction.ResolveCronosId,
      description: 'Resolve a CronosId (.cro) to its corresponding wallet address',
      parameters: {
        type: 'OBJECT',
        properties: {
          cronosId: {
            type: 'STRING',
            description: 'The CronosId to resolve (must end with .cro)',
          },
        },
        required: ['cronosId'],
      },
    },
    {
      name: BlockchainFunction.ReverseResolveCronosId,
      description: 'Resolve a wallet address to its corresponding CronosId (.cro)',
      parameters: {
        type: 'OBJECT',
        properties: {
          address: {
            type: 'STRING',
            description: 'The wallet address to resolve',
          },
        },
        required: ['address'],
      },
    },
  ],
};
