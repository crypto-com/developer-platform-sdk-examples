import os
import sys
import datetime
import subprocess
import platform
import signal
import time
import threading

# Now import and check the path
import crypto_com_developer_platform_client

from crypto_com_agent_client import Agent, tool, SQLitePlugin
from dotenv import load_dotenv

load_dotenv()

# Global variable to store the process
ssowallet_process = None

def check_requirements():
    """
    Check if Node.js is installed.
    """
    try:
        subprocess.run(
            ["node", "--version"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
        )
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        print("Error: Node.js is not installed or not in PATH.")
        print("Please install Node.js before running this script.")
        return False


@tool
def run_ssowallet() -> str:
    """
    Start the SSO wallet agent using Node.js.
    Returns a status message.
    """
    global ssowallet_process

    local_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    utc_time = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d %H:%M:%S")

    # Check Node.js requirements first
    if not check_requirements():
        return f"Error: Node.js requirements not met.\nLocal time: {local_time}\nUTC time: {utc_time}"

    # Check if process is already running
    if ssowallet_process is not None and ssowallet_process.poll() is None:
        return f"SSO Wallet is already running.\nLocal time: {local_time}\nUTC time: {utc_time}"

    # Check if the dist directory and index.js file exist
    if not os.path.exists("dist"):
        return "Error: 'dist' directory not found. Have you built the application?"

    if not os.path.exists("dist/index.js"):
        return "Error: 'dist/index.js' not found. The compiled main file is missing."

    # Set environment variables from .env file if it exists
    env = os.environ.copy()
    if os.path.exists(".env"):
        print("Loading environment variables from .env file...")
        with open(".env", "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    env[key] = value

    try:
        # Run the Node.js command
        process = subprocess.Popen(
            ["node", "./dist/index.js"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1,
        )

        ssowallet_process = process

        # Start a separate thread to print output
        def output_reader():
            for line in process.stdout:
                print(line, end="")

        thread = threading.Thread(target=output_reader, daemon=True)
        thread.start()

        return f"SSO Wallet agent started with PID: {process.pid}\nLocal time: {local_time}\nUTC time: {utc_time}"

    except Exception as e:
        return f"Error running SSO Wallet agent: {e}\nLocal time: {local_time}\nUTC time: {utc_time}"


@tool
def stop_ssowallet() -> str:
    """
    Stop the SSO wallet agent process.
    Returns a status message.
    """
    global ssowallet_process

    local_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    utc_time = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d %H:%M:%S")

    if ssowallet_process is None:
        return f"No SSO Wallet agent is running.\nLocal time: {local_time}\nUTC time: {utc_time}"

    if ssowallet_process.poll() is not None:
        ssowallet_process = None
        return f"SSO Wallet agent is not running.\nLocal time: {local_time}\nUTC time: {utc_time}"

    try:
        # Try to terminate gracefully first
        ssowallet_process.terminate()

        # Wait for up to 5 seconds for the process to terminate
        for _ in range(10):
            if ssowallet_process.poll() is not None:
                break
            time.sleep(0.5)

        # If still running, force kill
        if ssowallet_process.poll() is None:
            print("Process did not terminate gracefully, forcing kill...")
            if platform.system() == "Windows":
                subprocess.run(
                    ["taskkill", "/F", "/PID", str(ssowallet_process.pid)],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
            else:
                os.kill(ssowallet_process.pid, signal.SIGKILL)

        ssowallet_process = None
        return (
            f"SSO Wallet agent stopped.\nLocal time: {local_time}\nUTC time: {utc_time}"
        )

    except Exception as e:
        return f"Error stopping SSO Wallet agent: {e}\nLocal time: {local_time}\nUTC time: {utc_time}"


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
