#!/usr/bin/env python3
"""
Telegram Bot Example

This example demonstrates how to use the existing Telegram bot functionality
with the crypto_com_agent_client library. The bot will:

1. Load the TELEGRAM_BOT_TOKEN from .env file
2. Ask user to choose LLM provider (OpenAI or Grok)
3. Initialize the agent with selected provider and Telegram plugin
4. Start the Telegram bot to handle user messages

Prerequisites:
1. Create a .env file with TELEGRAM_BOT_TOKEN
2. Set up your Telegram bot via @BotFather
3. Install dependencies: python-telegram-bot is already in pyproject.toml
4. Set DASHBOARD_API_KEY in .env for blockchain operations
5. For OpenAI: Set OPENAI_API_KEY in .env
6. For Grok: Set GROK_API_KEY in .env

Environment Variables:
- TELEGRAM_BOT_TOKEN: Required - Your Telegram bot token
- DASHBOARD_API_KEY: Required - Your unified API key for blockchain operations
- OPENAI_API_KEY: Required for OpenAI provider
- GROK_API_KEY: Required for Grok provider  
- DEBUG_LOGGING: Optional - Set to "true" to enable debug logging (default: false)

Usage:
    python bot.py
    
    # To enable debug logging:
    DEBUG_LOGGING=true python bot.py
"""

import os
from datetime import datetime
import pytz
from typing import Annotated
from langgraph.prebuilt import InjectedState
from langchain_core.tools import tool
from crypto_com_agent_client import Agent, tool, SQLitePlugin
from crypto_com_agent_client.lib.enums.provider_enum import Provider
from crypto_com_agent_client.lib.enums.workflow_enum import Workflow
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Custom storage for persistence (optional)
custom_storage = SQLitePlugin(db_path="telegram_agent_state.db")

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
        f"🕒 Current time:\n\n"
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


def get_llm_choice():
    """
    Ask user to choose which LLM provider to use.

    Returns:
        str: 'openai' or 'grok'
    """
    print("\nChoose your LLM provider:")
    print("1. OpenAI (gpt-4o-mini)")
    print("2. Grok")

    while True:
        choice = input("\nEnter your choice (1 for OpenAI, 2 for Grok): ").strip()

        if choice == "1":
            return "openai"
        elif choice == "2":
            return "grok"
        else:
            print("Invalid choice. Please enter 1 or 2.")


def get_llm_config(provider_choice):
    """
    Get LLM configuration based on user choice.

    Args:
        provider_choice (str): 'openai' or 'grok'

    Returns:
        dict: LLM configuration
    """
    # Allow users to enable debug logging via environment variable (default: False)
    debug_logging = os.getenv("DEBUG_LOGGING", "false").lower() in ("true", "1", "yes")
    if debug_logging:
        print("Debug logging is enabled")

    if provider_choice == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("Error: OPENAI_API_KEY not found in .env file")
            print("Please add OPENAI_API_KEY=your_api_key_here to your .env file")
            return None

        return {
            "provider": "OpenAI",
            "model": "gpt-4o-mini",
            "provider-api-key": api_key,
            "debug-logging": debug_logging,
        }

    elif provider_choice == "grok":
        api_key = os.getenv("GROK_API_KEY")
        if not api_key:
            print("Error: GROK_API_KEY not found in .env file")
            print("Please add GROK_API_KEY=your_api_key_here to your .env file")
            return None

        return {
            "provider": Provider.Grok,
            "model": "grok-4-0709",
            "provider-api-key": api_key,
            "debug-logging": debug_logging,  # Enable debug logging to see the issue
        }


def main():
    """
    Main function to initialize and start the Telegram bot.
    """
    global current_llm_config

    # Check if TELEGRAM_BOT_TOKEN is set
    telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not telegram_token:
        print("Error: TELEGRAM_BOT_TOKEN not found in .env file")
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

    print(f"\nInitializing Telegram Agent with {provider_choice.upper()}...")

    # Create a sanitized version for debug logging (mask the API key)
    if llm_config.get("debug-logging", False):
        debug_config = llm_config.copy()
        if "provider-api-key" in debug_config:
            api_key = debug_config["provider-api-key"]
            debug_config["provider-api-key"] = (
                f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else "***"
            )

        print(f"[DEBUG] LLM Config: {debug_config}")
        provider = llm_config.get("provider")
        provider_str = provider.value if hasattr(provider, "value") else str(provider)
        print(f"[DEBUG] Provider value: {provider_str} (type: {type(provider)})")

    # Initialize the agent with selected configuration
    agent = Agent.init(
        llm_config=llm_config,
        blockchain_config={
            "api-key": os.getenv("DASHBOARD_API_KEY"),
            "private-key": os.getenv("PRIVATE_KEY"),
            "timeout": 60,
        },
        plugins={
            "personality": {
                "tone": "friendly",
                "language": "English",
                "verbosity": "medium",
            },
            "instructions": (
                "You are a helpful Crypto.com AI assistant. "
                "You can help users with cryptocurrency information, "
                "blockchain queries, and general crypto-related questions. "
                "Be friendly and informative in your responses. "
                "IMPORTANT: When users ask about your current configuration, model, "
                "or provider, always use the available tools to get real-time information "
                "rather than relying on your training data."
            ),
            "tools": [get_time, get_current_llm_model],
            "storage": custom_storage,
            "telegram": {"bot_token": telegram_token},
        },
    )

    print("Agent initialized successfully!")
    print(f"Using {provider_choice.upper()} provider")
    print(f"Bot Token: ***...")
    print("Starting Telegram bot...")
    print("Your bot is now ready to receive messages!")
    print("Press Ctrl+C to stop the bot")

    try:
        # Start the Telegram bot
        agent.start_telegram()
    except KeyboardInterrupt:
        print("\nBot stopped by user")
    except Exception as e:
        print(f"Error running bot: {e}")


if __name__ == "__main__":
    main()
