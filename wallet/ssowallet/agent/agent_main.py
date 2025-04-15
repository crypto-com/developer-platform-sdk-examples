import os
import logging
from web3 import Web3
from dotenv import load_dotenv

from agent_swap import (
    deposit_zkCRO,
    approve_WZKCRO,
    swap_WZKCRO_to_VUSD,
    approve_VUSD,
    swap_VUSD_to_WZKCRO,
    unwrap_WZKCRO,
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


def get_session_config():
    """Get session configuration from the blockchain"""
    session_key = os.getenv("SSO_WALLET_SESSION_KEY")
    wallet_address = os.getenv("SSO_WALLET_ADDRESS")
    session_pubkey = os.getenv("SSO_WALLET_SESSION_PUBKEY")

    if not all([session_key, wallet_address]):
        raise ValueError("Missing required environment variables")

    # Initialize Web3 connection
    web3 = Web3(Web3.HTTPProvider(CHAIN["rpcUrls"]["default"]["http"][0]))

    # Fetch session config from blockchain
    session_config = fetch_session_config(web3, wallet_address, session_pubkey)
    if not session_config:
        raise ValueError("Failed to fetch session configuration from blockchain")

    return session_config


async def main():
    """Main function to execute swap based on SWAP_MODE"""
    logger.info("Starting SSO Wallet Swap Agent...")

    try:
        # Get session configuration
        session_config = get_session_config()
        logger.info(f"Session config loaded: {session_config}")

        # Initialize Web3
        web3 = Web3(Web3.HTTPProvider(CHAIN["rpcUrls"]["default"]["http"][0]))

        # Get swap mode and amount from environment
        swap_mode = os.getenv("SWAP_MODE", "VUSD_TO_ZKCRO")
        amount = float(os.getenv("SWAP_AMOUNT", "1.0"))

        if swap_mode == "ZKCRO_TO_VUSD":
            logger.info("Executing ZKCRO to VUSD swap...")
            await deposit_zkCRO(web3, session_config, amount)
            await approve_WZKCRO(web3, session_config, amount)
            await swap_WZKCRO_to_VUSD(web3, session_config, amount)
        elif swap_mode == "VUSD_TO_ZKCRO":
            logger.info("Executing VUSD to ZKCRO swap...")
            await approve_VUSD(web3, session_config, amount)
            await swap_VUSD_to_WZKCRO(web3, session_config, amount)
            await unwrap_WZKCRO(web3, session_config, amount)
        else:
            raise ValueError(
                f"Invalid SWAP_MODE: {swap_mode}. Must be either 'ZKCRO_TO_VUSD' or 'VUSD_TO_ZKCRO'"
            )

        logger.info("Swap completed successfully!")
        return 0

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return 1


if __name__ == "__main__":
    import asyncio

    exit(asyncio.run(main()))
