from eth_abi import encode
from eth_utils import keccak, remove_0x_prefix, add_0x_prefix, decode_hex
from typing import Dict, List, Any, Optional, Union
from web3 import Web3
from rlp import encode as rlp_encode

import json
from agent_config import logger

# Import encoding functions from encodeabi.py
from agent_encode_abi import encode_abi_params_values as encode_abi


def keccak256(hex_str: str) -> str:
    """Compute Keccak-256 hash of hex string"""
    if isinstance(hex_str, bytes):
        return add_0x_prefix(keccak(hex_str).hex())
    # Remove 0x prefix if present
    hex_str = remove_0x_prefix(hex_str) if hex_str.startswith("0x") else hex_str
    # Convert hex string to bytes and hash
    return add_0x_prefix(keccak(bytes.fromhex(hex_str)).hex())


def encode_type(primary_type: str, types_dict: Dict) -> str:
    """Encode type string for EIP-712"""

    def find_type_deps(primary: str, types_dict: Dict, results=None) -> set:
        if results is None:
            results = set()
        if primary in results or primary not in types_dict:
            return results
        results.add(primary)
        for field in types_dict[primary]:
            base_type = field["type"].split("[")[0]
            find_type_deps(base_type, types_dict, results)
        return results

    deps = find_type_deps(primary_type, types_dict)
    deps.remove(primary_type)
    deps = [primary_type] + sorted(list(deps))

    result = ""
    for dep in deps:
        fields = ",".join(f"{f['type']} {f['name']}" for f in types_dict[dep])
        result += f"{dep}({fields})"
    return result


def hash_type(primary_type: str, types: Dict) -> bytes:
    """Hash encoded type string"""
    encoded = encode_type(primary_type, types)
    return decode_hex(keccak256(encoded.encode().hex()))


def encode_data(data: Dict, primary_type: str, types: Dict) -> str:
    """Encode data according to EIP-712"""

    encoded_types = ["bytes32"]
    encoded_values = [hash_type(primary_type, types)]

    for field in types[primary_type]:
        name = field["name"]
        value = data[name]

        if field["type"] == "string":
            # Hash the string value
            value_hash = Web3.keccak(text=value)
            encoded_types.append("bytes32")
            encoded_values.append(value_hash)
        elif field["type"] == "uint256":
            # Convert the value to decimal if it's a hex string
            if isinstance(value, str) and value.startswith("0x"):
                value = int(value, 16)
            # Convert to 32-byte hex
            hex_value = hex(value)[2:].zfill(64)
            encoded_types.append("uint256")
            encoded_values.append(value)
        elif field["type"] == "bytes":
            encoded_types.append("bytes32")
            # Handle empty bytes or '0x0' by padding with zeros
            if value == "0x" or value == "0x0":
                # Add a leading zero if odd length
                value = "0x" + "0" * (len(value[2:]) % 2) + value[2:]
            value_hash = Web3.keccak(hexstr=value)
            encoded_values.append(value_hash)
        elif field["type"] == "bytes32[]":
            encoded_types.append("bytes32")
            if not value:  # Empty array
                # For empty array, encode as empty bytes
                value_hash = Web3.keccak(hexstr="0x")
                encoded_values.append(value_hash)
            else:
                # Hash the array of bytes32 values
                array_hash = Web3.keccak(
                    b"".join([bytes.fromhex(v[2:]) for v in value])
                )
                encoded_values.append(array_hash)
        else:
            raise ValueError(f"Unsupported type: {field['type']}")

    result = encode(encoded_types, encoded_values).hex()
    return result


def hash_struct(data: Dict, primary_type: str, types: Dict) -> str:
    """Hash a struct according to EIP-712"""
    encoded = encode_data(data, primary_type, types)
    return keccak256(encoded)


def hash_domain(domain: Dict, types: Dict) -> str:
    """Hash domain data"""
    return hash_struct(domain, "EIP712Domain", types)


def hash_typed_data(domain: Dict, message: Dict, primary_type: str, types: Dict) -> str:
    """Main function to hash typed data according to EIP-712"""
    domain_hash = hash_domain(domain, types)
    struct_hash = hash_struct(message, primary_type, types)

    # Concatenate with EIP-712 prefix
    encoded = "0x1901" + remove_0x_prefix(domain_hash) + remove_0x_prefix(struct_hash)
    myhash = keccak256(encoded)
    return myhash


def encode_abi_parameters(types: List[Dict], values: List[Any]) -> str:
    """
    Encode parameters according to ABI specification
    Uses the implementation from encodeabi.py
    """
    # Using encodeabi.py implementation
    return encode_abi(types, values)


def to_hex_str(value: Optional[Union[int, str, bytes]], prefix: bool = True) -> str:
    """Convert value to hex string"""
    if value is None or value == "":
        return "0x" if prefix else ""
    if isinstance(value, bytes):
        hex_str = value.hex()
    elif isinstance(value, str):
        if value.startswith("0x"):
            return value if prefix else value[2:]
        # Remove any non-hex characters
        hex_str = "".join(c for c in value if c in "0123456789abcdefABCDEF")
    else:
        hex_str = hex(value)[2:] if isinstance(value, int) else str(value)
    return ("0x" + hex_str) if prefix else hex_str


def serialize_transaction(tx: Dict) -> str:
    """
    Serialize a transaction for zkSync EIP712 format using RLP encoding.
    Matches the TypeScript implementation exactly.
    """
    try:
        # Extract all fields as in TypeScript
        chain_id = tx.get("chainId", 240)
        gas = tx.get("gas", 0)
        nonce = tx.get("nonce", 0)
        to = tx.get("to")
        from_addr = tx.get("from")
        value = tx.get("value", 0)
        max_fee_per_gas = tx.get("maxFeePerGas", 0)
        max_priority_fee_per_gas = tx.get("maxPriorityFeePerGas", 0)
        custom_signature = tx.get("customSignature", "0x")
        factory_deps = tx.get("factoryDeps", [])
        paymaster = tx.get("paymaster")
        paymaster_input = tx.get("paymasterInput")
        gas_per_pubdata = tx.get("gasPerPubdata", 50000)
        data = tx.get("data", "0x")

        # Convert values to proper format
        def to_bytes(value):
            if value is None or value == "":
                return b""
            if isinstance(value, str):
                if value == "0x":
                    return b""
                if value.startswith("0x"):
                    value = value[2:]
                # Remove any non-hex characters
                value = "".join(c for c in value if c in "0123456789abcdefABCDEF")
                if not value:
                    return b""
                # Ensure even length
                if len(value) % 2 != 0:
                    value = "0" + value
                try:
                    return bytes.fromhex(value)
                except ValueError:
                    logger.warning(
                        f"Warning: Invalid hex value '{value}', using empty bytes"
                    )
                    return b""
            if isinstance(value, int):
                if value == 0:
                    return b""
                try:
                    return value.to_bytes(
                        (value.bit_length() + 7) // 8, byteorder="big"
                    )
                except OverflowError:
                    logger.warning(
                        f"Warning: Integer overflow for value {value}, using empty bytes"
                    )
                    return b""
            if isinstance(value, bytes):
                return value
            return b""

        # Prepare fields in exact order as TypeScript
        rlp_fields = [
            to_bytes(to_hex_str(nonce)[2:]),  # nonce
            to_bytes(to_hex_str(max_priority_fee_per_gas)[2:]),  # maxPriorityFeePerGas
            to_bytes(to_hex_str(max_fee_per_gas)[2:]),  # maxFeePerGas
            to_bytes(to_hex_str(gas)[2:]),  # gas
            to_bytes(to or "0x"),  # to
            to_bytes(to_hex_str(value)[2:]),  # value
            to_bytes(data[2:] if data.startswith("0x") else data),  # data
            to_bytes(to_hex_str(chain_id)[2:]),  # chainId
            b"",  # empty string
            b"",  # empty string
            to_bytes(to_hex_str(chain_id)[2:]),  # chainId again
            to_bytes(
                from_addr[2:]
                if from_addr and from_addr.startswith("0x")
                else from_addr or ""
            ),  # from
            to_bytes(to_hex_str(gas_per_pubdata)[2:]),  # gasPerPubdata
            factory_deps or [],  # factoryDeps
            to_bytes(
                custom_signature[2:]
                if custom_signature.startswith("0x")
                else custom_signature
            ),  # customSignature
            (
                [to_bytes(paymaster or ""), to_bytes(paymaster_input or "")]
                if paymaster and paymaster_input
                else []
            ),  # paymaster data
        ]

        # RLP encode the fields
        encoded = rlp_encode(rlp_fields).hex()

        # Add EIP712 transaction type prefix (0x71)
        serialized = "0x71" + encoded

        return serialized

    except Exception as e:
        logger.error(f"Error serializing transaction: {str(e)}")
        logger.error(f"Transaction data: {tx}")
        raise  # Re-raise the exception to see the full stack trace
