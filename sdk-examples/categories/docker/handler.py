#!/usr/bin/env python3
"""
AWS Lambda handler with OpenAI agent using cryptocom-agent-client.

This example demonstrates:
- Setting up an AI agent with custom tools
- Blockchain integration via Dashboard API
- Secure runtime API key handling
"""

import json
from datetime import datetime, timezone

from crypto_com_agent_client import Agent, tool
from crypto_com_agent_client.lib.enums.provider_enum import Provider

# =============================================================================
# Custom Tools
# =============================================================================
# Add your own tools here using the @tool decorator.
# The agent can invoke these tools based on user requests.


@tool
def get_current_time() -> str:
    """
    Returns current local and UTC time.
    """
    local_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    utc_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    return f"Local time: {local_time}\nUTC time: {utc_time}"


@tool
def fibonacci(n: int) -> int:
    """
    Calculate the nth Fibonacci number.

    Args:
        n: The position in Fibonacci sequence (non-negative integer)

    Returns:
        The nth Fibonacci number
    """
    if n < 0:
        raise ValueError("n must be non-negative")
    if n <= 1:
        return n

    a, b = 0, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b


# =============================================================================
# Agent Configuration
# =============================================================================

# Cache agent instances for Lambda warm invocations
agent_cache = {}


def get_agent(openai_api_key: str, dashboard_api_key: str):
    """
    Get or initialize the agent with OpenAI and blockchain configuration.

    Uses caching to reuse agent across warm Lambda invocations.
    """
    cache_key = f"{openai_api_key[:10]}:{dashboard_api_key[:10]}"

    if cache_key not in agent_cache:
        print("[INIT] Initializing agent...")

        agent = Agent.init(
            # LLM Configuration
            # Change model or provider here as needed
            llm_config={
                "provider": Provider.OpenAI,
                "model": "gpt-4o-mini",  # Options: gpt-4o, gpt-3.5-turbo, etc.
                "provider-api-key": openai_api_key,
                "debug-logging": False,
                "timeout": 60,
            },
            # Blockchain Configuration (Crypto.com Developer Platform)
            blockchain_config={
                "api-key": dashboard_api_key,
            },
            # Custom Tools
            # Add your tools to this list
            plugins={
                "tools": [get_current_time, fibonacci],
            },
        )

        agent_cache[cache_key] = agent
        print("[INIT] Agent initialized successfully")
    else:
        print("[INIT] Using cached agent")

    return agent_cache[cache_key]


# =============================================================================
# Lambda Handler
# =============================================================================


def lambda_handler(event, context):
    """
    AWS Lambda handler for AI agent interactions.

    Request format:
    {
        "user_input": "What is the current time?",
        "openai_api_key": "sk-...",
        "dashboard_api_key": "your-dashboard-key"
    }

    Response format:
    {
        "statusCode": 200,
        "body": {
            "prompt": "user input",
            "response": "agent response"
        }
    }
    """
    try:
        # Extract API keys from payload
        openai_api_key = event.get("openai_api_key", "")
        dashboard_api_key = event.get("dashboard_api_key", "")

        if not openai_api_key:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "openai_api_key not provided"}),
            }

        if not dashboard_api_key:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "dashboard_api_key not provided"}),
            }

        # Get user input (supports both 'user_input' and 'prompt' keys)
        user_input = event.get("user_input") or event.get("prompt", "")

        if not user_input:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "No user_input or prompt provided"}),
            }

        print(f"[HANDLER] Processing: {user_input[:50]}...")

        # Get agent and process request
        agent = get_agent(openai_api_key, dashboard_api_key)
        response = agent.interact(user_input)

        print(f"[HANDLER] Response: {response[:100]}...")

        return {
            "statusCode": 200,
            "body": json.dumps({"prompt": user_input, "response": response}),
        }

    except Exception as e:
        print(f"[ERROR] {type(e).__name__}: {str(e)}")
        import traceback

        traceback.print_exc()

        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e), "type": type(e).__name__}),
        }


# =============================================================================
# Local Testing
# =============================================================================

if __name__ == "__main__":
    """
    Local testing - requires OPENAI_API_KEY and DASHBOARD_API_KEY in environment.
    """
    import os

    print("Testing Lambda handler locally...\n")

    event = {
        "user_input": "What is the current time?",
        "openai_api_key": os.getenv("OPENAI_API_KEY", ""),
        "dashboard_api_key": os.getenv("DASHBOARD_API_KEY", ""),
    }

    result = lambda_handler(event, None)
    print(json.dumps(result, indent=2))
