****# Telegram Chatbot for Cronos zkEVM

A Telegram bot that interacts with Cronos zkEVM network using the crypto_com_agent_client library, allowing users to query blockchain information and perform transactions.

## Prerequisites

### Environment Variables Setup
1. Set your Telegram Bot token:
   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   ```

2. Choose and set your LLM provider API key:
   - For OpenAI:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     ```
   - For Grok3:
     ```
     GROK_API_KEY=your_grok_api_key_here
     ```

3. Set your blockchain configuration (optional):
   ```
   EXPLORER_API_KEY=your_explorer_api_key_here
   PRIVATE_KEY=your_private_key_here
   ```

### MetaMask Setup
1. Install MetaMask browser extension
2. Add Cronos zkEVM Testnet to MetaMask with these details:
   ```
   Network Name: Cronos zkEVM Sepolia Testnet
   New RPC URL: https://testnet.zkevm.cronos.org/
   Chain ID: 240
   Currency Symbol: zkTCRO
   Block Explorer URL: https://explorer.zkevm.cronos.org/testnet/
   ```

## Installation and Setup

### 1. Create Environment File
Create a `.env` file in the project root with your environment variables:
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here  # OR
GROK_API_KEY=your_grok_api_key_here      # Choose one
EXPLORER_API_KEY=your_explorer_api_key_here
PRIVATE_KEY=your_private_key_here
```

### 2. Set Up Python Environment
1. Create a Python virtual environment:
   ```
   conda create -n telegram-bot python=3.12
   conda activate telegram-bot
   ```
   
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

### 3. Start the Bot
1. Run the bot:
   ```
   python bot.py
   ```

2. Choose your LLM provider when prompted:
   - Option 1: OpenAI (gpt-4o-mini)
   - Option 2: Grok3

The bot will initialize and start listening for Telegram messages.

## Bot Commands
- `/start` - Initialize the bot
- Natural language queries are supported for blockchain operations

## Example Prompts
The bot understands natural language commands such as:
- `get latest block` - Retrieve the latest block information
- `send 0.1 to 0x...receiver_address` - Send 0.1 ZKTCRO to the specified receiver address
- `send 1.0 ERC20 tokens to 0x...receiver_address using contract 0x...erc20contractaddress` - Send ERC20 tokens
- `get crypto price BTC` - Get current Bitcoin price (example custom tool)

## Architecture
The bot works by:
1. Using the crypto_com_agent_client library for core functionality
2. Supporting multiple LLM providers (OpenAI or Grok3)
3. Using SQLite for persistent storage (`telegram_agent_state.db`)
4. Processing natural language queries through the selected LLM
5. Executing blockchain operations via integrated tools
6. Returning responses directly through Telegram

## Features
- **Multi-LLM Support**: Choose between OpenAI and Grok3 providers
- **Persistent Storage**: SQLite database for maintaining conversation state
- **Custom Tools**: Extensible with custom functions (example: crypto price lookup)
- **Blockchain Integration**: Direct integration with Cronos zkEVM network
- **Natural Language Processing**: Understands conversational queries

## Error Handling
- The bot will validate environment variables on startup
- Missing API keys will be reported with helpful setup instructions
- Transaction errors will be reported with appropriate error messages
- Invalid commands will receive helpful error responses

## Getting a Telegram Bot Token
To create a Telegram bot:
1. Message @BotFather on Telegram
2. Use `/newbot` command to create a new bot
3. Follow the prompts to set up your bot
4. Copy the provided token to your `.env` file
