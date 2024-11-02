import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def send_query(query: str) -> dict:
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
            "openAI": {
                "apiKey": os.getenv("OPENAI_API_KEY")
            }
        }
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
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
    print("-" * 50)
    
    while True:
        # Get user input
        user_input = input("\nYou: ").strip()
        
        # Check for quit command
        if user_input.lower() == 'quit':
            print("\nGoodbye!")
            break
            
        # Skip empty input
        if not user_input:
            continue
            
        # Send query to AI Agent Service
        response = send_query(user_input)
        
        # Handle response
        if response:
            if response.get("hasErrors"):
                print("\nAI Agent: Sorry, there was an error processing your request.")
            else:
                # Print each result from the AI agent
                for result in response.get("results", []):
                    print(f"\nAI Agent: {result.get('status', 'No status')}")
                    if "data" in result:
                        print("\nData:")
                        print(json.dumps(result["data"], indent=2))
        else:
            print("\nAI Agent: Sorry, I couldn't connect to the service.")

if __name__ == "__main__":
    main()