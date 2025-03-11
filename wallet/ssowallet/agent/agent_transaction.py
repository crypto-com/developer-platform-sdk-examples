#!/usr/bin/env python3
import time
import os
from web3 import Web3
from eth_account import Account

from eth_utils import remove_0x_prefix, add_0x_prefix
from agent_config import logger, w3, CHAIN, SESSION_KEY, TARGET_ADDRESS, CONTRACTS
from agent_sign import serialize_transaction, hash_typed_data
from agent_encode_abi import encode_abi_params_values as encode_abi, get_session_params
import rlp


def prepare_transaction(session_config, amount=0, gas_limit=None):
    """
    Prepare a transaction for the session wallet.
    """
    try:

        # Get the current nonce directly from the wallet address, not from the signer
        from_addr = os.getenv("SSO_WALLET_ADDRESS")  # Get from .env
        nonce = w3.eth.get_transaction_count(Web3.to_checksum_address(from_addr))

        # Get current gas prices
        base_fee = w3.eth.get_block("latest").baseFeePerGas
        max_fee_per_gas = int(base_fee * 2.5)  # 2.5x the base fee

        to_addr = (
            TARGET_ADDRESS if TARGET_ADDRESS.startswith("0x") else f"0x{TARGET_ADDRESS}"
        )

        # Prepare transaction parameters
        tx_params = {
            "txType": 113,  # EIP712 transaction type (0x71)
            "from": from_addr,  # Using SSO_WALLET_ADDRESS
            "to": to_addr,
            "gasLimit": 196807,
            "gasPerPubdataByteLimit": 50000,  # Standard value for zkSync
            "maxFeePerGas": 6250000000000,
            "maxPriorityFeePerGas": 0,  # Always 0 for zkSync
            "paymaster": 0,
            "nonce": nonce,
            "value": amount,
            "data": "0x",  # Empty bytes as hex string
            "factoryDeps": [],
            "paymasterInput": "0x",  # Empty bytes as hex string
            "chainId": CHAIN["id"],
        }

        return tx_params

    except Exception as e:
        error_msg = f"Error preparing transaction: {e}"
        logger.error(error_msg)
        return None


def sign_transaction(tx_params, session_config):
    """
    Sign a transaction using the session key.
    """
    try:

        # Create the domain data
        domain = {"name": "zkSync", "version": "2", "chainId": CHAIN["id"]}

        # Convert hex addresses to integers for the message
        from_addr = tx_params["from"]
        if isinstance(from_addr, str):
            from_addr = remove_0x_prefix(from_addr)
            from_int = int(from_addr, 16)
        else:
            from_int = from_addr

        to_addr = tx_params["to"]
        if isinstance(to_addr, str):
            if (
                to_addr == "0x0"
                or to_addr == "0x0000000000000000000000000000000000000000"
            ):
                to_int = 0
            else:
                to_addr = remove_0x_prefix(to_addr)
                to_int = int(to_addr, 16)
        else:
            to_int = to_addr if to_addr != "0x0" else 0

        message = {
            "txType": tx_params["txType"],
            "from": from_int,
            "to": to_int,
            "gasLimit": tx_params["gasLimit"],
            "gasPerPubdataByteLimit": tx_params["gasPerPubdataByteLimit"],
            "maxFeePerGas": tx_params["maxFeePerGas"],
            "maxPriorityFeePerGas": tx_params["maxPriorityFeePerGas"],
            "paymaster": 0,
            "nonce": tx_params["nonce"],
            "value": tx_params["value"],
            "data": tx_params["data"],
            "factoryDeps": tx_params["factoryDeps"],
            "paymasterInput": tx_params["paymasterInput"],
        }

        # Define the types
        types = {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
            ],
            "Transaction": [
                {"name": "txType", "type": "uint256"},
                {"name": "from", "type": "uint256"},
                {"name": "to", "type": "uint256"},
                {"name": "gasLimit", "type": "uint256"},
                {"name": "gasPerPubdataByteLimit", "type": "uint256"},
                {"name": "maxFeePerGas", "type": "uint256"},
                {"name": "maxPriorityFeePerGas", "type": "uint256"},
                {"name": "paymaster", "type": "uint256"},
                {"name": "nonce", "type": "uint256"},
                {"name": "value", "type": "uint256"},
                {"name": "data", "type": "bytes"},
                {"name": "factoryDeps", "type": "bytes32[]"},
                {"name": "paymasterInput", "type": "bytes"},
            ],
        }

        # Get the hash of the typed data
        message_hash = hash_typed_data(domain, message, "Transaction", types)

        # Sign the message hash using the session key
        account = Account.from_key(bytes.fromhex(remove_0x_prefix(SESSION_KEY)))
        signature = account._key_obj.sign_msg_hash(
            bytes.fromhex(remove_0x_prefix(message_hash))
        )
        signed_hash = add_0x_prefix(
            hex(signature.r)[2:].zfill(64)
            + hex(signature.s)[2:].zfill(64)
            + hex(27 + signature.v)[2:].zfill(2)
        )

        # Handle to_address conversion properly
        if isinstance(tx_params["to"], str):
            if (
                tx_params["to"] == "0x0"
                or tx_params["to"] == "0x0000000000000000000000000000000000000000"
            ):
                to_address = "0x0000000000000000000000000000000000000000"
            else:
                to_address = Web3.to_checksum_address(tx_params["to"])
        else:
            to_address = "0x0000000000000000000000000000000000000000"

        call_data = tx_params.get("data", "0x")
        timestamp = int(time.time())

        # Encode session data
        session_data = {
            "sessionConfig": session_config,
            "to": to_address,
            "callData": call_data,
            "timestamp": timestamp,
        }

        # Define session params format for encoding - now imported from encodeabi
        session_params = get_session_params()

        # Extract values from our data structure
        session_values = [
            {
                "signer": session_config.get("signer", ""),
                "expiresAt": session_config.get("expiresAt", 0),
                "feeLimit": session_config.get("feeLimit", {}),
                "callPolicies": session_config.get("callPolicies", []),
                "transferPolicies": session_config.get("transferPolicies", []),
            },
            ["0", "0"],  # empty array for uint64[]
        ]
        import json

        validator_data = encode_abi(session_params, session_values)

        # Sign the transaction with session key
        # Define parameters for encoder
        signature_params = [
            {"type": "bytes", "name": "sessionKeySignedHash"},
            {"type": "address", "name": "sessionContract"},
            {"type": "bytes", "name": "validatorData"},
        ]

        signature_values = [signed_hash, CONTRACTS["session"], validator_data]

        # Use encodeabi's encode_session_tx function
        custom_signature = encode_abi(signature_params, signature_values)

        final_tx = {
            "txType": tx_params["txType"],
            "from": Web3.to_checksum_address(tx_params["from"]),
            "to": to_address,
            "gasLimit": tx_params["gasLimit"],
            "gasPerPubdataByteLimit": tx_params["gasPerPubdataByteLimit"],
            "maxFeePerGas": tx_params["maxFeePerGas"],
            "maxPriorityFeePerGas": tx_params["maxPriorityFeePerGas"],
            "nonce": tx_params["nonce"],
            "value": tx_params["value"],
            "data": tx_params["data"],
            "chainId": CHAIN["id"],
            "customSignature": custom_signature,
            "factoryDeps": tx_params["factoryDeps"],
            "paymasterInput": tx_params["paymasterInput"],
        }
        return final_tx

    except Exception as e:
        error_msg = f"Error signing transaction: {e}"
        logger.error(error_msg)
        return None


def send_transaction(tx_params):
    """
    Send a signed transaction to the network.

    Args:
        tx_params: Signed transaction parameters

    Returns:
        str: Transaction hash if successful, None otherwise
    """
    try:

        # Verify transaction has signature
        if not tx_params.get("customSignature"):
            raise ValueError("Transaction is not signed")

        # Serialize the transaction using the function from basic.py
        serialized_tx = serialize_transaction(tx_params)
        if not serialized_tx:
            raise ValueError("Failed to serialize transaction")

        tx_hash = w3.eth.send_raw_transaction(serialized_tx)

        return tx_hash.hex()

    except Exception as e:
        error_msg = f"Error sending transaction: {e}"
        logger.error(error_msg)
        return None


def wait_for_transaction(tx_hash, timeout=300):
    """
    Wait for a transaction to be mined.

    Args:
        tx_hash: Transaction hash to wait for
        timeout: Maximum time to wait in seconds

    Returns:
        dict: Transaction receipt if successful, None otherwise
    """
    try:
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                receipt = w3.eth.get_transaction_receipt(tx_hash)
                if receipt:
                    return receipt
            except Exception:
                pass

            time.sleep(1)

        logger.error(f"Transaction {tx_hash} not mined within {timeout} seconds")
        return None

    except Exception as e:
        error_msg = f"Error waiting for transaction: {e}"
        logger.error(error_msg)
        return None


def to_bytes(hex_str):
    """Convert hex string to bytes"""
    if not hex_str:
        return b""
    if isinstance(hex_str, bytes):
        return hex_str
    if isinstance(hex_str, str):
        hex_str = remove_0x_prefix(hex_str)
        # Ensure even length
        if len(hex_str) % 2 != 0:
            hex_str = "0" + hex_str
    return bytes.fromhex(hex_str)


def serialize_transaction(tx_params):
    """
    Serialize a zkSync transaction using RLP encoding.
    """
    try:
        # Prepare values for each field in the correct format
        nonce = to_bytes(hex(tx_params["nonce"])[2:]) if tx_params["nonce"] else b""
        max_priority_fee_per_gas = (
            to_bytes(hex(tx_params["maxPriorityFeePerGas"])[2:])
            if tx_params["maxPriorityFeePerGas"]
            else b""
        )
        max_fee_per_gas = (
            to_bytes(hex(tx_params["maxFeePerGas"])[2:])
            if tx_params["maxFeePerGas"]
            else b""
        )
        gas = to_bytes(hex(tx_params["gasLimit"])[2:]) if tx_params["gasLimit"] else b""

        # Handle 'to' address
        to = to_bytes(remove_0x_prefix(tx_params["to"])) if tx_params["to"] else b""

        # Handle value
        value = to_bytes(hex(tx_params["value"])[2:]) if tx_params["value"] else b""

        # Handle data - ensure it's properly formatted
        data = (
            to_bytes(remove_0x_prefix(tx_params.get("data", "0x")))
            if tx_params.get("data") and tx_params.get("data") != "0x"
            else b""
        )

        # Chain ID
        chain_id = to_bytes(hex(tx_params["chainId"])[2:])

        # From address
        from_addr = (
            to_bytes(remove_0x_prefix(tx_params["from"])) if tx_params["from"] else b""
        )

        # Gas per pubdata
        gas_per_pubdata = (
            to_bytes(hex(tx_params["gasPerPubdataByteLimit"])[2:])
            if "gasPerPubdataByteLimit" in tx_params
            else b""
        )

        # Factory deps (should be a list for RLP)
        factory_deps = tx_params.get("factoryDeps", [])

        # Custom signature - ensure it's properly formatted
        custom_signature = to_bytes(
            remove_0x_prefix(tx_params.get("customSignature", ""))
        )

        # Paymaster input
        paymaster_input = to_bytes(
            remove_0x_prefix(tx_params.get("paymasterInput", ""))
        )

        # Create the serialized transaction list exactly as in the working example
        serialized_transaction = [
            nonce,  # 0
            max_priority_fee_per_gas,  # 1
            max_fee_per_gas,  # 2
            gas,  # 3
            to,  # 4
            value,  # 5
            data,  # 6
            chain_id,  # 7
            b"",  # 8 - Empty signature field
            b"",  # 9 - Empty field
            chain_id,  # 10 - Repeat chain ID
            from_addr,  # 11
            gas_per_pubdata,  # 12
            factory_deps,  # 13
            custom_signature,  # 14 - EIP712 signature
            [],  # 15 - Empty list for paymaster params
        ]

        # Encode using RLP
        encoded = rlp.encode(serialized_transaction)

        # Add transaction type prefix (0x71 for zkSync)
        serialized = "0x71" + encoded.hex()

        return serialized

    except Exception as e:
        error_msg = f"Error serializing transaction: {str(e)}"
        logger.error(error_msg)
        return None
