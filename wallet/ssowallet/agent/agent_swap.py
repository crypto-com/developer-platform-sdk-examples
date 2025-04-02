from eth_abi import encode, decode
from eth_utils import to_hex, remove_0x_prefix, function_signature_to_4byte_selector
import pytest
import os
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

# Contract addresses
WZKCRO_ADDRESS = "0xeD73b53197189BE3Ff978069cf30eBc28a8B5837"
ROUTER_ADDRESS = "0x9EB4db2E31259444c5C2123bec8B17a510C4c72B"
VUSD_ADDRESS = "0x9553dA89510e33BfE65fcD71c1874FF1D6b0dD75"

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


def get_function_selector(signature: str) -> bytes:
    """Compute the function selector for a given function signature"""
    selector = function_signature_to_4byte_selector(signature)
    assert len(selector) == 4, f"Invalid selector length: {len(selector)}"
    return selector


def get_deposit_data() -> bytes:
    """Get the encoded data for WZKCRO deposit function"""
    selector = get_function_selector("deposit()")
    expected = "d0e30db0"
    assert (
        selector.hex() == expected
    ), f"Expected selector {expected}, got {selector.hex()}"
    return selector


def get_approve_data(spender: str, amount: int) -> bytes:
    """Get the encoded data for ERC20 approve function"""
    selector = get_function_selector("approve(address,uint256)")
    expected = "095ea7b3"
    assert (
        selector.hex() == expected
    ), f"Expected selector {expected}, got {selector.hex()}"
    params = encode(["address", "uint256"], [spender, amount])
    return selector + params


def get_swap_data(
    amount_in: int, amount_out_min: int, path: list[str], to_address: str
) -> bytes:
    """Get the encoded data for swapExactTokensForTokens function"""
    selector = get_function_selector(
        "swapExactTokensForTokens(uint256,uint256,address[],address)"
    )
    expected = "472b43f3"
    assert (
        selector.hex() == expected
    ), f"Expected selector {expected}, got {selector.hex()}"
    params = encode(
        ["uint256", "uint256", "address[]", "address"],
        [amount_in, amount_out_min, path, to_address],
    )
    return selector + params


async def deposit_zkCRO(web3: Web3, session_config: dict, amount: float) -> str:
    """
    Step 1: Deposit (Wrap) zkCRO to WZKCRO
    Args:
        web3: Web3 instance
        session_config: Session configuration
        amount: Amount of zkCRO to wrap (in ETH units)
    Returns:
        Transaction hash
    """
    logger.info("Step 1: Depositing zkCRO to get WZKCRO...")

    amount_wei = web3.to_wei(amount, "ether")
    deposit_data = get_deposit_data()

    tx_params = prepare_transaction(session_config, amount=amount_wei)
    if not tx_params:
        raise Exception("Failed to prepare deposit transaction")

    tx_params["data"] = Web3.to_hex(deposit_data)
    tx_params["to"] = Web3.to_checksum_address(WZKCRO_ADDRESS)
    tx_params["from"] = Web3.to_checksum_address(os.getenv("SSO_WALLET_ADDRESS"))

    signed_tx = sign_transaction(tx_params, session_config)
    if not signed_tx:
        raise Exception("Failed to sign deposit transaction")

    tx_hash = send_transaction(signed_tx)
    if not tx_hash:
        raise Exception("Failed to send deposit transaction")

    receipt = wait_for_transaction(tx_hash)
    if receipt:
        logger.info(f"Deposit successful! Wrapped {amount} zkCRO to WZKCRO")
        logger.info(f"Transaction hash: {tx_hash}")
    else:
        raise Exception("Deposit transaction not confirmed")

    return tx_hash


async def approve_WZKCRO(web3: Web3, session_config: dict, amount: float) -> str:
    """
    Step 2: Approve WZKCRO for Router
    Args:
        web3: Web3 instance
        session_config: Session configuration
        amount: Amount to approve (in ETH units)
    Returns:
        Transaction hash
    """
    logger.info("Step 2: Approving WZKCRO for Router...")

    amount_wei = web3.to_wei(amount, "ether")
    approve_data = get_approve_data(ROUTER_ADDRESS, amount_wei)

    tx_params = prepare_transaction(session_config)
    if not tx_params:
        raise Exception("Failed to prepare approve transaction")

    tx_params["data"] = Web3.to_hex(approve_data)
    tx_params["to"] = Web3.to_checksum_address(WZKCRO_ADDRESS)
    tx_params["from"] = Web3.to_checksum_address(os.getenv("SSO_WALLET_ADDRESS"))

    signed_tx = sign_transaction(tx_params, session_config)
    if not signed_tx:
        raise Exception("Failed to sign approve transaction")

    tx_hash = send_transaction(signed_tx)
    if not tx_hash:
        raise Exception("Failed to send approve transaction")

    receipt = wait_for_transaction(tx_hash)
    if receipt:
        logger.info(f"Approval successful! Router can now spend {amount} WZKCRO")
        logger.info(f"Transaction hash: {tx_hash}")
    else:
        raise Exception("Approve transaction not confirmed")

    return tx_hash


async def swap_WZKCRO_to_VUSD(web3: Web3, session_config: dict, amount: float) -> str:
    """
    Step 3: Swap WZKCRO to VUSD
    Args:
        web3: Web3 instance
        session_config: Session configuration
        amount: Amount to swap (in ETH units)
    Returns:
        Transaction hash
    """
    logger.info("Step 3: Swapping WZKCRO to VUSD...")

    amount_wei = web3.to_wei(amount, "ether")
    path = [WZKCRO_ADDRESS, VUSD_ADDRESS]
    to_address = os.getenv("SSO_WALLET_ADDRESS")

    swap_data = get_swap_data(
        amount_wei,
        0,  # No minimum output amount (be careful in production!)
        path,
        to_address,
    )

    tx_params = prepare_transaction(session_config)
    if not tx_params:
        raise Exception("Failed to prepare swap transaction")

    tx_params["data"] = Web3.to_hex(swap_data)
    tx_params["to"] = Web3.to_checksum_address(ROUTER_ADDRESS)
    tx_params["from"] = Web3.to_checksum_address(to_address)

    signed_tx = sign_transaction(tx_params, session_config)
    if not signed_tx:
        raise Exception("Failed to sign swap transaction")

    tx_hash = send_transaction(signed_tx)
    if not tx_hash:
        raise Exception("Failed to send swap transaction")

    receipt = wait_for_transaction(tx_hash)
    if receipt:
        logger.info(f"Swap successful! Swapped {amount} WZKCRO to VUSD")
        logger.info(f"Transaction hash: {tx_hash}")
    else:
        raise Exception("Swap transaction not confirmed")

    return tx_hash


async def approve_VUSD(web3: Web3, session_config: dict, amount: float) -> str:
    """
    Step 1: Approve VUSD for Router
    Args:
        web3: Web3 instance
        session_config: Session configuration
        amount: Amount to approve (in VUSD units)
    Returns:
        Transaction hash
    """
    logger.info("Step 1: Approving VUSD for Router...")

    amount_wei = web3.to_wei(amount, "ether")
    approve_data = get_approve_data(ROUTER_ADDRESS, amount_wei)

    tx_params = prepare_transaction(session_config)
    if not tx_params:
        raise Exception("Failed to prepare approve transaction")

    tx_params["data"] = Web3.to_hex(approve_data)
    tx_params["to"] = Web3.to_checksum_address(VUSD_ADDRESS)
    tx_params["from"] = Web3.to_checksum_address(os.getenv("SSO_WALLET_ADDRESS"))

    signed_tx = sign_transaction(tx_params, session_config)
    if not signed_tx:
        raise Exception("Failed to sign approve transaction")

    tx_hash = send_transaction(signed_tx)
    if not tx_hash:
        raise Exception("Failed to send approve transaction")

    receipt = wait_for_transaction(tx_hash)
    if receipt:
        logger.info(f"Approval successful! Router can now spend {amount} VUSD")
        logger.info(f"Transaction hash: {tx_hash}")
    else:
        raise Exception("Approve transaction not confirmed")

    return tx_hash


async def swap_VUSD_to_WZKCRO(web3: Web3, session_config: dict, amount: float) -> str:
    """
    Step 2: Swap VUSD to WZKCRO
    Args:
        web3: Web3 instance
        session_config: Session configuration
        amount: Amount to swap (in VUSD units)
    Returns:
        Transaction hash
    """
    logger.info("Step 2: Swapping VUSD to WZKCRO...")

    amount_wei = web3.to_wei(amount, "ether")
    path = [VUSD_ADDRESS, WZKCRO_ADDRESS]
    to_address = os.getenv("SSO_WALLET_ADDRESS")

    swap_data = get_swap_data(
        amount_wei,
        0,  # No minimum output amount (be careful in production!)
        path,
        to_address,
    )

    tx_params = prepare_transaction(session_config)
    if not tx_params:
        raise Exception("Failed to prepare swap transaction")

    tx_params["data"] = Web3.to_hex(swap_data)
    tx_params["to"] = Web3.to_checksum_address(ROUTER_ADDRESS)
    tx_params["from"] = Web3.to_checksum_address(to_address)

    signed_tx = sign_transaction(tx_params, session_config)
    if not signed_tx:
        raise Exception("Failed to sign swap transaction")

    tx_hash = send_transaction(signed_tx)
    if not tx_hash:
        raise Exception("Failed to send swap transaction")

    receipt = wait_for_transaction(tx_hash)
    if receipt:
        logger.info(f"Swap successful! Swapped {amount} VUSD to WZKCRO")
        logger.info(f"Transaction hash: {tx_hash}")
    else:
        raise Exception("Swap transaction not confirmed")

    return tx_hash


async def unwrap_WZKCRO(web3: Web3, session_config: dict, amount: float) -> str:
    """
    Step 3: Unwrap WZKCRO to get zkCRO
    Args:
        web3: Web3 instance
        session_config: Session configuration
        amount: Amount to unwrap (in ETH units)
    Returns:
        Transaction hash
    """
    logger.info("Step 3: Unwrapping WZKCRO to get zkCRO...")

    amount_wei = web3.to_wei(amount, "ether")
    withdraw_selector = get_function_selector("withdraw(uint256)")
    withdraw_data = withdraw_selector + encode(["uint256"], [amount_wei])

    tx_params = prepare_transaction(session_config)
    if not tx_params:
        raise Exception("Failed to prepare withdraw transaction")

    tx_params["data"] = Web3.to_hex(withdraw_data)
    tx_params["to"] = Web3.to_checksum_address(WZKCRO_ADDRESS)
    tx_params["from"] = Web3.to_checksum_address(os.getenv("SSO_WALLET_ADDRESS"))

    signed_tx = sign_transaction(tx_params, session_config)
    if not signed_tx:
        raise Exception("Failed to sign withdraw transaction")

    tx_hash = send_transaction(signed_tx)
    if not tx_hash:
        raise Exception("Failed to send withdraw transaction")

    receipt = wait_for_transaction(tx_hash)
    if receipt:
        logger.info(f"Unwrap successful! Unwrapped {amount} WZKCRO to zkCRO")
        logger.info(f"Transaction hash: {tx_hash}")
    else:
        raise Exception("Withdraw transaction not confirmed")

    return tx_hash


async def main():
    """
    Main function to execute the swap process based on user input
    """
    logger.info("Starting SSO Wallet Swap Agent...")

    # Get swap direction from user
    print("\nChoose swap direction:")
    print("1. zkCRO -> VUSD")
    print("2. VUSD -> zkCRO")

    while True:
        try:
            direction = int(input("Enter choice (1 or 2): "))
            if direction in [1, 2]:
                break
            print("Invalid choice. Please enter 1 or 2.")
        except ValueError:
            print("Invalid input. Please enter a number.")

    # Get amount from user
    while True:
        try:
            if direction == 1:
                amount = float(input("\nEnter amount of zkCRO to swap: "))
            else:
                amount = float(input("\nEnter amount of VUSD to swap: "))
            if amount > 0:
                break
            print("Amount must be greater than 0.")
        except ValueError:
            print("Invalid input. Please enter a number.")

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

        # Execute the swap process based on direction
        if direction == 1:
            # zkCRO -> VUSD
            await deposit_zkCRO(web3, session_config, amount)
            await approve_WZKCRO(web3, session_config, amount)
            await swap_WZKCRO_to_VUSD(web3, session_config, amount)
        else:
            # VUSD -> zkCRO
            await approve_VUSD(web3, session_config, amount)
            await swap_VUSD_to_WZKCRO(web3, session_config, amount)
            await unwrap_WZKCRO(web3, session_config, amount)

        logger.info("Complete swap process finished successfully!")
        return 0

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return 1


if __name__ == "__main__":
    print("Starting swap process...")
    import asyncio

    exit(asyncio.run(main()))
