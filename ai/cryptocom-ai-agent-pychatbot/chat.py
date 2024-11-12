import os
import requests
import json
import webbrowser
import readline
from dotenv import load_dotenv

load_dotenv()

# Add this check after load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("Error: OPENAI_API_KEY not found in environment variables.")
    print("Please make sure you have set the OPENAI_API_KEY in your .env file.")
    exit(1)
else:
    print("✓ OPENAI_API_KEY is successfully ready")
    print()


def send_query(query: str, context: list = None) -> dict:
    """
    Send a query to the AI Agent Service and return the response.

    Args:
        query (str): The natural language query to send

    Returns:
        dict: The JSON response from the service
    """
    url = "http://localhost:8000/api/v1/cdc-ai-agent-service/query"

    payload = {
        "query": query,
        "options": {
            "openAI": {"apiKey": os.getenv("OPENAI_API_KEY")},
            "context": context,
        },
    }

    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error making request: {e}")
        return None


def main():
    print("Welcome to the Crypto.com AI Agent Chat!")
    print("Type 'quit' to exit")
    print("Use up/down arrow keys to navigate command history")
    print("-" * 50)

    # Set up command history
    histfile = os.path.join(os.path.expanduser("~"), ".ai_chat_history")
    try:
        readline.read_history_file(histfile)
        readline.set_history_length(1000)  # Limit history to 1000 entries
    except FileNotFoundError:
        pass

    context = []
    while True:
        try:
            # Get user input (readline will handle arrow key history automatically)
            user_input = input("\nYou: ").strip()

            # Save command to history file
            readline.write_history_file(histfile)

            # Check for quit command
            if user_input.lower() == "quit":
                print("\nGoodbye!")
                break

            # Skip empty input
            if not user_input:
                continue

            # Send query to AI Agent Service
            response = send_query(user_input, context)

            # print pretty json
            # print(json.dumps(response, indent=2))

            # Update context if response has context
            if "context" in response:
                context.extend(response["context"])
                # Keep only the latest 10 context entries if over 10
                if len(context) > 10:
                    context = context[-10:]

            # Handle response
            if response:
                if response.get("hasErrors"):
                    print(
                        "\nAI Agent: Sorry, there was an error processing your request."
                    )
                else:
                    # Check for finalResponse first
                    if "finalResponse" in response:
                        print(f"\nAI Agent: {response['finalResponse']}")

                    # Print each result from the AI agent
                    for result in response.get("results", []):
                        print(f"\nAI Agent: {result.get('status', 'No status')}")
                        if "data" in result:
                            data = result["data"]
                            # Check if the response contains a magic link
                            if isinstance(data, dict) and "magicLink" in data:
                                magic_link = data["magicLink"]
                                print("\nTransaction Ready!")
                                print(
                                    "Opening signature page in your default browser..."
                                )
                                webbrowser.open(magic_link)
                            # else:
                            #    print("\nData:")
                            #    print(json.dumps(data, indent=2))
            else:
                print("\nAI Agent: Sorry, I couldn't connect to the service.")

        except KeyboardInterrupt:
            print("\nGoodbye!")
            break


if __name__ == "__main__":
    main()
