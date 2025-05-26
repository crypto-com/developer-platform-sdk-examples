import os
import datetime

from crypto_com_agent_client import Agent, tool
from crypto_com_agent_client.lib.enums.provider_enum import Provider
from dotenv import load_dotenv

load_dotenv()


@tool
def helloworld() -> str:
    """
    Returns current local and UTC time.
    """
    local_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    utc_time = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d %H:%M:%S")

    return f"Hello World!\nLocal time: {local_time}\nUTC time: {utc_time}"


# Initialize the agent with Grok-3 and blockchain configurations
agent = Agent.init(
    llm_config={
        "provider": Provider.Grok,
        "model": "grok-3",
        "provider-api-key": os.getenv("GROK_API_KEY"),
    },
    blockchain_config={
        "chainId": "240",
        "explorer-api-key": os.getenv("EXPLORER_API_KEY"),
    },
    plugins={
        "tools": [helloworld],
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
