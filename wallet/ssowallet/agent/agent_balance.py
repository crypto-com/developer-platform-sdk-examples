import os
import logging
from web3 import Web3
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Contract addresses
WZKCRO_ADDRESS = "0xeD73b53197189BE3Ff978069cf30eBc28a8B5837"
VUSD_ADDRESS = "0x9553dA89510e33BfE65fcD71c1874FF1D6b0dD75"

# Chain configuration
CHAIN = {
    "id": 240,
    "name": "Cronos zkEVM Testnet",
    "rpcUrls": {"default": {"http": ["https://seed.testnet.zkevm.cronos.org/"]}},
}

# ERC20 ABI for balanceOf
ERC20_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function",
    }
]


async def get_token_balance(
    web3: Web3, token_address: str, wallet_address: str
) -> float:
    """Get the balance of an ERC20 token for a specific address"""
    token_contract = web3.eth.contract(
        address=Web3.to_checksum_address(token_address), abi=ERC20_ABI
    )
    balance_wei = token_contract.functions.balanceOf(
        Web3.to_checksum_address(wallet_address)
    ).call()
    return web3.from_wei(balance_wei, "ether")


async def main():
    """Display balances of zkCRO, WZKCRO, and VUSD"""
    try:
        # Initialize Web3
        web3 = Web3(Web3.HTTPProvider(CHAIN["rpcUrls"]["default"]["http"][0]))

        # Get wallet address from .env
        wallet_address = os.getenv("SSO_WALLET_ADDRESS")
        if not wallet_address:
            raise ValueError("SSO_WALLET_ADDRESS not found in .env")

        # Get native zkCRO balance
        zkcro_balance_wei = web3.eth.get_balance(
            Web3.to_checksum_address(wallet_address)
        )
        zkcro_balance = web3.from_wei(zkcro_balance_wei, "ether")

        # Get WZKCRO balance
        wzkcro_balance = await get_token_balance(web3, WZKCRO_ADDRESS, wallet_address)

        # Get VUSD balance
        vusd_balance = await get_token_balance(web3, VUSD_ADDRESS, wallet_address)

        # Display balances
        print("\nWallet Balance Report")
        print("=" * 40)
        print(f"Address: {wallet_address}")
        print("-" * 40)
        print(f"Native zkCRO: {zkcro_balance:.6f}")
        print(f"Wrapped zkCRO: {wzkcro_balance:.6f}")
        print(f"VUSD: {vusd_balance:.6f}")
        print("=" * 40)

        return 0

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return 1


if __name__ == "__main__":
    import asyncio

    exit(asyncio.run(main()))
