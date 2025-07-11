"""
BigQuery Configuration Module

This module contains configuration classes and constants for BigQuery integration.
"""

import os
import re
from typing import Optional
from pydantic import BaseModel, Field


# Dataset constants for different chains
DATASETS = {
    "cronos_zkevm": "cronos_zkevm_mainnet",  # Cronos zkEVM mainnet
    "cronos_evm": "public_preview___blockchain_analytics_cronos_mainnet",  # Cronos EVM mainnet
}


class BigQueryConfig(BaseModel):
    """
    Configuration for BigQuery integration.
    """

    project_id: Optional[str] = Field(default=None, alias="project-id")
    dataset_id: Optional[str] = Field(
        default="public_preview___blockchain_analytics_cronos_mainnet",
        alias="dataset-id",
    )
    schemas_file: Optional[str] = Field(
        default="bigquery_schemas.json", alias="schemas-file"
    )
    max_bytes_billed: Optional[int] = Field(
        default=30 * (1024**3), alias="max-bytes-billed"  # 30GB default
    )
    query_timeout_ms: Optional[int] = Field(
        default=30000, alias="query-timeout-ms"  # 30 seconds default
    )
    enabled: Optional[bool] = Field(default=True)


def get_project_id() -> str:
    """Get validated project ID from environment variable."""
    project_id = os.getenv("PROJECT_ID")
    if not project_id:
        raise ValueError("PROJECT_ID environment variable is required")

    # Validate Google Cloud project ID format
    if not re.match(r"^[a-z][a-z0-9-]{4,28}[a-z0-9]$", project_id):
        raise ValueError(
            "Invalid PROJECT_ID format. Must be 6-30 characters, start with lowercase letter, contain only lowercase letters, numbers, and hyphens"
        )

    return project_id


def get_api_key() -> str:
    """Get validated OpenAI API key from environment variable."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is required")

    # Basic validation for OpenAI API key format
    if not api_key.startswith("sk-") or len(api_key) < 20:
        raise ValueError("Invalid OPENAI_API_KEY format")

    return api_key


def get_dashboard_api_key() -> str:
    """Get validated Dashboard API key from environment variable."""
    api_key = os.getenv("DASHBOARD_API_KEY")
    if not api_key:
        raise ValueError("DASHBOARD_API_KEY environment variable is required")

    # Basic validation - ensure it's not empty and has reasonable length
    if len(api_key.strip()) < 10:
        raise ValueError("Invalid DASHBOARD_API_KEY format")

    return api_key.strip()


def is_debug_mode() -> bool:
    """Check if debug logging is enabled."""
    return os.getenv("DEBUG_LOGGING", "false").lower() == "true"


def select_dataset() -> str:
    """Allow user to select which dataset to use."""
    print("\n[CONFIG] Select BigQuery Dataset:")
    print("=" * 50)
    print("1. Cronos zkEVM mainnet (Default)")
    print("   [DATASET] Dataset: cronos_zkevm_mainnet")
    print("2. Cronos EVM mainnet")
    print("   [DATASET] Dataset: public_preview___blockchain_analytics_cronos_mainnet")
    print("=" * 50)

    while True:
        choice = input("Select dataset (1-2, or press Enter for default): ").strip()

        if choice == "" or choice == "1":
            selected = DATASETS["cronos_zkevm"]
            print(f"[SUCCESS] Selected: Cronos zkEVM mainnet")
            print(f"[DATASET] Dataset ID: {selected}")
            return selected
        elif choice == "2":
            selected = DATASETS["cronos_evm"]
            print(f"[SUCCESS] Selected: Cronos EVM mainnet")
            print(f"[DATASET] Dataset ID: {selected}")
            return selected
        else:
            print("[ERROR] Invalid choice. Please select 1 or 2.")
