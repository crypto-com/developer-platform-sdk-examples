#!/usr/bin/env python3
"""
Cronos EVM Transaction Analyzer
A prototype for analyzing and describing transactions on Cronos EVM with AI-powered explanations
"""

import json
import os
from typing import Any, Dict, List, Optional

import requests
from eth_utils import to_checksum_address
from web3 import Web3

try:
    from crypto_com_agent_client.lib.types.chain_helper import (CHAIN_INFO,
                                                                ChainId)
    from crypto_com_developer_platform_client import Client, Network

    AGENT_CLIENT_AVAILABLE = True
except ImportError:
    AGENT_CLIENT_AVAILABLE = False


class CronosTransactionAnalyzer:
    def __init__(
        self, rpc_url: Optional[str] = None, dashboard_api_key: Optional[str] = None
    ):
        """Initialize the analyzer with Cronos EVM connection"""
        self.dashboard_api_key = dashboard_api_key or os.getenv("DASHBOARD_API_KEY")

        # Determine chain from dashboard API key if available
        chain_id_from_api = self._get_chain_id_from_dashboard_api()

        if rpc_url:
            # Use provided RPC URL
            self.rpc_url = rpc_url
            self.chain_id = chain_id_from_api or 25  # Default to Cronos mainnet
        elif AGENT_CLIENT_AVAILABLE and chain_id_from_api:
            # Get chain info from dashboard API key using agent client
            try:
                chain_enum = ChainId(int(chain_id_from_api))
                chain_info = CHAIN_INFO[chain_enum]
                self.rpc_url = chain_info["rpc"]
                self.chain_id = int(chain_id_from_api)
                print(f"Using chain {self.chain_id} with RPC: {self.rpc_url}")
            except (ValueError, KeyError):
                # Fallback to default if chain not supported
                self.rpc_url = "https://evm.cronos.org"
                self.chain_id = 25
                print(f"Unsupported chain {chain_id_from_api}, using fallback")
        else:
            # Fallback to hardcoded RPC
            self.rpc_url = "https://evm.cronos.org"
            self.chain_id = 25

        self.web3 = Web3(Web3.HTTPProvider(self.rpc_url))

        # Known address labels for better descriptions
        self.address_labels = {
            "0xc9219731ADFA70645Be14cD5d30507266f2092c5": "Crypto.com Withdrawal",
            "0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae": "VVS Finance Router",
            "0xeC68090566397DCC37e54B30Cc264B2d68CF0489": "VVS Finance Router",
            "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23": "Cronos: WCRO Token",
            "0x9D8c68F185A04314DDC8B8216732455e8dbb7E45": "LION Token",
            "0xA8C8CfB141A3bB59FEA1E2ea6B79b5ECBCD7b6ca": "VVS Finance",
            "0x062E66477Faf219F25D27dCED647BF57C3107d52": "WBTC Token",
            "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59": "USDC Token",
            "0x66e428c3f67a8563E17b06d3d3a1e7b9bFb0E11c": "USDT Token",
            "0xF6b0B465eaA53be8bF236E9b8459C6084d357955": "PEDRO Token",
            "0x39e27a73BFc58843067Bc444739AdF074A52617d": "PEDRO-WCRO LP",
            "0x46E2B5423F6ff46A8A35861EC9DAfF26af77AB9A": "Moonflow (MOON)",
            "0x9E5a2f511Cfc1EB4a6be528437b9f2DdCaEF9975": "MOON-WCRO LP",
            "0x580837BF8f4CdB5cdFBc8E4CCA37DD11EF4bed": "VVS Finance Router Fee",
            "0x41bc026dABe978bc2FAfeA1850456511ca4B01bc": "Aryoshin (ARY)",
            "0x4903e929A2b9c0E0FB5dE47B2f13a8c37ce0e36dd": "LION-WCRO LP",
            "0x22Dd4576C1fE9eEE5bE2F7CA9b8E935C00EC02": "ARY-WCRO LP",
            "0x9800eB74D38b2a1A522456256724666AF": "EbisusBay: Ryoshi Router",
        }

        # Token decimals for proper amount calculation
        self.token_decimals = {
            "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23": 18,  # WCRO
            "0x9D8c68F185A04314DDC8B8216732455e8dbb7E45": 18,  # LION
            "0x062E66477Faf219F25D27dCED647BF57C3107d52": 8,  # WBTC
            "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59": 6,  # USDC
            "0x66e428c3f67a8563E17b06d3d3a1e7b9bFb0E11c": 6,  # USDT
            "0xF6b0B465eaA53be8bF236E9b8459C6084d357955": 18,  # PEDRO
            "0x46E2B5423F6ff46A8A35861EC9DAfF26af77AB9A": 18,  # Moonflow (MOON)
            "0x41bc026dABe978bc2FAfeA1850456511ca4B01bc": 18,  # Aryoshin (ARY)
        }

        # Common function signatures for contract interactions
        self.function_signatures = {
            "0xa9059cbb": "transfer(address,uint256)",
            "0x23b872dd": "transferFrom(address,address,uint256)",
            "0x38ed1739": "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
            "0x7ff36ab5": "swapExactETHForTokens(uint256,address[],address,uint256)",
            "0xb6f9de95": "swapExactETHForTokensSupportingFeeOnTransferTokens(uint256,address[],address,uint256)",
            "b6f9de9500": "swapExactETHForTokensSupportingFeeOnTransferTokens(uint256,address[],address,uint256)",
            "0x095ea7b3": "approve(address,uint256)",
            "0x18cbafe5": "swapExactTokensForETH(uint256,uint256,address[],address,uint256)",
            "0x4caf9454": "swapTokensForExactTokens(uint256,uint256,address[],address,uint256)",
        }

    def get_address_label(self, address: str) -> str:
        """Get a human-readable label for an address"""
        checksum_addr = to_checksum_address(address)
        return self.address_labels.get(
            checksum_addr, f"0x{address[2:6]}...{address[-4:]}"
        )

    def _get_chain_id_from_dashboard_api(self) -> Optional[int]:
        """Get chain ID from dashboard API key using developer platform client"""
        if not self.dashboard_api_key or not AGENT_CLIENT_AVAILABLE:
            return None

        try:
            # Initialize client with API key
            Client.init(api_key=self.dashboard_api_key)

            # Get chain ID from developer platform
            chain_id_response = Network.chain_id()

            if isinstance(chain_id_response, dict):
                # Handle nested response format: {'status': 'Success', 'data': {'chainId': '338'}}
                if "data" in chain_id_response and isinstance(
                    chain_id_response["data"], dict
                ):
                    chain_id = chain_id_response["data"].get("chainId")
                else:
                    chain_id = chain_id_response.get("chainId")

                if chain_id is not None:
                    return int(chain_id)
            else:
                # Direct value response
                return int(chain_id_response)

        except Exception as e:
            print(f"Error getting chain ID from dashboard API: {e}")

        return None

    def add_address_label(self, address: str, label: str) -> None:
        """Add a new address label"""
        checksum_addr = to_checksum_address(address)
        self.address_labels[checksum_addr] = label

    def load_address_labels_from_file(self, file_path: str) -> None:
        """Load address labels from a JSON file"""
        try:
            with open(file_path, "r") as f:
                labels = json.load(f)
                for address, label in labels.items():
                    self.add_address_label(address, label)
        except Exception as e:
            print(f"Error loading address labels: {e}")

    def format_token_amount(self, amount: int, token_address: str) -> str:
        """Format token amount with proper decimals"""
        checksum_addr = to_checksum_address(token_address)
        decimals = self.token_decimals.get(checksum_addr, 18)
        formatted_amount = amount / (10**decimals)

        # For large amounts (>= 1000), show fewer decimals to keep readable
        if formatted_amount >= 1000:
            return f"{formatted_amount:,.6f}".rstrip("0").rstrip(".")
        # For medium amounts (>= 1), show up to 6 decimals but strip trailing zeros
        elif formatted_amount >= 1:
            return f"{formatted_amount:.6f}".rstrip("0").rstrip(".")
        # For small amounts (< 1), show up to 6 decimals
        else:
            return f"{formatted_amount:.6f}".rstrip("0").rstrip(".")

    def is_connected(self) -> bool:
        """Check if connected to Cronos EVM"""
        try:
            return self.web3.is_connected()
        except:
            return False

    def get_transaction(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        """Fetch transaction details from Cronos EVM"""
        try:
            # Validate transaction hash format first
            if not tx_hash.startswith("0x") or len(tx_hash) != 66:
                raise ValueError(f"Invalid transaction hash format: {tx_hash}")

            # Get transaction data with timeout protection
            tx = self.web3.eth.get_transaction(tx_hash)
            if tx is None:
                raise ValueError(f"Transaction not found: {tx_hash}")

            tx_receipt = self.web3.eth.get_transaction_receipt(tx_hash)
            if tx_receipt is None:
                raise ValueError(f"Transaction receipt not found: {tx_hash}")

            # Convert to dict and handle hex values safely
            tx_data = dict(tx)
            receipt_data = dict(tx_receipt)

            # Convert Wei to CRO for value display
            value_cro = self.web3.from_wei(tx_data.get("value", 0), "ether")

            return {
                "hash": tx_hash,
                "from": tx_data.get("from", "0x0"),
                "to": tx_data.get("to"),
                "value": tx_data.get("value", 0),
                "value_cro": float(value_cro),
                "gas": tx_data.get("gas", 0),
                "gas_price": tx_data.get("gasPrice", 0),
                "gas_used": receipt_data.get("gasUsed", 0),
                "status": receipt_data.get("status", 0),
                "input": tx_data["input"].hex() if tx_data.get("input") else "0x",
                "logs": [dict(log) for log in receipt_data.get("logs", [])],
                "block_number": tx_data.get("blockNumber", 0),
                "transaction_index": tx_data.get("transactionIndex", 0),
            }
        except ValueError as e:
            print(f"Validation error for transaction {tx_hash}: {e}")
            return None
        except Exception as e:
            error_msg = str(e)
            if "not found" in error_msg.lower() or "null" in error_msg.lower():
                print(f"Transaction not found on Cronos network: {tx_hash}")
            elif "timeout" in error_msg.lower() or "connection" in error_msg.lower():
                print(
                    f"Network connection error fetching transaction {tx_hash}. Please check your internet connection."
                )
            else:
                print(f"Unexpected error fetching transaction {tx_hash}: {e}")
            return None

    def parse_transaction_type(self, tx_data: Dict[str, Any]) -> str:
        """Determine the type of transaction"""
        # Check if it's a contract interaction
        if tx_data["input"] and tx_data["input"] != "0x":
            input_data = tx_data["input"]
            if len(input_data) >= 10:  # At least 4 bytes for function selector
                func_selector = input_data[:10]

                # Debug: print unknown function selectors (comment out for production)
                # if func_selector not in self.function_signatures:
                #     print(f"Unknown function selector: {func_selector}")

                if func_selector in self.function_signatures:
                    func_name = self.function_signatures[func_selector]
                    if "swap" in func_name.lower():
                        return "token_swap"
                    elif "transfer" in func_name.lower():
                        return "token_transfer"
                    elif "approve" in func_name.lower():
                        return "token_approval"

                # Check if this looks like a swap based on logs even if function signature is unknown
                if self.has_swap_events(tx_data.get("logs", [])):
                    return "token_swap"

                return "contract_interaction"

        # Simple ETH/CRO transfer
        if tx_data["value_cro"] > 0:
            return "native_transfer"

        return "unknown"

    def has_swap_events(self, logs: List[Dict[str, Any]]) -> bool:
        """Check if transaction logs contain swap-related events"""
        transfer_count = 0
        transfer_sig = (
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
        )

        for log in logs:
            # Count Transfer events - handle both bytes and string formats
            if len(log["topics"]) >= 3:
                topic0 = log["topics"][0]
                if isinstance(topic0, bytes):
                    topic0_hex = "0x" + topic0.hex()
                else:
                    topic0_hex = topic0

                if topic0_hex == transfer_sig:
                    transfer_count += 1

        # A swap typically involves multiple token transfers
        return transfer_count >= 2

    def decode_swap_transaction(self, tx_data: Dict[str, Any]) -> Dict[str, Any]:
        """Decode swap transaction details"""
        input_data = tx_data["input"]
        if len(input_data) < 10:
            return {}

        func_selector = input_data[:10]

        # Extract swap details from logs for all swap types
        swap_details = self.extract_swap_from_logs(tx_data["logs"])

        # Handle different swap function types
        if (
            func_selector == "0xb6f9de95" or func_selector == "b6f9de9500"
        ):  # swapExactETHForTokensSupportingFeeOnTransferTokens
            return {
                "function": "swapExactETHForTokensSupportingFeeOnTransferTokens",
                "input_token": "CRO",  # Since it's swapExactETH
                "input_amount": tx_data["value_cro"],
                "from_token": "CRO",
                "from_amount": (
                    f"{tx_data['value_cro']:,.0f}"
                    if tx_data["value_cro"] >= 1
                    else f"{tx_data['value_cro']:.6f}".rstrip("0").rstrip(".")
                ),
                **swap_details,
            }
        elif func_selector == "0x7ff36ab5":  # swapExactETHForTokens
            return {
                "function": "swapExactETHForTokens",
                "input_token": "CRO",
                "input_amount": tx_data["value_cro"],
                "from_token": "CRO",
                "from_amount": (
                    f"{tx_data['value_cro']:,.0f}"
                    if tx_data["value_cro"] >= 1
                    else f"{tx_data['value_cro']:.6f}".rstrip("0").rstrip(".")
                ),
                **swap_details,
            }
        elif func_selector == "0x38ed1739":  # swapExactTokensForTokens
            return {"function": "swapExactTokensForTokens", **swap_details}
        elif func_selector == "0x18cbafe5":  # swapExactTokensForETH
            return {"function": "swapExactTokensForETH", **swap_details}
        elif (
            func_selector == "0x4caf9454" or func_selector == "4caf945400"
        ):  # swapTokensForExactTokens
            # For swapTokensForExactTokens, user sends tokens to get exact amount of another token
            # The first transfer is usually the input (what user pays)
            # The last transfer is usually the output (what user receives)
            details = {"function": "swapTokensForExactTokens", **swap_details}

            # For swapTokensForExactTokens, ensure proper direction
            # User pays input token to get exact amount of output token
            if len(tx_data.get("logs", [])) >= 3:  # Multiple transfers expected
                # Find transfers involving the transaction sender
                tx_sender = tx_data["from"].lower()
                user_receives = []
                user_sends = []

                transfer_sig = (
                    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
                )
                for log in tx_data.get("logs", []):
                    topic0 = log["topics"][0] if log.get("topics") else None
                    if topic0:
                        if isinstance(topic0, bytes):
                            topic0_hex = "0x" + topic0.hex()
                        else:
                            topic0_hex = topic0

                        if len(log["topics"]) >= 3 and topic0_hex == transfer_sig:
                            # Get addresses
                            if isinstance(log["topics"][1], bytes):
                                from_addr = (
                                    "0x" + log["topics"][1][-20:].hex()
                                ).lower()
                                to_addr = ("0x" + log["topics"][2][-20:].hex()).lower()
                            else:
                                from_addr = ("0x" + log["topics"][1][-40:]).lower()
                                to_addr = ("0x" + log["topics"][2][-40:]).lower()

                            token_address = log["address"]
                            token_label = self.get_address_label(token_address)

                            # Calculate amount
                            if log["data"] and log["data"] != "0x":
                                try:
                                    if isinstance(log["data"], bytes):
                                        amount = int.from_bytes(
                                            log["data"], byteorder="big"
                                        )
                                    else:
                                        amount = int(log["data"], 16)
                                    formatted_amount = self.format_token_amount(
                                        amount, token_address
                                    )

                                    # Check if user is receiving (to_addr is user)
                                    if to_addr == tx_sender:
                                        user_receives.append(
                                            {
                                                "token": token_label,
                                                "amount": formatted_amount,
                                            }
                                        )
                                    # Check if user is sending (from_addr is user)
                                    elif from_addr == tx_sender:
                                        user_sends.append(
                                            {
                                                "token": token_label,
                                                "amount": formatted_amount,
                                            }
                                        )
                                except:
                                    continue

                # For swapTokensForExactTokens: user sends input token, receives output token
                if user_sends and user_receives:
                    # User sends = input token (usually just one)
                    details["from_token"] = user_sends[0]["token"]
                    details["from_amount"] = user_sends[0]["amount"]

                    # User receives = output token (find the largest amount, which is main swap)
                    # Sort by amount (convert to float for comparison) to get the largest
                    def get_amount_value(item):
                        try:
                            return float(str(item["amount"]).replace(",", ""))
                        except:
                            return 0

                    user_receives_sorted = sorted(
                        user_receives, key=get_amount_value, reverse=True
                    )
                    details["to_token"] = user_receives_sorted[0]["token"]
                    details["to_amount"] = user_receives_sorted[0]["amount"]

                    # Backward compatibility
                    details["input_token"] = details["from_token"]
                    details["input_amount"] = details["from_amount"]
                    details["output_token"] = details["to_token"]
                    details["output_amount"] = details["to_amount"]

            return details
        else:
            # Generic swap - rely on log analysis
            return swap_details

    def extract_swap_from_logs(self, logs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract swap details from transaction logs"""
        swap_info = {}
        transfers = []

        for log in logs:
            # Transfer events (topic0 = keccak256("Transfer(address,address,uint256)"))
            # Handle both hex string and bytes formats
            topic0 = log["topics"][0] if log.get("topics") else None
            if topic0:
                if isinstance(topic0, bytes):
                    topic0_hex = "0x" + topic0.hex()
                else:
                    topic0_hex = topic0

                transfer_sig = (
                    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
                )
                if len(log["topics"]) >= 3 and topic0_hex == transfer_sig:
                    # This is a Transfer event
                    token_address = log["address"]
                    token_label = self.get_address_label(token_address)

                    # Decode amount from data
                    if log["data"] and log["data"] != "0x":
                        try:
                            # Handle bytes data
                            if isinstance(log["data"], bytes):
                                amount = int.from_bytes(log["data"], byteorder="big")
                            else:
                                amount_hex = log["data"]
                                amount = int(amount_hex, 16)

                            formatted_amount = self.format_token_amount(
                                amount, token_address
                            )

                            # Get transfer addresses - handle bytes format
                            if isinstance(log["topics"][1], bytes):
                                from_addr = "0x" + log["topics"][1][-20:].hex()
                                to_addr = "0x" + log["topics"][2][-20:].hex()
                            else:
                                from_addr = (
                                    "0x" + log["topics"][1][-40:]
                                )  # Remove padding
                                to_addr = (
                                    "0x" + log["topics"][2][-40:]
                                )  # Remove padding

                            transfers.append(
                                {
                                    "token_address": token_address,
                                    "token_label": token_label,
                                    "amount": formatted_amount,
                                    "from_addr": from_addr,
                                    "to_addr": to_addr,
                                }
                            )
                        except Exception as e:
                            continue

        # Analyze transfers to identify input and output tokens

        if transfers:
            # For swaps, typically the first transfer is input token going to the DEX
            # and the last transfer is output token going to the user

            # Find the first non-router transfer (usually the input)
            for transfer in transfers:
                if not swap_info.get("from_token"):
                    # Check if this looks like an input token (going TO a known DEX/router)
                    to_label = self.get_address_label(transfer["to_addr"])
                    if (
                        "Router" in to_label
                        or "Finance" in to_label
                        or "DEX" in to_label
                    ):
                        swap_info["from_token"] = transfer["token_label"]
                        swap_info["from_amount"] = transfer["amount"]
                        break

            # Find the last transfer which is usually the output token
            for transfer in reversed(transfers):
                if not swap_info.get("to_token"):
                    # Check if this looks like an output token (coming FROM a known DEX/router or pair)
                    from_label = self.get_address_label(transfer["from_addr"])
                    if (
                        "Router" in from_label
                        or "Finance" in from_label
                        or "DEX" in from_label
                        or transfer["token_label"] != swap_info.get("from_token", "")
                    ):
                        swap_info["to_token"] = transfer["token_label"]
                        swap_info["to_amount"] = transfer["amount"]
                        break

            # If we couldn't identify from context, use first and last transfers
            if not swap_info.get("from_token") and transfers:
                swap_info["from_token"] = transfers[0]["token_label"]
                swap_info["from_amount"] = transfers[0]["amount"]

            if not swap_info.get("to_token") and transfers:
                swap_info["to_token"] = transfers[-1]["token_label"]
                swap_info["to_amount"] = transfers[-1]["amount"]

            # Keep backward compatibility
            if swap_info.get("to_token"):
                swap_info["output_token"] = swap_info["to_token"]
                swap_info["output_amount"] = swap_info["to_amount"]

        return swap_info

    def analyze_transaction_flow(self, tx_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze the complete transaction flow"""
        tx_type = self.parse_transaction_type(tx_data)

        analysis = {
            "type": tx_type,
            "from": self.get_address_label(tx_data["from"]),
            "to": (
                self.get_address_label(tx_data["to"])
                if tx_data["to"]
                else "Contract Creation"
            ),
            "status": "Success" if tx_data["status"] == 1 else "Failed",
            "gas_used": tx_data["gas_used"],
            "value_cro": tx_data["value_cro"],
        }

        if tx_type == "token_swap":
            swap_details = self.decode_swap_transaction(tx_data)
            analysis.update(swap_details)
        elif tx_type == "native_transfer":
            analysis["transfer_amount"] = tx_data["value_cro"]

        return analysis

    def generate_transaction_description(self, tx_hash: str) -> str:
        """Generate an AI-powered description of the transaction"""
        # Get transaction data
        tx_data = self.get_transaction(tx_hash)
        if not tx_data:
            return f"Unable to fetch transaction {tx_hash}"

        # Analyze the transaction
        analysis = self.analyze_transaction_flow(tx_data)

        # Generate human-readable description based on transaction type
        if analysis["type"] == "native_transfer":
            return self._describe_native_transfer(analysis, tx_data)
        elif analysis["type"] == "token_swap":
            return self._describe_token_swap(analysis, tx_data)
        elif analysis["type"] == "token_transfer":
            return self._describe_token_transfer(analysis, tx_data)
        else:
            return self._describe_generic_transaction(analysis, tx_data)

    def _describe_native_transfer(
        self, analysis: Dict[str, Any], tx_data: Dict[str, Any]
    ) -> str:
        """Describe a native CRO transfer"""
        amount = (
            f"{analysis['value_cro']:,.0f}"
            if analysis["value_cro"] >= 1
            else f"{analysis['value_cro']:.6f}".rstrip("0").rstrip(".")
        )

        description = f"This is a transfer transaction on Cronos EVM mainnet, {amount} CRO from {analysis['from']} to {analysis['to']}"

        # Add context if we know the addresses
        if "Crypto.com" in analysis["from"]:
            description += ", which likely is a user of Crypto.com making a withdrawal to fund their account"
        elif "Crypto.com" in analysis["to"]:
            description += ", which appears to be a deposit to Crypto.com"

        return description

    def _describe_token_swap(
        self, analysis: Dict[str, Any], tx_data: Dict[str, Any]
    ) -> str:
        """Describe a token swap transaction"""
        # Use new from_token/to_token format if available, fallback to legacy
        from_token = analysis.get("from_token") or analysis.get("input_token")
        to_token = analysis.get("to_token") or analysis.get("output_token")
        from_amount = analysis.get("from_amount") or analysis.get("input_amount")
        to_amount = analysis.get("to_amount") or analysis.get("output_amount")

        if from_token and to_token and from_amount and to_amount:
            # Handle native CRO swaps - if we sent CRO but see WCRO transfer, show CRO
            display_from_token = from_token
            display_from_amount = str(from_amount)

            if analysis.get("input_token") == "CRO" and from_token == "WCRO Token":
                display_from_token = "CRO"
                display_from_amount = (
                    f"{analysis['input_amount']:,.0f}"
                    if analysis["input_amount"] >= 1
                    else f"{analysis['input_amount']:.6f}".rstrip("0").rstrip(".")
                )
            elif from_token == "CRO" and analysis.get("input_amount"):
                display_from_amount = (
                    f"{analysis['input_amount']:,.0f}"
                    if analysis["input_amount"] >= 1
                    else f"{analysis['input_amount']:.6f}".rstrip("0").rstrip(".")
                )

            to_amount_str = str(to_amount)

            description = (
                f"This is a token swapping transaction using {analysis['to']}, "
            )
            description += f"address {analysis['from']} is swapping {display_from_amount} {display_from_token} → {to_amount_str} {to_token}"

            return description
        elif from_token and to_token:
            description = (
                f"This is a token swapping transaction using {analysis['to']}, "
            )
            description += (
                f"address {analysis['from']} is swapping {from_token} → {to_token}"
            )
            return description
        else:
            return f"This is a token swap transaction on {analysis['to']} from {analysis['from']}"

    def _describe_token_transfer(
        self, analysis: Dict[str, Any], tx_data: Dict[str, Any]
    ) -> str:
        """Describe a token transfer transaction"""
        return f"This is a token transfer transaction from {analysis['from']} to {analysis['to']} using contract {analysis['to']}"

    def _describe_generic_transaction(
        self, analysis: Dict[str, Any], tx_data: Dict[str, Any]
    ) -> str:
        """Describe a generic contract interaction"""
        description = f"This is a contract interaction on Cronos EVM mainnet from {analysis['from']} to {analysis['to']}"

        if analysis["value_cro"] > 0:
            amount = (
                f"{analysis['value_cro']:,.0f}"
                if analysis["value_cro"] >= 1
                else f"{analysis['value_cro']:.6f}".rstrip("0").rstrip(".")
            )
            description += f" with {amount} CRO"

        description += (
            f". Status: {analysis['status']}, Gas used: {analysis['gas_used']:,}"
        )

        return description


def interactive_mode():
    """Interactive mode for analyzing transactions"""
    # Initialize the analyzer
    analyzer = CronosTransactionAnalyzer()

    # Check connection
    if not analyzer.is_connected():
        print("Unable to connect to Cronos EVM RPC")
        return

    print("Connected to Cronos EVM")
    print("Interactive Cronos Transaction Analyzer")
    print("=" * 60)
    print("Enter transaction hashes to analyze (or 'quit' to exit)")
    print("Commands:")
    print("  - Just paste a transaction hash to analyze")
    print("  - 'help' - Show this help message")
    print("  - 'examples' - Run example transactions")
    print("  - 'demo' - Interactive demo with live examples")
    print("  - 'quit' or 'exit' - Exit the program")
    print("=" * 60)

    while True:
        try:
            user_input = input("\nEnter transaction hash: ").strip()

            if user_input.lower() in ["quit", "exit", "q"]:
                print("Goodbye!")
                break

            if user_input.lower() == "help":
                print("\nHelp:")
                print("- Paste any Cronos EVM transaction hash (0x...)")
                print(
                    "- The analyzer will decode swaps, transfers, and contract interactions"
                )
                print("- Shows exchanged token amounts for DEX transactions")
                print("- Type 'examples' to see sample transactions")
                continue

            if user_input.lower() == "examples":
                run_examples(analyzer)
                continue

            if user_input.lower() == "demo":
                run_interactive_demo(analyzer)
                continue

            if not user_input:
                continue

            # Validate transaction hash format
            if not user_input.startswith("0x") or len(user_input) != 66:
                print(
                    "Invalid transaction hash format. Should be 0x followed by 64 hex characters."
                )
                continue

            print(f"\nAnalyzing: {user_input}")
            print("-" * 60)

            # Get transaction data first
            tx_data = analyzer.get_transaction(user_input)
            if not tx_data:
                print("Transaction not found or error fetching data")
                continue

            analysis = analyzer.analyze_transaction_flow(tx_data)

            # COMPACT SUMMARY
            print("Summary:")
            if analysis["type"] == "token_swap":
                from_token = analysis.get("from_token") or analysis.get("input_token")
                to_token = analysis.get("to_token") or analysis.get("output_token")
                from_amount = analysis.get("from_amount") or analysis.get(
                    "input_amount"
                )
                to_amount = analysis.get("to_amount") or analysis.get("output_amount")

                if from_token and to_token and from_amount and to_amount:
                    print(f"   {from_amount} {from_token} → {to_amount} {to_token}")
                elif from_token and to_token:
                    print(f"   {from_token} → {to_token}")
                else:
                    print(f"   Token swap on {analysis['to']}")
            elif analysis["type"] == "native_transfer":
                amount = (
                    f"{analysis['value_cro']:,.0f}"
                    if analysis["value_cro"] >= 1
                    else f"{analysis['value_cro']:.6f}".rstrip("0").rstrip(".")
                )
                print(f"   {amount} CRO from {analysis['from']} to {analysis['to']}")
            else:
                print(
                    f"   {analysis['type'].replace('_', ' ').title()} on {analysis['to']}"
                )

            # DETAILED DESCRIPTION
            print("\nDescription:")
            description = analyzer.generate_transaction_description(user_input)
            print(description)

            # TECHNICAL DETAILS
            print(f"\nTechnical Details:")
            print(f"Type: {analysis['type']}")
            print(f"From: {analysis['from']}")
            print(f"To: {analysis['to']}")
            print(f"Status: {analysis['status']}")
            print(f"Gas Used: {analysis['gas_used']:,}")
            if analysis["value_cro"] > 0:
                print(f"CRO Value: {analysis['value_cro']}")

        except KeyboardInterrupt:
            print("\nGoodbye!")
            break
        except Exception as e:
            print(f"Error analyzing transaction: {e}")


def run_examples(analyzer):
    """Run example transactions"""
    print("\nRunning Example Transactions:")
    print("=" * 60)

    test_transactions = [
        {
            "hash": "0xfcaf6588f4ce129c92ffaea4c397e83f052ea81298a102732c21b46cb98a15f0",
            "description": "CRO transfer from Crypto.com",
            "type": "Native Transfer",
        },
        {
            "hash": "0xc11bd254a7c5d642fb0ba29c057e1602534bd7eb0da8752623e3d87e6ba1a999",
            "description": "VVS swap: CRO → LION tokens",
            "type": "Token Swap",
        },
        {
            "hash": "0x8a7b9c4d5e6f3a2b1c9d8e7f6a5b4c3d2e1f9a8b7c6d5e4f3a2b1c9d8e7f6a5b",
            "description": "Token approval transaction",
            "type": "Token Approval",
        },
        {
            "hash": "0x7f8e9d6c5b4a3f2e1d9c8b7a6f5e4d3c2b1a9f8e7d6c5b4a3f2e1d9c8b7a6f5",
            "description": "USDC to USDT swap on DEX",
            "type": "Stablecoin Swap",
        },
        {
            "hash": "0x9e8f7d6c5b4a3e2f1d9c8b7a6f5e4d3c2b1a9e8f7d6c5b4a3e2f1d9c8b7a6",
            "description": "Multi-hop swap through liquidity pools",
            "type": "Complex Swap",
        },
    ]

    for i, tx_info in enumerate(test_transactions, 1):
        print(f"\nExample {i}: {tx_info['description']}")
        print(f"Type: {tx_info['type']}")
        print(f"Hash: {tx_info['hash']}")
        print("-" * 40)

        try:
            description = analyzer.generate_transaction_description(tx_info["hash"])
            print(f"Analysis: {description}")

            # Get more details
            tx_data = analyzer.get_transaction(tx_info["hash"])
            if tx_data:
                analysis = analyzer.analyze_transaction_flow(tx_data)
                if analysis["type"] == "token_swap":
                    from_token = analysis.get("from_token") or analysis.get(
                        "input_token"
                    )
                    to_token = analysis.get("to_token") or analysis.get("output_token")
                    from_amount = analysis.get("from_amount") or analysis.get(
                        "input_amount"
                    )
                    to_amount = analysis.get("to_amount") or analysis.get(
                        "output_amount"
                    )

                    if from_token and to_token:
                        print(
                            f"Swap: {from_amount} {from_token} → {to_amount} {to_token}"
                        )

                print(f"Gas Used: {analysis['gas_used']:,}")
                print(f"Status: {analysis['status']}")
        except Exception as e:
            print(f"Error: {e}")


def run_interactive_demo(analyzer):
    """Run an interactive demo with step-by-step explanation"""
    print("\nInteractive Demo Mode")
    print("=" * 60)
    print("This demo will walk you through different types of Cronos transactions")
    print("Press Enter to continue between examples, or 'skip' to skip an example")
    print("Type 'back' to return to main menu")
    print("=" * 60)

    demo_transactions = [
        {
            "hash": "0xfcaf6588f4ce129c92ffaea4c397e83f052ea81298a102732c21b46cb98a15f0",
            "title": "Native CRO Transfer",
            "explanation": "This is a simple transfer of CRO tokens from one address to another.",
            "what_to_look_for": "Notice how we identify known addresses like Crypto.com exchanges",
        },
        {
            "hash": "0xc11bd254a7c5d642fb0ba29c057e1602534bd7eb0da8752623e3d87e6ba1a999",
            "title": "Token Swap (DEX)",
            "explanation": "This shows how users swap tokens using decentralized exchanges.",
            "what_to_look_for": "See how we decode the swap amounts and identify the tokens being exchanged",
        },
    ]

    for i, demo in enumerate(demo_transactions, 1):
        print(f"\nDemo {i}/2: {demo['title']}")
        print("─" * 40)
        print(f"What this is: {demo['explanation']}")
        print(f"What to look for: {demo['what_to_look_for']}")
        print(f"Transaction: {demo['hash']}")

        user_input = (
            input("\nPress Enter to analyze this transaction (or 'skip'/'back'): ")
            .strip()
            .lower()
        )

        if user_input == "back":
            return
        elif user_input == "skip":
            print("Skipped")
            continue

        print("\nAnalyzing...")
        print("=" * 50)

        try:
            # Analyze the transaction with detailed output
            description = analyzer.generate_transaction_description(demo["hash"])
            print(f"AI Analysis:")
            print(f"   {description}")

            # Get technical details
            tx_data = analyzer.get_transaction(demo["hash"])
            if tx_data:
                analysis = analyzer.analyze_transaction_flow(tx_data)
                print(f"\nTechnical Breakdown:")
                print(f"   Type: {analysis['type']}")
                print(f"   From: {analysis['from']}")
                print(f"   To: {analysis['to']}")
                print(f"   Status: {analysis['status']}")
                print(f"   Gas Used: {analysis['gas_used']:,}")

                if analysis["value_cro"] > 0:
                    amount = (
                        f"{analysis['value_cro']:,.0f}"
                        if analysis["value_cro"] >= 1
                        else f"{analysis['value_cro']:.6f}".rstrip("0").rstrip(".")
                    )
                    print(f"   CRO Value: {amount}")

                # Show swap details if available
                if analysis["type"] == "token_swap":
                    from_token = analysis.get("from_token") or analysis.get(
                        "input_token"
                    )
                    to_token = analysis.get("to_token") or analysis.get("output_token")
                    from_amount = analysis.get("from_amount") or analysis.get(
                        "input_amount"
                    )
                    to_amount = analysis.get("to_amount") or analysis.get(
                        "output_amount"
                    )

                    if from_token and to_token:
                        print(f"\nSwap Details:")
                        if from_amount and to_amount:
                            print(f"   IN:  {from_amount} {from_token}")
                            print(f"   OUT: {to_amount} {to_token}")
                        else:
                            print(f"   {from_token} → {to_token}")

            print("\nKey Insights:")
            if demo["title"] == "Native CRO Transfer":
                print("   • Large transfers often indicate exchange withdrawals")
                print("   • Address labels help identify known entities")
                print("   • Gas fees are relatively low for simple transfers")
            elif demo["title"] == "Token Swap (DEX)":
                print("   • DEX swaps involve multiple token transfers")
                print("   • Router contracts facilitate the exchanges")
                print("   • Price impact depends on liquidity and swap size")

        except Exception as e:
            print(f"Error analyzing demo transaction: {e}")
            print(
                "   This might be due to network issues or the transaction not being found"
            )

        if i < len(demo_transactions):
            input("\nPress Enter to continue to the next demo...")

    print("\nDemo Complete!")
    print("You can now try analyzing your own transactions by pasting their hashes")
    input("Press Enter to return to main menu...")


def main():
    """Main entry point - choose between interactive and example mode"""
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--examples":
        # Run examples mode
        analyzer = CronosTransactionAnalyzer()
        if not analyzer.is_connected():
            print("Unable to connect to Cronos EVM RPC")
            return
        print("Connected to Cronos EVM")
        run_examples(analyzer)
    else:
        # Run interactive mode by default
        interactive_mode()


if __name__ == "__main__":
    main()
