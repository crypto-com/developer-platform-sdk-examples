import time
from eth_abi import encode
from eth_utils import remove_0x_prefix
from web3 import Web3
from agent_config import logger, LimitType


def get_period_ids_for_transaction(
    session_config, target, selector=None, timestamp=None
):
    """
    Get period IDs for transaction, similar to TypeScript implementation.

    Args:
        session_config: Session configuration
        target: Target address
        selector: Function selector
        timestamp: Timestamp for the transaction

    Returns:
        List of period IDs
    """
    if timestamp is None:
        timestamp = int(time.time())

    # Function to get period ID based on limit type
    def get_id(limit):
        if limit["limitType"] == LimitType.Allowance and limit["period"] > 0:
            return int(timestamp / int(limit["period"]))
        return 0

    # Start with fee limit period ID
    period_ids = [get_id(session_config["feeLimit"])]

    # Check if this is a transfer (no selector) or a call
    is_transfer = (
        selector is None or len(selector) < 10
    )  # Selector should be at least 10 chars (0x + 8 chars)

    # Find matching policy
    if is_transfer:
        # Look for matching transfer policy
        policy = None
        for p in session_config.get("transferPolicies", []):
            if (
                p["target"].lower() == target.lower()
                or p["target"] == "0x0000000000000000000000000000000000000000"
            ):
                policy = p
                break

        if policy:
            # Add value limit period ID
            period_ids.append(get_id(policy["valueLimit"]))
        else:
            logger.warning(f"No matching transfer policy found for target {target}")
            # Return empty list if no matching policy
            return []
    else:
        # Look for matching call policy
        policy = None
        for p in session_config.get("callPolicies", []):
            if p["target"].lower() == target.lower() and (
                p["selector"].lower() == selector.lower()
                or p["selector"] == "0x00000000"
            ):
                policy = p
                break

        if policy:
            # Add value limit period ID
            period_ids.append(get_id(policy["valueLimit"]))

            # Add constraint limit period IDs
            for constraint in policy.get("constraints", []):
                period_ids.append(get_id(constraint["limit"]))
        else:
            logger.warning(
                f"No matching call policy found for target {target} and selector {selector}"
            )
            # Return empty list if no matching policy
            return []

    return period_ids


def encode_validator_data(session_data: dict) -> str:
    """
    Encode session transaction data to match the TypeScript implementation.
    Args:
        session_data: Dictionary containing sessionConfig, to, callData, and timestamp
    Returns:
        Encoded validator data as hex string
    """
    session_config = session_data["sessionConfig"]

    # First part: encode the session config data
    config_data = encode(
        [
            "(address,uint256,(uint8,uint256,uint256),bytes[],((address,uint256,(uint8,uint256,uint256))[]))",
            "uint64[]",
        ],
        [
            (
                Web3.to_checksum_address(session_config["signer"]),
                int(session_config["expiresAt"]),
                (
                    int(session_config["feeLimit"]["limitType"]),
                    int(session_config["feeLimit"]["limit"]),
                    int(session_config["feeLimit"]["period"]),
                ),
                [],  # callPolicies
                [
                    [
                        (
                            Web3.to_checksum_address(policy["target"]),
                            int(policy["maxValuePerUse"]),
                            (
                                int(policy["valueLimit"]["limitType"]),
                                int(policy["valueLimit"]["limit"]),
                                int(policy["valueLimit"]["period"]),
                            ),
                        )
                        for policy in session_config["transferPolicies"]
                    ]
                ],
            ),
            [],  # period_ids (empty for this example)
        ],
    )

    return "0x" + config_data.hex()
