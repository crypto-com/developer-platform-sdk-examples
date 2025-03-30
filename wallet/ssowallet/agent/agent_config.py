#!/usr/bin/env python3
import os
import logging
from web3 import Web3
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
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

# Contract addresses
CONTRACTS = {
    "session": "0xfebC82bBFC6FB8666AC45fa8a601DfA34Ce30710",
    "passkey": "0x0A019BD60E42b9d18413C710992B96E69dFFC5A0",
    "accountFactory": "0x381539B4FC39eAe0Eb848f52cCA93F168a0e955D",
    "accountPaymaster": "0xA7B450E91Bc126aa93C656750f9c940bfdc2f1e9",
}

# Environment variables
SESSION_KEY = os.getenv("SSO_WALLET_SESSION_KEY")
WALLET_ADDRESS = os.getenv("SSO_WALLET_ADDRESS")
TARGET_ADDRESS = os.getenv("TARGET_ADDRESS")
SESSION_PUBKEY = os.getenv("SSO_WALLET_SESSION_PUBKEY")

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(CHAIN["rpcUrls"]["default"]["http"][0]))

# Validate environment variables
if not all([SESSION_KEY, WALLET_ADDRESS, TARGET_ADDRESS]):
    raise ValueError(
        "Missing required environment variables: SSO_WALLET_SESSION_KEY, SSO_WALLET_ADDRESS, TARGET_ADDRESS"
    )

# Validate Web3 connection
if not w3.is_connected():
    raise ConnectionError(
        f"Failed to connect to RPC endpoint: {CHAIN['rpcUrls']['default']['http'][0]}"
    )

# Define constants for easier reference
SESSION_CONTRACT_ADDRESS = CONTRACTS["session"]
PAYMASTER_ADDRESS = CONTRACTS["accountPaymaster"]


# Enum definitions
class LimitType:
    Unlimited = 0
    Lifetime = 1
    Allowance = 2


class Condition:
    Unconstrained = 0
    Equal = 1
    Greater = 2
    Less = 3
    GreaterEqual = 4
    LessEqual = 5
    NotEqual = 6


# Load ABI for SessionKeyModule
SESSION_KEY_MODULE_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address",
                "name": "account",
                "type": "address",
            }
        ],
        "name": "Disabled",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address",
                "name": "account",
                "type": "address",
            }
        ],
        "name": "Inited",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address",
                "name": "account",
                "type": "address",
            },
            {
                "indexed": True,
                "internalType": "bytes32",
                "name": "sessionHash",
                "type": "bytes32",
            },
            {
                "components": [
                    {"internalType": "address", "name": "signer", "type": "address"},
                    {"internalType": "uint256", "name": "expiresAt", "type": "uint256"},
                    {
                        "components": [
                            {
                                "internalType": "enum SessionLib.LimitType",
                                "name": "limitType",
                                "type": "uint8",
                            },
                            {
                                "internalType": "uint256",
                                "name": "limit",
                                "type": "uint256",
                            },
                            {
                                "internalType": "uint256",
                                "name": "period",
                                "type": "uint256",
                            },
                        ],
                        "internalType": "struct SessionLib.UsageLimit",
                        "name": "feeLimit",
                        "type": "tuple",
                    },
                    {
                        "components": [
                            {
                                "internalType": "address",
                                "name": "target",
                                "type": "address",
                            },
                            {
                                "internalType": "bytes4",
                                "name": "selector",
                                "type": "bytes4",
                            },
                            {
                                "internalType": "uint256",
                                "name": "maxValuePerUse",
                                "type": "uint256",
                            },
                            {
                                "components": [
                                    {
                                        "internalType": "enum SessionLib.LimitType",
                                        "name": "limitType",
                                        "type": "uint8",
                                    },
                                    {
                                        "internalType": "uint256",
                                        "name": "limit",
                                        "type": "uint256",
                                    },
                                    {
                                        "internalType": "uint256",
                                        "name": "period",
                                        "type": "uint256",
                                    },
                                ],
                                "internalType": "struct SessionLib.UsageLimit",
                                "name": "valueLimit",
                                "type": "tuple",
                            },
                            {
                                "components": [
                                    {
                                        "internalType": "enum SessionLib.Condition",
                                        "name": "condition",
                                        "type": "uint8",
                                    },
                                    {
                                        "internalType": "uint64",
                                        "name": "index",
                                        "type": "uint64",
                                    },
                                    {
                                        "internalType": "bytes32",
                                        "name": "refValue",
                                        "type": "bytes32",
                                    },
                                    {
                                        "components": [
                                            {
                                                "internalType": "enum SessionLib.LimitType",
                                                "name": "limitType",
                                                "type": "uint8",
                                            },
                                            {
                                                "internalType": "uint256",
                                                "name": "limit",
                                                "type": "uint256",
                                            },
                                            {
                                                "internalType": "uint256",
                                                "name": "period",
                                                "type": "uint256",
                                            },
                                        ],
                                        "internalType": "struct SessionLib.UsageLimit",
                                        "name": "limit",
                                        "type": "tuple",
                                    },
                                ],
                                "internalType": "struct SessionLib.Constraint[]",
                                "name": "constraints",
                                "type": "tuple[]",
                            },
                        ],
                        "internalType": "struct SessionLib.CallSpec[]",
                        "name": "callPolicies",
                        "type": "tuple[]",
                    },
                    {
                        "components": [
                            {
                                "internalType": "address",
                                "name": "target",
                                "type": "address",
                            },
                            {
                                "internalType": "uint256",
                                "name": "maxValuePerUse",
                                "type": "uint256",
                            },
                            {
                                "components": [
                                    {
                                        "internalType": "enum SessionLib.LimitType",
                                        "name": "limitType",
                                        "type": "uint8",
                                    },
                                    {
                                        "internalType": "uint256",
                                        "name": "limit",
                                        "type": "uint256",
                                    },
                                    {
                                        "internalType": "uint256",
                                        "name": "period",
                                        "type": "uint256",
                                    },
                                ],
                                "internalType": "struct SessionLib.UsageLimit",
                                "name": "valueLimit",
                                "type": "tuple",
                            },
                        ],
                        "internalType": "struct SessionLib.TransferSpec[]",
                        "name": "transferPolicies",
                        "type": "tuple[]",
                    },
                ],
                "indexed": False,
                "internalType": "struct SessionLib.SessionSpec",
                "name": "sessionSpec",
                "type": "tuple",
            },
        ],
        "name": "SessionCreated",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address",
                "name": "account",
                "type": "address",
            },
            {
                "indexed": True,
                "internalType": "bytes32",
                "name": "sessionHash",
                "type": "bytes32",
            },
        ],
        "name": "SessionRevoked",
        "type": "event",
    },
    {
        "inputs": [{"internalType": "bytes", "name": "sessionData", "type": "bytes"}],
        "name": "addValidationKey",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "version",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "pure",
        "type": "function",
    },
]
