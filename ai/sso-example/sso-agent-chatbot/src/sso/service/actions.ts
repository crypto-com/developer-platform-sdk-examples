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
    BlockchainFunction,
  } from './parameters';

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
  ];