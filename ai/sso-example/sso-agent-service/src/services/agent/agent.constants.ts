import OpenAI from 'openai';
import { Function } from './agent.interfaces.js';

export const CONTENT: string = `
  You are an AI assistant that interacts with Ethereum and Cronos blockchains. 
  Your role is to interpret user queries, map them to predefined functions, and execute them.
  Always pick the most relevant function based on the user's intent, regardless of wording.
  Available functions include:

  - 'createSSOWallet': Create a new SSO wallet using passkeys.
  - 'createSSOSession': Create a new session for the SSO wallet with specified limits.
  - 'transferFunds': Transfer funds using the SSO wallet session.

  Be flexible in mapping user language to these functions.
`;

export const MAX_CONTEXT_LENGTH: number = 10;

export const REQUIRED_ARGS: Record<Function, string[]> = {
  [Function.FunctionNotFound]: [],
  [Function.AccountRequest]: [],
  [Function.InitCopyTrade]: ['from'],
  [Function.CreateSSOWallet]: [],
  [Function.CreateSSOSession]: ['expiry', 'feeLimit'],
  [Function.TransferFunds]: ['to', 'amount'],
};

export const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: Function.AccountRequest,
      description: 'Asks for account address',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: Function.InitCopyTrade,
      description:
        'This function is called after a user provides his ethereum wallet address starting with 0x. After approving and providing an account, will initiate the copy trading',
      parameters: {
        type: 'object',
        properties: {
          from: {
            type: 'string',
            description: `Copy the transaction from a top wallet address and execute it with the 'from' wallet`,
          },
        },
        required: ['from'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: Function.CreateSSOWallet,
      description: 'Creates a new ZKSync SSO wallet using passkeys',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function', 
    function: {
      name: Function.CreateSSOSession,
      description: 'Creates a new session for the SSO wallet with specified limits',
      parameters: {
        type: 'object',
        properties: {
          expiry: {
            type: 'string',
            description: 'Session expiry duration e.g. "1 day"'
          },
          feeLimit: {
            type: 'string',
            description: 'Maximum fee limit in ETH'
          },
          transfers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                to: { type: 'string' },
                valueLimit: { type: 'string' }
              }
            }
          }
        },
        required: ['expiry', 'feeLimit']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: Function.TransferFunds,
      description: 'Transfer funds using the SSO wallet session',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Recipient address'
          },
          amount: {
            type: 'string',
            description: 'Amount to transfer'
          },
          token: {
            type: 'string',
            description: 'Token address (optional, ETH if omitted)'
          }
        },
        required: ['to', 'amount']
      }
    }
  }
];
