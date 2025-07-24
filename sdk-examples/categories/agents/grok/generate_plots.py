import os
from datetime import datetime

import matplotlib
import matplotlib.pyplot as plt
from dotenv import load_dotenv

from crypto_com_agent_client import Agent, tool
from crypto_com_developer_platform_client import Transaction

# Set Matplotlib to use a non-GUI backend for compatibility
matplotlib.use("Agg")

# Load environment variables
load_dotenv()

# Constants
MAX_CHUNK_SIZE = 10_000
DEFAULT_LIMIT = "50"
PLOT_DIR = "plots"

# Ensure plot directory exists
os.makedirs(PLOT_DIR, exist_ok=True)


@tool
def get_transactions_plot(
    address: str,
    startBlock: int,
    endBlock: int,
    session: str = "",
    limit: str = DEFAULT_LIMIT,
) -> str:
    """
    Fetch and plot transaction values over time for a given blockchain address,
    handling large block ranges by splitting them into manageable chunks.

    Args:
        address (str): Blockchain address to query.
        startBlock (int): Starting block.
        endBlock (int): Ending block.
        session (str): Session identifier for pagination.
        limit (str): Max number of transactions per chunk.

    Returns:
        str: Summary message and path to the saved plot.
    """
    txs = []

    for chunk_start in range(startBlock, endBlock + 1, MAX_CHUNK_SIZE):
        chunk_end = min(chunk_start + MAX_CHUNK_SIZE - 1, endBlock)
        response = Transaction.get_transactions_by_address(
            address=address,
            startBlock=chunk_start,
            endBlock=chunk_end,
            session=session,
            limit=limit,
        )
        if not response or "data" not in response:
            continue

        chunk_txs = response["data"].get("transactions", [])
        txs.extend(chunk_txs)

    if not txs:
        return f"No transactions found for {address} between blocks {startBlock} and {endBlock}."

    # Extract dates and values
    dates = [datetime.fromtimestamp(int(tx.get("timestamp", 0))) for tx in txs]
    values = [float(tx.get("value", 0)) for tx in txs]

    # Generate plot
    plt.figure(figsize=(10, 6))
    plt.plot(dates, values, marker="o")
    plt.title(f"Transaction Values Over Time\nAddress: {address}")
    plt.xlabel("Date")
    plt.ylabel("Transaction Value (native units)")
    plt.grid(True)

    # Save plot
    filename = os.path.join(PLOT_DIR, f"transaction_plot_{address[:6]}.png")
    plt.savefig(filename)
    plt.close()

    return f"Fetched {len(txs)} transactions.\n" f"Plot saved to: {filename}"


# Initialize the agent
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
        "sso-wallet-url": os.getenv("SSO_WALLET_URL", ""),
    },
    plugins={
        "tools": [get_transactions_plot],
    },
)


if __name__ == "__main__":
    # Example usage (CLI or callable interface in production)
    address = "0x-wallet-address"
    start_block = 182289 # Placeholder
    end_block = 189101 # Placeholder

    prompt = (
        f"Generate a combined transaction value-over-time plot for address {address} "
        f"block range from startBlock {start_block} to endBlock {end_block}."
    )

    response = agent.interact(prompt)
    print(f"Agent response:\n{response}")
