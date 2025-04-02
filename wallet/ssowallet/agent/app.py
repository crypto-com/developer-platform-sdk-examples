import os
import datetime
import time
import threading
import asyncio

# Now import and check the path
import agent_main

from crypto_com_agent_client import Agent, tool, SQLitePlugin
from dotenv import load_dotenv

load_dotenv()

# Global variables to store thread state
agent_thread = None
stop_thread = False


def run_agent_loop():
    """
    Function to run agent_main in a loop with specified interval
    """
    global stop_thread
    interval = int(os.getenv("SEND_INTERVAL_SECONDS", 30))

    while not stop_thread:
        try:
            asyncio.run(agent_main.main())
            time.sleep(interval)
        except Exception as e:
            print(f"Error in agent loop: {e}")
            time.sleep(interval)


@tool
def run_ssowallet() -> str:
    """
    Start the agent_main loop in a thread.
    Returns a status message.
    """
    global agent_thread, stop_thread

    local_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    utc_time = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d %H:%M:%S")

    # Check if thread is already running
    if agent_thread is not None and agent_thread.is_alive():
        return f"Agent thread is already running.\nLocal time: {local_time}\nUTC time: {utc_time}"

    try:
        # Start the agent main loop in a separate thread
        stop_thread = False
        agent_thread = threading.Thread(target=run_agent_loop, daemon=True)
        agent_thread.start()

        return f"Transaction agent thread started.\nLocal time: {local_time}\nUTC time: {utc_time}"

    except Exception as e:
        return f"Error starting transaction agent: {e}\nLocal time: {local_time}\nUTC time: {utc_time}"


@tool
def stop_ssowallet() -> str:
    """
    Stop the agent_main thread.
    Returns a status message.
    """
    global agent_thread, stop_thread

    local_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    utc_time = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d %H:%M:%S")

    if agent_thread is None or not agent_thread.is_alive():
        return f"No transaction agent is running.\nLocal time: {local_time}\nUTC time: {utc_time}"

    try:
        # Stop the agent thread
        stop_thread = True
        agent_thread.join(timeout=5)
        agent_thread = None
        return f"Transaction agent thread stopped.\nLocal time: {local_time}\nUTC time: {utc_time}"

    except Exception as e:
        return f"Error stopping transaction agent: {e}\nLocal time: {local_time}\nUTC time: {utc_time}"


# Initialize the agent with LLM and blockchain configurations
agent = Agent.init(
    llm_config={
        "provider": "OpenAI",
        "model": "gpt-4o-mini",
        "provider-api-key": os.getenv("OPENAI_API_KEY"),
    },
    blockchain_config={
        "chainId": "240",
        "explorer-api-key": os.getenv("EXPLORER_API_KEY"),
        "private-key": os.getenv("PRIVATE_KEY"),
        "sso-wallet-url": "your-sso-wallet-url",
    },
    plugins={
        "tools": [run_ssowallet, stop_ssowallet],
    },
)


def main():
    print("Welcome to the Agent Chat Interface!")
    print("Type 'exit' or 'quit' to end the conversation.")
    print("-" * 50)

    while True:
        # Get user input
        user_input = input("\nYou: ").strip()

        # Check for exit command
        if user_input.lower() in ["exit", "quit"]:
            print("\nGoodbye!")
            break

        # Get response from agent
        try:
            response = agent.interact(user_input)
            print("\nAgent:", response)
        except Exception as e:
            print("\nError:", str(e))
            print("Please try again.")


if __name__ == "__main__":
    main()
