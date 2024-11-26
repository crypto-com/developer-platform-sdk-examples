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
      name: BlockchainFunction.GetPrivateKey,
      description: 'Get private key',
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
];

// Step 1
// Function create a wallet.
// sample: query: Generate Wallet.
// agent returns address. Please authorize this returned address to perform an action on user address. return the user address back

// Step 2
// do a copy trade on this address -- do make me rich
//
