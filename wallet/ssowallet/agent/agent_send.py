from web3 import Web3
import os
import logging
from dotenv import load_dotenv

from agent_transaction import (
    prepare_transaction,
    sign_transaction,
    send_transaction,
    wait_for_transaction,
)
from agent_session import fetch_session_config

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Chain configuration
CHAIN = {
    "id": 240,
    "name": "Cronos zkEVM Testnet",
    "nativeCurrency": {
        "decimals": 18,
        "name": "Cronos zkEVM Test Coin",
        "symbol": "zkTCRO",
    },
    "rpcUrls": {"default": {"http": ["https://seed.testnet.zkevm.cronos.org/"]}},
}

NULL_ADDRESS = "0x0000000000000000000000000000000000000000"


async def send_one_wei(web3: Web3, session_config: dict) -> str:
    """
    Send 1 wei to the null address
    Args:
        web3: Web3 instance
        session_config: Session configuration
    Returns:
        Transaction hash
    """
    logger.info("Sending 1 wei to null address...")

    tx_params = prepare_transaction(session_config, amount=1)  # 1 wei
    if not tx_params:
        raise Exception("Failed to prepare transaction")

    tx_params["to"] = Web3.to_checksum_address(NULL_ADDRESS)
    tx_params["from"] = Web3.to_checksum_address(os.getenv("SSO_WALLET_ADDRESS"))

    signed_tx = sign_transaction(tx_params, session_config)
    if not signed_tx:
        raise Exception("Failed to sign transaction")

    tx_hash = send_transaction(signed_tx)
    if not tx_hash:
        raise Exception("Failed to send transaction")

    receipt = wait_for_transaction(tx_hash)
    if receipt:
        logger.info(f"Successfully sent 1 wei to null address")
        logger.info(f"Transaction hash: {tx_hash}")
    else:
        raise Exception("Transaction not confirmed")

    return tx_hash


async def main():
    """
    Main function to execute the send process
    """
    logger.info("Starting SSO Wallet Send Agent...")

    try:
        # Initialize Web3
        web3 = Web3(Web3.HTTPProvider(CHAIN["rpcUrls"]["default"]["http"][0]))

        # Get session configuration
        session_config = fetch_session_config(
            web3,
            os.getenv("SSO_WALLET_ADDRESS"),
            os.getenv("SSO_WALLET_SESSION_PUBKEY"),
        )
        logger.info("Session config loaded successfully")

        # Send 1 wei to null address
        await send_one_wei(web3, session_config)

        logger.info("Send process finished successfully!")
        return 0

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return 1


if __name__ == "__main__":
    print("🚀 Starting send process...")
    import asyncio

    exit(asyncio.run(main()))
