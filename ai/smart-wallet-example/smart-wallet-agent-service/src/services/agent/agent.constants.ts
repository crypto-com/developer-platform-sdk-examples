import OpenAI from 'openai';
import { Function } from './agent.interfaces.js';

export const CONTENT: string = `
  You are an AI assistant that interacts with Ethereum and Cronos blockchains. 
  Your role is to interpret user queries, map them to predefined functions, and execute them.
  Always pick the most relevant function based on the user's intent, regardless of wording.
  Available functions include:

  - 'generateAndAuthorizeWallet': Request the user's account address for transaction authorization.
  - 'initiateCopyTrading': Start copy trading using the user's account.

  Be flexible in mapping user language to these functions.
`;

export const MAX_CONTEXT_LENGTH: number = 10;

export const REQUIRED_ARGS: Record<Function, string[]> = {
  [Function.FunctionNotFound]: [],
  [Function.AccountRequest]: [],
  [Function.InitCopyTrade]: ['from'],
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
];
