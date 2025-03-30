#!/usr/bin/env python3
import time
from agent_config import logger, SESSION_KEY_MODULE_ABI, CONTRACTS, LimitType


def fetch_session_config(web3, address: str, signer_pub_key: str = None) -> dict:
    """
    Fetch the session configuration from the blockchain
    This implementation uses the events to find active sessions
    """
    try:
        display_address = address

        # Create contract instance for session module
        session_contract = web3.eth.contract(
            address=web3.to_checksum_address(CONTRACTS["session"]),
            abi=SESSION_KEY_MODULE_ABI,
        )

        # Get current block number for logging
        current_block = web3.eth.block_number

        # Try to fetch events from the session contract
        created_logs = []
        revoked_logs = []

        try:
            # Get created session events with account filter
            created_event_filter = session_contract.events.SessionCreated.create_filter(
                from_block=0,
                to_block="latest",
                argument_filters={"account": display_address},
            )
            created_logs = created_event_filter.get_all_entries()

            # Get revoked session events
            revoked_event_filter = session_contract.events.SessionRevoked.create_filter(
                from_block=0,
                to_block="latest",
                argument_filters={"account": display_address},
            )
            revoked_logs = revoked_event_filter.get_all_entries()
        except Exception as e:
            logger.error(f"Error fetching session events with account filter: {e}")
            created_logs = []
            revoked_logs = []

        # If no created sessions were found, try searching without args as a fallback
        if len(created_logs) == 0:
            try:
                # Try fetching a limited number of recent blocks first to reduce load
                current_block = web3.eth.block_number
                scan_from_block = max(
                    0, current_block - 1000
                )  # Look at last 1000 blocks

                # Get all created session events without account filter
                created_event_filter = (
                    session_contract.events.SessionCreated.create_filter(
                        from_block=scan_from_block, to_block=current_block
                    )
                )
                all_created_logs = created_event_filter.get_all_entries()

                # If no recent events, try scanning all blocks in smaller chunks
                if len(all_created_logs) == 0 and scan_from_block > 0:
                    # Scan in chunks to avoid timeout
                    chunk_size = 10000
                    from_block = 0
                    to_block = chunk_size

                    while from_block < scan_from_block and len(created_logs) == 0:
                        if to_block > scan_from_block:
                            to_block = scan_from_block

                        try:
                            chunk_event_filter = (
                                session_contract.events.SessionCreated.create_filter(
                                    from_block=from_block, to_block=to_block
                                )
                            )
                            chunk_logs = chunk_event_filter.get_all_entries()

                            if chunk_logs:
                                all_created_logs.extend(chunk_logs)
                        except Exception as e:
                            logger.error(
                                f"Error scanning blocks {from_block}-{to_block}: {e}"
                            )

                        from_block = to_block + 1
                        to_block = from_block + chunk_size

                # Manually filter for our address
                filtered_logs = []
                for log in all_created_logs:
                    try:
                        event_account = log["args"]["account"]
                        if (
                            event_account
                            and event_account.lower() == display_address.lower()
                        ):
                            filtered_logs.append(log)
                    except Exception as e:
                        logger.error(f"Error processing event: {e}")
                        continue

                if filtered_logs:
                    created_logs.extend(filtered_logs)

            except Exception as e:
                logger.error(f"Error in fallback search: {e}")

        # Check if we found any logs
        if len(created_logs) == 0:
            logger.error("No sessions found after all search attempts.")
            return None

        # Get the session hashes that have been revoked
        revoked_session_hashes = {
            log["args"]["sessionHash"].hex() for log in revoked_logs
        }

        # Current timestamp for checking expiration
        current_timestamp = int(time.time())

        # Filter out expired and revoked sessions
        active_sessions = []
        for log in created_logs:
            try:
                # Extract session data from AttributeDict structure
                args = log.get("args", {})
                account = args.get("account", None)
                session_hash = args.get("sessionHash", None)
                session_spec = args.get("sessionSpec", None)

                if not session_spec:
                    logger.error(f"Missing sessionSpec in log: {log}")
                    continue

                # Extract expiry time safely
                expiry_time = None
                if hasattr(session_spec, "get"):
                    # Dict-like
                    signer = session_spec.get("signer", None)
                    expiry_time = session_spec.get("expiresAt", 0)
                else:
                    # Try as tuple/list-like
                    try:
                        signer = session_spec[0] if len(session_spec) > 0 else None
                        expiry_time = session_spec[1] if len(session_spec) > 1 else 0
                    except (IndexError, TypeError) as e:
                        logger.error(f"Cannot access sessionSpec elements: {e}")
                        continue

                # Ensure expiry_time is an integer
                if not isinstance(expiry_time, int):
                    try:
                        expiry_time = int(expiry_time)
                    except (ValueError, TypeError) as e:
                        logger.error(
                            f"Cannot convert expiresAt to int: {expiry_time}, error: {e}"
                        )
                        expiry_time = 0

                is_not_expired = expiry_time > current_timestamp
                is_not_revoked = True

                if session_hash:
                    if hasattr(session_hash, "hex"):
                        hash_hex = session_hash.hex()
                    else:
                        hash_hex = session_hash
                    is_not_revoked = hash_hex not in revoked_session_hashes

                if not is_not_expired:
                    continue

                if not is_not_revoked:
                    continue

                # Parse the session and add it to active sessions
                parsed_session = parse_session_config(session_spec)

                active_sessions.append(
                    {
                        "session": parsed_session,
                        "session_hash": session_hash.hex() if session_hash else None,
                        "block_number": log.get("blockNumber", 0),
                    }
                )

            except Exception as parsing_error:
                logger.error(f"Error processing session: {parsing_error}")
                continue

        # Sort by block number (most recent first)
        active_sessions.sort(key=lambda x: x["block_number"], reverse=True)

        # Filter by signer public key if provided
        filtered_sessions = active_sessions
        if signer_pub_key and active_sessions:
            before_count = len(active_sessions)
            filtered_sessions = [
                s
                for s in active_sessions
                if s["session"]["signer"].lower() == signer_pub_key.lower()
            ]

        # Return the most recent session config or None if none found
        return filtered_sessions[0]["session"] if filtered_sessions else None

    except Exception as e:
        logger.error(f"Failed to fetch session config: {e}")
        import traceback

        logger.error(traceback.format_exc())
        return None


def parse_session_config(session_spec):
    """Parse the session configuration from the event data"""
    try:
        # Handle AttributeDict objects or dict-like structures
        if hasattr(session_spec, "__getitem__") and not isinstance(
            session_spec, (list, tuple)
        ):
            # This is a dictionary-like object (AttributeDict)
            signer = session_spec.get("signer", None)
            expires_at = session_spec.get("expiresAt", 0)
            fee_limit = session_spec.get("feeLimit", {})
            call_policies = session_spec.get("callPolicies", [])
            transfer_policies = session_spec.get("transferPolicies", [])

            # Parse fee limit
            if hasattr(fee_limit, "get"):
                fee_limit_parsed = {
                    "limitType": fee_limit.get("limitType", 0),
                    "limit": fee_limit.get("limit", 0),
                    "period": fee_limit.get("period", 0),
                }
            else:
                fee_limit_parsed = {
                    "limitType": fee_limit[0] if len(fee_limit) > 0 else 0,
                    "limit": fee_limit[1] if len(fee_limit) > 1 else 0,
                    "period": fee_limit[2] if len(fee_limit) > 2 else 0,
                }

            # Parse call policies
            call_policies_parsed = []
            for policy in call_policies:
                if hasattr(policy, "get"):
                    target = policy.get("target", None)
                    selector = policy.get("selector", None)
                    max_value_per_use = policy.get("maxValuePerUse", 0)
                    value_limit = policy.get("valueLimit", {})
                    constraints = policy.get("constraints", [])

                    # Parse value limit
                    if hasattr(value_limit, "get"):
                        value_limit_parsed = {
                            "limitType": value_limit.get("limitType", 0),
                            "limit": value_limit.get("limit", 0),
                            "period": value_limit.get("period", 0),
                        }
                    else:
                        value_limit_parsed = {
                            "limitType": value_limit[0] if len(value_limit) > 0 else 0,
                            "limit": value_limit[1] if len(value_limit) > 1 else 0,
                            "period": value_limit[2] if len(value_limit) > 2 else 0,
                        }

                    # Parse constraints
                    constraints_parsed = []
                    for constraint in constraints:
                        if hasattr(constraint, "get"):
                            condition = constraint.get("condition", 0)
                            index = constraint.get("index", 0)
                            ref_value = constraint.get("refValue", "")
                            limit = constraint.get("limit", {})

                            # Parse limit
                            if hasattr(limit, "get"):
                                limit_parsed = {
                                    "limitType": limit.get("limitType", 0),
                                    "limit": limit.get("limit", 0),
                                    "period": limit.get("period", 0),
                                }
                            else:
                                limit_parsed = {
                                    "limitType": limit[0] if len(limit) > 0 else 0,
                                    "limit": limit[1] if len(limit) > 1 else 0,
                                    "period": limit[2] if len(limit) > 2 else 0,
                                }
                        else:
                            condition, index, ref_value, limit = constraint
                            limit_parsed = {
                                "limitType": limit[0] if len(limit) > 0 else 0,
                                "limit": limit[1] if len(limit) > 1 else 0,
                                "period": limit[2] if len(limit) > 2 else 0,
                            }

                        # Handle ref_value
                        ref_value_str = (
                            ref_value.hex()
                            if hasattr(ref_value, "hex")
                            else str(ref_value)
                        )

                        constraints_parsed.append(
                            {
                                "condition": condition,
                                "index": index,
                                "refValue": ref_value_str,
                                "limit": limit_parsed,
                            }
                        )

                    # Handle selector
                    selector_str = (
                        selector.hex() if hasattr(selector, "hex") else str(selector)
                    )

                    call_policies_parsed.append(
                        {
                            "target": target,
                            "selector": selector_str,
                            "maxValuePerUse": max_value_per_use,
                            "valueLimit": value_limit_parsed,
                            "constraints": constraints_parsed,
                        }
                    )
                else:
                    # Original tuple format
                    target, selector, max_value_per_use, value_limit, constraints = (
                        policy
                    )

                    # Parse value limit
                    value_limit_parsed = {
                        "limitType": value_limit[0] if len(value_limit) > 0 else 0,
                        "limit": value_limit[1] if len(value_limit) > 1 else 0,
                        "period": value_limit[2] if len(value_limit) > 2 else 0,
                    }

                    # Parse constraints
                    constraints_parsed = []
                    for constraint in constraints:
                        condition, index, ref_value, limit = constraint
                        limit_parsed = {
                            "limitType": limit[0] if len(limit) > 0 else 0,
                            "limit": limit[1] if len(limit) > 1 else 0,
                            "period": limit[2] if len(limit) > 2 else 0,
                        }
                        constraints_parsed.append(
                            {
                                "condition": condition,
                                "index": index,
                                "refValue": (
                                    ref_value.hex()
                                    if hasattr(ref_value, "hex")
                                    else str(ref_value)
                                ),
                                "limit": limit_parsed,
                            }
                        )

                    call_policies_parsed.append(
                        {
                            "target": target,
                            "selector": (
                                selector.hex()
                                if hasattr(selector, "hex")
                                else str(selector)
                            ),
                            "maxValuePerUse": max_value_per_use,
                            "valueLimit": value_limit_parsed,
                            "constraints": constraints_parsed,
                        }
                    )

            # Parse transfer policies
            transfer_policies_parsed = []
            for policy in transfer_policies:
                if hasattr(policy, "get"):
                    target = policy.get("target", None)
                    max_value_per_use = policy.get("maxValuePerUse", 0)
                    value_limit = policy.get("valueLimit", {})

                    if hasattr(value_limit, "get"):
                        value_limit_parsed = {
                            "limitType": value_limit.get("limitType", 0),
                            "limit": value_limit.get("limit", 0),
                            "period": value_limit.get("period", 0),
                        }
                    else:
                        value_limit_parsed = {
                            "limitType": value_limit[0] if len(value_limit) > 0 else 0,
                            "limit": value_limit[1] if len(value_limit) > 1 else 0,
                            "period": value_limit[2] if len(value_limit) > 2 else 0,
                        }
                else:
                    target, max_value_per_use, value_limit = policy
                    value_limit_parsed = {
                        "limitType": value_limit[0],
                        "limit": value_limit[1],
                        "period": value_limit[2],
                    }

                transfer_policies_parsed.append(
                    {
                        "target": target,
                        "maxValuePerUse": max_value_per_use,
                        "valueLimit": value_limit_parsed,
                    }
                )

        else:
            # Original tuple-like extraction
            signer, expires_at, fee_limit, call_policies, transfer_policies = (
                session_spec
            )

            # Parse fee limit
            fee_limit_parsed = {
                "limitType": fee_limit[0],
                "limit": fee_limit[1],
                "period": fee_limit[2],
            }

            # Parse call policies
            call_policies_parsed = []
            for policy in call_policies:
                target, selector, max_value_per_use, value_limit, constraints = policy

                # Parse value limit
                value_limit_parsed = {
                    "limitType": value_limit[0],
                    "limit": value_limit[1],
                    "period": value_limit[2],
                }

                # Parse constraints
                constraints_parsed = []
                for constraint in constraints:
                    condition, index, ref_value, limit = constraint
                    limit_parsed = {
                        "limitType": limit[0],
                        "limit": limit[1],
                        "period": limit[2],
                    }
                    constraints_parsed.append(
                        {
                            "condition": condition,
                            "index": index,
                            "refValue": (
                                ref_value.hex()
                                if hasattr(ref_value, "hex")
                                else str(ref_value)
                            ),
                            "limit": limit_parsed,
                        }
                    )

                call_policies_parsed.append(
                    {
                        "target": target,
                        "selector": (
                            selector.hex()
                            if hasattr(selector, "hex")
                            else str(selector)
                        ),
                        "maxValuePerUse": max_value_per_use,
                        "valueLimit": value_limit_parsed,
                        "constraints": constraints_parsed,
                    }
                )

            # Parse transfer policies
            transfer_policies_parsed = []
            for policy in transfer_policies:
                target, max_value_per_use, value_limit = policy

                # Parse value limit
                value_limit_parsed = {
                    "limitType": value_limit[0],
                    "limit": value_limit[1],
                    "period": value_limit[2],
                }

                transfer_policies_parsed.append(
                    {
                        "target": target,
                        "maxValuePerUse": max_value_per_use,
                        "valueLimit": value_limit_parsed,
                    }
                )

        # Ensure expires_at is an integer
        if not isinstance(expires_at, int):
            try:
                expires_at = int(expires_at)
            except (ValueError, TypeError):
                logger.warning(
                    f"Could not convert expires_at to int: {expires_at}, using current time + 1 hour"
                )
                expires_at = int(time.time()) + 3600

        # Construct the session config
        parsed_config = {
            "signer": signer,
            "expiresAt": expires_at,
            "feeLimit": fee_limit_parsed,
            "callPolicies": call_policies_parsed,
            "transferPolicies": transfer_policies_parsed,
        }

        return parsed_config

    except Exception as e:
        logger.error(f"Error parsing session config: {e}")
        import traceback

        logger.error(traceback.format_exc())

        try:
            # Try to extract minimal info for a fallback config
            if hasattr(session_spec, "get"):
                signer = session_spec.get("signer", None)
                expires_at = session_spec.get("expiresAt", int(time.time()) + 3600)
            elif len(session_spec) >= 2:
                signer = session_spec[0]
                expires_at = session_spec[1]
            else:
                raise ValueError("Cannot determine session structure")

            if not isinstance(expires_at, int):
                expires_at = (
                    int(expires_at)
                    if expires_at is not None
                    else int(time.time()) + 3600
                )

            logger.warning(
                f"Returning minimal session config for {signer} due to parsing error"
            )
            return {
                "signer": signer,
                "expiresAt": expires_at,
                "feeLimit": {"limitType": 0, "limit": 0, "period": 0},
                "callPolicies": [],
                "transferPolicies": [],
            }
        except Exception as fallback_error:
            logger.error(f"Cannot create minimal config: {fallback_error}")
            logger.error(traceback.format_exc())
            return None
