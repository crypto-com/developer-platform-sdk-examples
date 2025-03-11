#!/usr/bin/env python3
import os
import argparse
import logging
from web3 import Web3


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

# Constants
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

CONTRACTS = {
    "session": "0xfebC82bBFC6FB8666AC45fa8a601DfA34Ce30710",
    "passkey": "0x0A019BD60E42b9d18413C710992B96E69dFFC5A0",
    "accountFactory": "0x381539B4FC39eAe0Eb848f52cCA93F168a0e955D",
    "accountPaymaster": "0xA7B450E91Bc126aa93C656750f9c940bfdc2f1e9",
}


def parse_args():
    parser = argparse.ArgumentParser(description="SSO Wallet Transaction Agent")
    parser.add_argument("--amount", type=int, default=1, help="Amount to send in wei")
    return parser.parse_args()


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


def main():
    args = parse_args()
    logger.info("Starting SSO Wallet Transaction Agent...")

    try:
        # Get session configuration
        session_config = get_session_config()
        logger.info(f"Session config loaded: {session_config}")

        # Prepare transaction
        tx_params = prepare_transaction(session_config, amount=args.amount)
        if not tx_params:
            raise Exception("Failed to prepare transaction")

        # Sign transaction
        signed_tx = sign_transaction(tx_params, session_config)
        if not signed_tx:
            raise Exception("Failed to sign transaction")

        # Send transaction
        tx_hash = send_transaction(signed_tx)
        if not tx_hash:
            raise Exception("Failed to send transaction")

        logger.info(f"Transaction sent successfully: {tx_hash}")

        # Wait for transaction confirmation
        receipt = wait_for_transaction(tx_hash)
        if receipt:
            logger.info(f"Transaction confirmed in block {receipt['blockNumber']}")
        else:
            logger.info("Transaction not confirmed within timeout period")

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
