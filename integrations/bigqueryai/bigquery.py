"""
BigQuery Integration Example for Crypto.com Agent Client

This example demonstrates how to use BigQuery integration with the agent client
to query blockchain data using natural language. The code has been refactored
into a modular structure for better maintainability.

Requirements:
- Set PROJECT_ID environment variable for your Google Cloud project
- Set OPENAI_API_KEY (or other LLM provider API key)
- Set DASHBOARD_API_KEY for blockchain operations
- Google Cloud credentials configured for BigQuery access

Usage:
    python bigquery.py

Example queries:
- "How many transactions were there in the last 24 hours?"
- "What are the top 10 addresses by transaction count?"
- "Show me the latest blocks"
- "What's the average gas price for recent transactions?"
"""

import os
import logging
from dotenv import load_dotenv

# Import the base agent functionality
from crypto_com_agent_client import Agent
from crypto_com_agent_client.lib.enums.provider_enum import Provider

# Import our modular components
import config
import tools

# Set up logging
logging.basicConfig(
    level=logging.DEBUG if config.is_debug_mode() else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

load_dotenv()


def main():
    print("[WELCOME] Welcome to the Enhanced BigQuery-Enabled Agent!")
    print("This agent can answer questions about blockchain data using BigQuery.")
    print("=" * 70)

    # Check debug mode
    if config.is_debug_mode():
        print(
            "[DEBUG] DEBUG LOGGING: Enabled (set DEBUG_LOGGING=false to hide verbose logs)"
        )
    else:
        print("[INFO] Enable detailed logging with: export DEBUG_LOGGING=true")
    print("=" * 70)

    # Check environment variables
    if not config.get_project_id():
        print("[ERROR] PROJECT_ID environment variable is required")
        return

    if not config.get_api_key():
        print("[ERROR] OPENAI_API_KEY environment variable is required")
        return

    # Select dataset
    try:
        selected_dataset = config.select_dataset()
        print(f"\n[SELECTION] Final dataset selection: {selected_dataset}")

        # Verify the dataset mapping
        if selected_dataset == "cronos_zkevm_mainnet":
            print("[MODE] Mode: Cronos zkEVM mainnet analytics")
        elif selected_dataset == "public_preview___blockchain_analytics_cronos_mainnet":
            print("[MODE] Mode: Cronos EVM mainnet analytics")
        else:
            print("[WARNING] Warning: Unknown dataset selected")

    except KeyboardInterrupt:
        print("\n[GOODBYE] Goodbye!")
        return

    # Initialize agent
    try:
        agent = Agent.init(
            llm_config={
                "provider": Provider.OpenAI,
                "model": "gpt-4o",
                "provider-api-key": config.get_api_key(),
                "debug-logging": True,
            },
            blockchain_config={
                "api-key": os.getenv("DASHBOARD_API_KEY"),
                "private-key": os.getenv("PRIVATE_KEY"),
                "timeout": 120,
            },
            plugins={
                "tools": tools.get_all_tools(),
            },
        )

        # Initialize BigQuery client
        from crypto_com_agent_client.core.model import Model

        llm_model = Model(
            api_key=config.get_api_key(),
            provider=Provider.OpenAI,
            model="gpt-4o-mini",
        )

        if not tools.initialize_bigquery_client(
            llm_model.model_instance, selected_dataset
        ):
            print("[ERROR] Failed to initialize BigQuery client")
            return

        print("\n[SUCCESS] BigQuery client initialized successfully!")
        print(f"[PROJECT] Project: {config.get_project_id()}")
        print(f"[DATASET] Dataset: {selected_dataset}")

        print("\n[EXAMPLES] Example BigQuery questions:")
        print("• How many transactions were there in the last 24 hours?")
        print("• What are the top 10 addresses by transaction count?")
        print("• Show me the latest 5 blocks from database")
        print("• Get recent transactions using BigQuery")
        print("• Get cost information")
        print("• Get schema information")
        print("• Get dataset information")
        print(
            "\nType 'help' for more examples, 'limits' for cost info, 'dataset' for dataset info, 'exit' to quit."
        )
        print("=" * 70)

        while True:
            user_input = input("\n[USER] You: ").strip()

            if user_input.lower() in ["exit", "quit"]:
                print("\n[GOODBYE] Goodbye!")
                break

            if user_input.lower() == "help":
                print(tools.explain_bigquery_usage())
                continue

            if user_input.lower() in ["limits", "cost", "info"]:
                print(tools.get_bigquery_cost_info())
                continue

            if user_input.lower() in ["dataset", "data", "tables"]:
                print(tools.get_bigquery_dataset_info())
                continue

            if not user_input:
                continue

            try:
                print("\n[PROCESSING] Processing your request...")
                response = agent.interact(user_input)
                print(f"\n[AGENT] Agent: {response}")
            except Exception as e:
                print(f"\n[ERROR] Error: {e}")

    except Exception as e:
        print(f"[ERROR] Failed to initialize agent: {e}")


if __name__ == "__main__":
    main()
