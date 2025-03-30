import re
from agent_config import logger


def is_address(value):
    """Check if value is a valid Ethereum address."""
    if not isinstance(value, str):
        return False
    if not value.startswith("0x"):
        return False
    return len(value) == 42 and all(c in "0123456789abcdefABCDEF" for c in value[2:])


def size(hex_value):
    """Get the size in bytes of a hex value."""
    if not isinstance(hex_value, str) or not hex_value.startswith("0x"):
        raise ValueError(f"Expected hex string, got {hex_value}")
    # Subtract 2 for '0x' prefix and divide by 2 (since each byte is 2 hex chars)
    return (len(hex_value) - 2) // 2


def pad_hex(hex_value, dir="left", size=32):
    """Pad a hex value to a specific size."""
    if not isinstance(hex_value, str) or not hex_value.startswith("0x"):
        raise ValueError(f"Expected hex string, got {hex_value}")

    value = hex_value[2:]  # Remove '0x' prefix
    byte_length = len(value) // 2

    if byte_length > size:
        return hex_value

    # Calculate padding
    padding = "0" * (size * 2 - len(value))

    if dir == "right":
        padded = "0x" + value + padding
    else:  # 'left'
        padded = "0x" + padding + value

    return padded


def concat(hex_values):
    """Concatenate multiple hex values."""
    if not hex_values:
        return "0x"

    result = "0x"
    for hex_value in hex_values:
        if not isinstance(hex_value, str) or not hex_value.startswith("0x"):
            raise ValueError(f"Expected hex string, got {hex_value}")
        result += hex_value[2:]  # Skip '0x' prefix

    return result


def number_to_hex(number, size=32, signed=False):
    """Convert a number to a hex string."""
    if isinstance(number, bool):
        raise ValueError("Boolean is not a valid number")

    if isinstance(number, str):
        # Assume it's already a hex string or convertible
        if number.startswith("0x"):
            return pad_hex(number, size=size)
        try:
            number = int(number)
        except ValueError:
            raise ValueError(f"Cannot convert string '{number}' to number")

    # Handle int
    hex_value = hex(number & (2 ** (size * 8) - 1) if not signed else number)
    # Ensure '0x' prefix
    if hex_value.startswith("-"):
        # Handle negative numbers
        hex_value = hex((2 ** (size * 8)) + number)

    return pad_hex(hex_value, size=size)


def get_array_components(type_):
    """Extract array components from a type string."""
    matches = re.match(r"^(.*)\[(\d+)?\]$", type_)
    if matches:
        inner_type = matches.group(1)
        length = matches.group(2)
        return [int(length) if length else None, inner_type]
    return None


def encode_abi_params_values(params, values):
    """Encode the session transaction parameters following encodeAbiParameters pattern"""
    # Simple validation
    if len(params) != len(values):
        raise ValueError(
            f"Params length {len(params)} does not match values length {len(values)}"
        )

    prepared_params = prepare_params(params, values)

    data = encode_params(prepared_params)

    return data


def prepare_params(params, values):
    """Prepare parameters for encoding"""
    prepared_params = []
    for i in range(len(params)):
        prepared_params.append(prepare_param(params[i], values[i]))
    return prepared_params


def prepare_param(param, value):
    """Prepare a parameter for encoding, following the TS pattern"""
    # Handle array types
    array_components = get_array_components(param["type"]) if "type" in param else None
    if array_components:
        length, inner_type = array_components
        param_with_type = {"type": inner_type}
        if "components" in param:
            param_with_type["components"] = param["components"]
        return encode_array(value, length, param_with_type)

    # Handle types
    if param["type"] == "tuple":
        return encode_tuple(value, param)
    elif param["type"] == "address":
        return encode_address(value)
    elif param["type"] == "bool":
        return encode_bool(value)
    elif param["type"].startswith("uint") or param["type"].startswith("int"):
        signed = param["type"].startswith("int")
        return encode_number(value, signed)
    elif param["type"].startswith("bytes"):
        return encode_bytes(value, param)
    elif param["type"] == "string":
        return encode_string(value)
    else:
        raise ValueError(f"Invalid ABI encoding type: {param['type']}")


def encode_address(value):
    """Encode an address"""
    if not is_address(value):
        raise ValueError(f"Invalid address: {value}")
    return {"dynamic": False, "encoded": pad_hex(value.lower())}


def encode_bool(value):
    """Encode a boolean"""
    if not isinstance(value, bool):
        raise ValueError(f"Invalid boolean value: {value}")
    return {"dynamic": False, "encoded": pad_hex("0x01" if value else "0x00")}


def encode_number(value, signed=False):
    """Encode a number"""
    return {"dynamic": False, "encoded": number_to_hex(value, signed=signed)}


def encode_array(value, length, param):
    """Encode an array following TS pattern"""
    dynamic = length is None

    # Handle the case where value isn't a list
    if not isinstance(value, list):
        if isinstance(value, dict) and "type" not in value:
            value = [value]  # Wrap single object in a list
        else:
            raise ValueError(f"Invalid array value: {value}")

    # Check array length
    if not dynamic and len(value) != length:
        raise ValueError(f"Expected array length {length}, got {len(value)}")

    # Process array items
    has_dynamic_child = False
    prepared_params = []

    for item in value:
        prepared_param = prepare_param(param, item)
        if prepared_param["dynamic"]:
            has_dynamic_child = True
        prepared_params.append(prepared_param)

    # Handle encoding based on dynamic status
    if dynamic or has_dynamic_child:
        data = encode_params(prepared_params)
        if dynamic:
            length_hex = number_to_hex(len(prepared_params))
            encoded = concat([length_hex, data]) if prepared_params else length_hex
            return {"dynamic": True, "encoded": encoded}
        if has_dynamic_child:
            return {"dynamic": True, "encoded": data}

    # Static array with static items
    return {
        "dynamic": False,
        "encoded": concat([p["encoded"] for p in prepared_params]),
    }


def encode_bytes(value, param):
    """Encode bytes following TS pattern"""
    if not isinstance(value, str) or not value.startswith("0x"):
        raise ValueError(f"Invalid bytes value: {value}")

    # Check if we're dealing with a fixed or dynamic bytes type
    param_size_match = re.match(r"bytes(\d+)?", param["type"])
    param_size = param_size_match.group(1) if param_size_match else None
    bytes_size = size(value)

    if not param_size:  # Dynamic bytes
        value_padded = value
        if bytes_size % 32 != 0:
            padding_size = ((bytes_size + 31) // 32) * 32
            value_padded = pad_hex(value, dir="right", size=padding_size)

        return {
            "dynamic": True,
            "encoded": concat([number_to_hex(bytes_size), value_padded]),
        }
    else:  # Fixed bytes
        param_size_int = int(param_size)
        if bytes_size != param_size_int:
            raise ValueError(
                f"Expected bytes{param_size} size {param_size_int}, got {bytes_size}"
            )

        return {"dynamic": False, "encoded": pad_hex(value, dir="right")}


def encode_string(value):
    """Encode a string following TS pattern"""
    if not isinstance(value, str):
        raise ValueError(f"Invalid string value: {value}")

    # Convert to hex
    hex_value = "0x" + value.encode("utf-8").hex()
    hex_size = size(hex_value)

    # Prepare parts
    parts_length = (hex_size + 31) // 32  # Ceiling division
    parts = []

    for i in range(parts_length):
        part_start = i * 32
        part_end = min((i + 1) * 32, hex_size)
        part = "0x" + hex_value[2 + part_start * 2 : 2 + part_end * 2]
        parts.append(pad_hex(part, dir="right"))

    # Combine
    return {"dynamic": True, "encoded": concat([number_to_hex(hex_size), *parts])}


def encode_tuple(value, param):
    """Encode a tuple following TS pattern"""
    has_dynamic = False
    prepared_params = []

    for i, component in enumerate(param["components"]):
        # Get the value using either index (array) or name (object)
        if isinstance(value, list):
            component_value = value[i]
        else:
            # Use name if available, otherwise use index
            component_name = component.get("name")
            if component_name and component_name in value:
                component_value = value[component_name]
            else:
                component_value = value[i] if i < len(value) else None

        prepared_param = prepare_param(component, component_value)
        if prepared_param["dynamic"]:
            has_dynamic = True
        prepared_params.append(prepared_param)

    # Return based on whether any components are dynamic
    return {
        "dynamic": has_dynamic,
        "encoded": (
            encode_params(prepared_params)
            if has_dynamic
            else concat([p["encoded"] for p in prepared_params])
        ),
    }


def encode_params(prepared_params):
    """Encode prepared parameters"""
    # Calculate static part size
    static_size = 0
    for param in prepared_params:
        static_size += 32 if param["dynamic"] else size(param["encoded"])

    # Split into static and dynamic parts
    static_parts = []
    dynamic_parts = []
    dynamic_size = 0

    for param in prepared_params:
        if param["dynamic"]:
            static_parts.append(number_to_hex(static_size + dynamic_size))
            dynamic_parts.append(param["encoded"])
            dynamic_size += size(param["encoded"])
        else:
            static_parts.append(param["encoded"])

    # Concatenate
    return concat(static_parts + dynamic_parts)


def get_session_params():
    """Return the standard session parameters structure"""
    return [
        {
            "components": [
                {"type": "address", "name": "signer"},
                {"type": "uint256", "name": "expiresAt"},
                {
                    "components": [
                        {"type": "uint8", "name": "limitType"},
                        {"type": "uint256", "name": "limit"},
                        {"type": "uint256", "name": "period"},
                    ],
                    "type": "tuple",
                    "name": "feeLimit",
                },
                {
                    "components": [
                        {"type": "address", "name": "target"},
                        {"type": "bytes4", "name": "selector"},
                        {"type": "uint256", "name": "maxValuePerUse"},
                        {
                            "components": [
                                {"type": "uint8", "name": "limitType"},
                                {"type": "uint256", "name": "limit"},
                                {"type": "uint256", "name": "period"},
                            ],
                            "type": "tuple",
                            "name": "valueLimit",
                        },
                        {
                            "components": [
                                {"type": "uint8", "name": "condition"},
                                {"type": "uint64", "name": "index"},
                                {"type": "bytes32", "name": "refValue"},
                                {
                                    "components": [
                                        {"type": "uint8", "name": "limitType"},
                                        {"type": "uint256", "name": "limit"},
                                        {"type": "uint256", "name": "period"},
                                    ],
                                    "type": "tuple",
                                    "name": "limit",
                                },
                            ],
                            "type": "tuple[]",
                            "name": "constraints",
                        },
                    ],
                    "type": "tuple[]",
                    "name": "callPolicies",
                },
                {
                    "components": [
                        {"type": "address", "name": "target"},
                        {"type": "uint256", "name": "maxValuePerUse"},
                        {
                            "components": [
                                {"type": "uint8", "name": "limitType"},
                                {"type": "uint256", "name": "limit"},
                                {"type": "uint256", "name": "period"},
                            ],
                            "type": "tuple",
                            "name": "valueLimit",
                        },
                    ],
                    "type": "tuple[]",
                    "name": "transferPolicies",
                },
            ],
            "type": "tuple",
            "name": "sessionSpec",
        },
        {"type": "uint64[]"},
    ]
