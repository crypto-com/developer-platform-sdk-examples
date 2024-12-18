import os
import requests
import json
import webbrowser
import readline
from dotenv import load_dotenv

load_dotenv()

# Check API keys after load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
google_api_key = os.getenv("GOOGLE_API_KEY")
google_project_id = os.getenv("GOOGLE_PROJECT_ID")

if not api_key:
    print("Error: OPENAI_API_KEY not found in environment variables.")
    print("Please make sure you have set the OPENAI_API_KEY in your .env file.")
    exit(1)
else:
    print("✓ OPENAI_API_KEY has been imported successfully")

if not google_api_key:
    print("Error: GOOGLE_API_KEY not found in environment variables.")
    print("Please make sure you have set the GOOGLE_API_KEY in your .env file.")
    exit(1)
else:
    print("✓ GOOGLE_API_KEY has been imported successfully")

if not google_project_id:
    print("Error: GOOGLE_PROJECT_ID not found in environment variables.")
    print("Please make sure you have set the GOOGLE_PROJECT_ID in your .env file.")
    exit(1)
else:
    print("✓ GOOGLE_PROJECT_ID has been imported successfully")

print()  # Add blank line after checks


def send_query(query: str, context: list = None, provider: str = "gemini") -> dict:
    """
    Send a query to the AI Agent Service and return the response.

    Args:
        query (str): The natural language query to send
        context (list, optional): Context for the conversation
        provider (str, optional): LLM provider to use (provider_choice)

    Returns:
        dict: The JSON response from the service
    """
    url = "http://localhost:8000/api/v1/cdc-ai-agent-service/query"

    # Configure provider options
    provider_options = {}
    if provider == "openai":
        provider_options["openAI"] = {"apiKey": os.getenv("OPENAI_API_KEY")}
    elif provider == "vertexai":
        provider_options["vertexAI"] = {
            "projectId": os.getenv("GOOGLE_PROJECT_ID"),
            "location": "us-central1",
            "model": "gemini-2.0-flash-exp",
        }
    else:  # gemini
        provider_options["gemini"] = {"apiKey": os.getenv("GOOGLE_API_KEY")}

    payload = {
        "query": query,
        "options": {
            **provider_options,
            "llmProvider": provider,
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

    # Ask for provider choice at startup - this will be fixed for the session
    while True:
        provider = (
            input("Choose your AI provider (openai/gemini/vertexai): ").strip().lower()
        )
        if provider in ["openai", "gemini", "vertexai"]:
            break
        print("Invalid choice. Please enter 'openai', 'gemini', or 'vertexai'")

    print("\nType 'quit' to exit")
    print("Use up/down arrow keys to navigate command history")
    print(f"Using: {provider}")
    print("-" * 50)

    # Configure readline to use in-memory history
    readline.set_history_length(1000)

    context = []

    while True:
        try:
            user_input = input(f"\nYou: ").strip()

            if user_input.lower() == "quit":
                print("\nGoodbye!")
                break

            if not user_input:
                continue

            # Send query with fixed provider
            response = send_query(user_input, context, provider)

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

            else:
                print("\nAI Agent: Sorry, I couldn't connect to the service.")

        except KeyboardInterrupt:
            print("\nGoodbye!")
            break


if __name__ == "__main__":
    main()
