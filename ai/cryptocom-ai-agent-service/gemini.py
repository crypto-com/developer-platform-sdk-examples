import os
import requests
import json

# Configure the API key
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("Please set GOOGLE_API_KEY environment variable")

BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
MODEL = "gemini-1.5-pro"


def calculate_fibonacci(n: int):
    """Calculate the nth Fibonacci number
    Args:
        n: A positive integer representing the position in the Fibonacci sequence
    Returns:
        The nth Fibonacci number or an error message
    """
    try:
        n = int(float(n))

        if n <= 0:
            return "Please provide a positive number"
        elif n == 1 or n == 2:
            return 1

        a, b = 1, 1
        for _ in range(3, n + 1):
            a, b = b, a + b
        return b
    except (ValueError, TypeError):
        return "Please provide a valid number"


# Define the function declaration for the API
TOOLS = {
    "function_declarations": [
        {
            "name": "calculate_fibonacci",
            "description": "Calculate the nth Fibonacci number",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "n": {
                        "type": "NUMBER",
                        "description": "A positive integer representing the position in the Fibonacci sequence",
                    }
                },
                "required": ["n"],
            },
        }
    ]
}


def send_followup_query(query, history):
    """Send a follow-up query without function calling capability"""
    url = f"{BASE_URL}/{MODEL}:generateContent?key={api_key}"

    payload = {
        "contents": history + [{"role": "user", "parts": [{"text": query}]}],
        "generationConfig": {
            "temperature": 0.7,
            "topK": 1,
            "topP": 1,
        },
    }

    response = requests.post(url, json=payload)
    if not response.ok:
        raise Exception(f"API request failed: {response.text}")

    return response.json()["candidates"][0]["content"]


def send_with_custom_history(query, history=None):
    """Send a query with optional custom history"""
    if history is None:
        history = []

    url = f"{BASE_URL}/{MODEL}:generateContent?key={api_key}"

    # First call includes tools/function definitions
    payload = {
        "contents": history + [{"role": "user", "parts": [{"text": query}]}],
        "tools": TOOLS,
        "generationConfig": {
            "temperature": 0.7,
            "topK": 1,
            "topP": 1,
        },
    }

    response = requests.post(url, json=payload)

    if not response.ok:
        raise Exception(f"API request failed: {response.text}")

    data = response.json()
    print("-" * 50)
    print(data)
    print("-" * 50)

    # Handle potential function calls
    content = data["candidates"][0]["content"]
    if "parts" in content and content["parts"][0].get("functionCall"):
        function_call = content["parts"][0]["functionCall"]
        result = calculate_fibonacci(function_call["args"]["n"])

        # Add both the function call and response to history
        updated_history = history + [
            # Add the original function call
            content,
            # Add the function response
            {
                "role": "function",
                "parts": [
                    {
                        "functionResponse": {
                            "name": function_call["name"],
                            "response": {"result": str(result)},
                        }
                    }
                ],
            },
        ]

        # Make another API call without tools/functions
        return send_followup_query(query, updated_history)

    return content


# Example usage
print("Chat with Gemini AI (type 'quit' to exit)")
print("-" * 50)

# Keep track of conversation manually
conversation_history = []

while True:
    user_input = input("\nYou: ").strip()

    if user_input.lower() in ["quit", "exit", "bye"]:
        print("\nGoodbye!")
        break

    # Print current context for debugging
    print("\nDebug - Sending request with history:")
    print(json.dumps(conversation_history, indent=2))
    print("Current query:", user_input)
    print("-" * 50)

    try:
        # Send request with current history
        response = send_with_custom_history(user_input, conversation_history)

        # Update history with the new exchange
        conversation_history.append({"role": "user", "parts": [{"text": user_input}]})
        conversation_history.append(response)

        # Print response
        print("\nAI:", response["parts"][0]["text"])
    except Exception as e:
        print(f"An error occurred: {e}")
