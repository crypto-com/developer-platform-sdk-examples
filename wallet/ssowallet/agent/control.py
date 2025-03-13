#!/usr/bin/env python3
import subprocess
import os
import sys
import platform
import signal
import time

# Global variable to store the process
ssowallet_process = None


def run_ssowallet():
    """
    Run the SSO wallet agent using Node.js.
    Returns the process object.
    """
    global ssowallet_process

    # Check if process is already running
    if ssowallet_process is not None and ssowallet_process.poll() is None:
        print("SSO Wallet is already running.")
        return ssowallet_process

    # Check if the dist directory and index.js file exist
    if not os.path.exists("dist"):
        print("Error: 'dist' directory not found. Have you built the application?")
        print("Run 'yarn run build' first to compile the TypeScript code.")
        return None

    if not os.path.exists("dist/index.js"):
        print("Error: 'dist/index.js' not found. The compiled main file is missing.")
        print("Run 'yarn run build' to ensure proper compilation.")
        return None

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
        print("Starting SSO Wallet agent...")
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
        import threading

        def output_reader():
            for line in process.stdout:
                print(line, end="")

        thread = threading.Thread(target=output_reader, daemon=True)
        thread.start()

        print(f"SSO Wallet agent started with PID: {process.pid}")
        return process

    except Exception as e:
        print(f"Error running SSO Wallet agent: {e}")
        return None


def stop_ssowallet():
    """
    Stop the SSO wallet agent process.
    """
    global ssowallet_process

    if ssowallet_process is None:
        print("No SSO Wallet agent is running.")
        return

    if ssowallet_process.poll() is not None:
        print("SSO Wallet agent is not running.")
        ssowallet_process = None
        return

    print(f"Stopping SSO Wallet agent (PID: {ssowallet_process.pid})...")

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

        print("SSO Wallet agent stopped.")
        ssowallet_process = None

    except Exception as e:
        print(f"Error stopping SSO Wallet agent: {e}")


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


def main():
    """
    Main function to handle user commands.
    """
    print(f"SSO Wallet Control Script")
    print(f"Python {platform.python_version()} on {platform.system()}")
    print(f"Current directory: {os.getcwd()}")

    if not check_requirements():
        sys.exit(1)

    print("\nAvailable commands:")
    print("  run  - Start the SSO Wallet agent")
    print("  stop - Stop the SSO Wallet agent")
    print("  exit - Exit this control script")

    while True:
        try:
            command = input("\nEnter command (run/stop/exit): ").strip().lower()

            if command == "run":
                run_ssowallet()
            elif command == "stop":
                stop_ssowallet()
            elif command == "exit":
                if ssowallet_process is not None and ssowallet_process.poll() is None:
                    print("Warning: SSO Wallet agent is still running.")
                    confirm = (
                        input("Do you want to stop it before exiting? (y/n): ")
                        .strip()
                        .lower()
                    )
                    if confirm == "y":
                        stop_ssowallet()
                print("Exiting control script.")
                break
            else:
                print("Unknown command. Available commands: run, stop, exit")

        except KeyboardInterrupt:
            print("\nKeyboard interrupt detected.")
            if ssowallet_process is not None and ssowallet_process.poll() is None:
                confirm = (
                    input("Do you want to stop the running SSO Wallet agent? (y/n): ")
                    .strip()
                    .lower()
                )
                if confirm == "y":
                    stop_ssowallet()
            print("Exiting control script.")
            break


if __name__ == "__main__":
    main()
