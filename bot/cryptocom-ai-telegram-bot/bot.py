#!/usr/bin/env python3
"""
Telegram Bot Example

This example demonstrates how to use the Telegram bot functionality
with the crypto_com_agent_client library. The bot will:

1. Load the TELEGRAM_BOT_TOKEN from .env file
2. Ask user to choose LLM provider (OpenAI or Grok3)
3. Initialize the agent with selected provider and Telegram plugin
4. Start the Telegram bot to handle user messages

Prerequisites:
1. Create a .env file with required environment variables:
   - TELEGRAM_BOT_TOKEN (required): Your Telegram bot token from @BotFather
   - OPENAI_API_KEY or GROK_API_KEY (required): Choose one LLM provider
   - DASHBOARD_API_KEY (optional): Crypto.com Developer Platform API key
   - PRIVATE_KEY (optional): Wallet private key for transactions
2. Set up your Telegram bot via @BotFather
3. Install dependencies: pip install -r requirements.txt

Usage:
    python bot.py
"""

import os
from datetime import datetime
from typing import Annotated

import pytz
from crypto_com_agent_client import Agent, SQLitePlugin, tool
from crypto_com_agent_client.lib.enums.provider_enum import Provider
from crypto_com_agent_plugin_telegram import TelegramPlugin
from dotenv import load_dotenv
from langgraph.prebuilt import InjectedState

from cronos_tx_analyzer import CronosTransactionAnalyzer

# Load environment variables from .env file
load_dotenv()

# Custom storage for persistence (optional)
custom_storage = SQLitePlugin(db_path="telegram_agent_state.db")

# Initialize the Cronos transaction analyzer with dashboard API key
# This will automatically determine the correct chain and RPC endpoint
tx_analyzer = CronosTransactionAnalyzer(
    dashboard_api_key=os.getenv("DASHBOARD_API_KEY")
)

# Global variable to store current LLM configuration
current_llm_config = {}


# Example custom tool that the bot can use
@tool
def get_time() -> str:
    """
    Get the current local and UTC time.

    Returns:
        str: Current time information in both UTC and local timezone
    """
    # Get current time in UTC
    utc_time = datetime.now(pytz.UTC)

    # Get local time
    local_time = datetime.now()

    message = (
        f"Current time:\n\n"
        f"UTC: {utc_time.strftime('%Y-%m-%d %H:%M:%S %Z')}\n"
        f"Local: {local_time.strftime('%Y-%m-%d %H:%M:%S')}"
    )

    return message


@tool
def get_current_llm_model(state: Annotated[dict, InjectedState]) -> str:
    """
    Get information about the current LLM model and provider being used right now.

    Use this tool when users ask about:
    - Which model we are using
    - What model is currently active
    - Current LLM provider
    - What AI model this is
    - Which language model is running
    - What provider is being used
    - Current model information
    - AI model details

    Returns:
        str: Information about the current LLM provider and model
    """
    global current_llm_config

    provider = current_llm_config.get("provider", "Unknown")
    model = current_llm_config.get("model", "Unknown")

    # Handle Provider enum case
    if hasattr(provider, "value"):
        provider_name = provider.value
    else:
        provider_name = str(provider)

    message = (
        f"Current LLM Model Information:\n\n"
        f"Provider: {provider_name}\n"
        f"Model: {model}\n"
        f"Configuration: Active and ready"
    )

    return message


@tool
def get_transaction_info(tx_hash: str) -> str:
    """
    Get detailed information about a Cronos EVM transaction.

    Args:
        tx_hash: The transaction hash (0x followed by 64 hex characters)

    Returns:
        A detailed description of the transaction including type, participants, amounts, and status.
    """
    try:
        print(f"[get_transaction_info] Retrieving transaction info for: {tx_hash}")
        # Validate transaction hash format
        if not tx_hash.startswith("0x") or len(tx_hash) != 66:
            return f"Invalid transaction hash format. Expected 0x followed by 64 hex characters, got: {tx_hash}"

        # Check connection
        if not tx_analyzer.is_connected():
            return (
                "Unable to connect to Cronos EVM RPC. Please check network connection."
            )

        # Get transaction data
        tx_data = tx_analyzer.get_transaction(tx_hash)
        if not tx_data:
            return f"Transaction not found: {tx_hash}. Please verify the hash is correct and on Cronos mainnet."

        # Analyze the transaction
        analysis = tx_analyzer.analyze_transaction_flow(tx_data)

        # Build response in formatted display style
        result = []

        result.append(f"Analyzing: {tx_hash}")
        result.append("------------------------------------------------------------")

        # DESCRIPTION
        result.append("Description:")
        description = tx_analyzer.generate_transaction_description(tx_hash)
        result.append(description)

        # TECHNICAL DETAILS
        result.append("\nTechnical Details:")
        result.append(f"Type: {analysis['type']}")
        result.append(f"From: {analysis['from']}")
        result.append(f"To: {analysis['to']}")
        result.append(f"Status: {analysis['status']}")
        result.append(f"Gas Used: {analysis['gas_used']:,}")
        if analysis["value_cro"] > 0:
            result.append(f"CRO Value: {analysis['value_cro']}")

        # SWAP DETAILS (if applicable)
        if analysis["type"] == "token_swap":
            from_token = analysis.get("from_token") or analysis.get("input_token")
            to_token = analysis.get("to_token") or analysis.get("output_token")
            from_amount = analysis.get("from_amount") or analysis.get("input_amount")
            to_amount = analysis.get("to_amount") or analysis.get("output_amount")

            if from_token and to_token and from_amount and to_amount:
                result.append("Swap Details:")
                result.append(f"   {from_amount} {from_token} → {to_amount} {to_token}")

        return "\n".join(result)

    except Exception as e:
        return f"Error analyzing transaction: {str(e)}"


def get_llm_choice():
    """
    Ask user to choose which LLM provider to use.

    Returns:
        str: 'openai' or 'grok3'
    """
    print("\n🤖 Choose your LLM provider:")
    print("1. OpenAI (gpt-4o-mini)")
    print("2. Grok4")

    while True:
        choice = input("\nEnter your choice (1 for OpenAI, 2 for Grok4): ").strip()

        if choice == "1":
            return "openai"
        elif choice == "2":
            return "grok3"
        else:
            print("❌ Invalid choice. Please enter 1 or 2.")


def get_llm_config(provider_choice):
    """
    Get LLM configuration based on user choice.

    Args:
        provider_choice (str): 'openai' or 'grok3'

    Returns:
        dict: LLM configuration
    """
    if provider_choice == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("❌ Error: OPENAI_API_KEY not found in .env file")
            print("Please add OPENAI_API_KEY=your_api_key_here to your .env file")
            return None

        return {
            "provider": "OpenAI",
            "model": "gpt-4o-mini",
            "provider-api-key": api_key,
            "debug-logging": True,
        }

    elif provider_choice == "grok3":
        api_key = os.getenv("GROK_API_KEY")
        if not api_key:
            print("❌ Error: GROK_API_KEY not found in .env file")
            print("Please add GROK_API_KEY=your_api_key_here to your .env file")
            return None

        return {
            "provider": Provider.Grok,
            "model": "grok-4",
            "provider-api-key": api_key,
        }


def main():
    """
    Main function to initialize and start the Telegram bot.
    """
    global current_llm_config

    # Check if TELEGRAM_BOT_TOKEN is set
    telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not telegram_token:
        print("❌ Error: TELEGRAM_BOT_TOKEN not found in .env file")
        print("Please create a .env file with:")
        print("TELEGRAM_BOT_TOKEN=your_bot_token_here")
        print("\nTo get a bot token:")
        print("1. Message @BotFather on Telegram")
        print("2. Create a new bot with /newbot")
        print("3. Copy the token to your .env file")
        return

    # Get user's LLM provider choice
    provider_choice = get_llm_choice()

    # Get LLM configuration
    llm_config = get_llm_config(provider_choice)
    if not llm_config:
        return

    # Store the LLM configuration globally so the tool can access it
    current_llm_config = llm_config

    print(f"\n🚀 Initializing Telegram Agent with {provider_choice.upper()}...")

    # Initialize the agent with selected configuration
    agent = Agent.init(
        llm_config=llm_config,
        blockchain_config={
            "api-key": os.getenv("DASHBOARD_API_KEY"),
            "private-key": os.getenv("PRIVATE_KEY"),
        },
        plugins={
            "personality": {
                "tone": "friendly",
                "language": "English",
                "verbosity": "medium",
            },
            "instructions": (
                "You are a blockchain transaction analyst and Crypto.com AI assistant. "
                "When asked about a transaction, use the get_transaction_info tool to retrieve detailed information. "
                "The tool returns pre-formatted responses with '**Summary:**' and '**Description:**' sections. "
                "Present the tool's response EXACTLY as returned, without reformatting or summarizing. "
                "Do not modify, truncate, or rephrase the formatted response from get_transaction_info. "
                "You can also help users with cryptocurrency information, blockchain queries, and general crypto-related questions. "
                "Be friendly and informative in your responses. "
                "IMPORTANT: When users ask about your current configuration, model, "
                "or provider, always use the available tools to get real-time information "
                "rather than relying on your training data."
            ),
            "tools": [get_time, get_current_llm_model, get_transaction_info],
            "storage": custom_storage,
            "telegram": TelegramPlugin(bot_token=telegram_token),
        },
    )

    print("✅ Agent initialized successfully!")
    print(f"🤖 Using {provider_choice.upper()} provider")
    print(f"🔑 Bot Token: {telegram_token[:10]}...")
    print("📱 Starting Telegram bot...")
    print("💬 Your bot is now ready to receive messages!")
    print("🛑 Press Ctrl+C to stop the bot")

    try:
        # Start the Telegram bot
        agent.start()
    except KeyboardInterrupt:
        print("\n🛑 Bot stopped by user")
    except Exception as e:
        print(f"❌ Error running bot: {e}")


if __name__ == "__main__":
    main()
