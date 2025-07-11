"""
BigQuery Agent Tools Module

This module contains all the agent tools for BigQuery integration.
"""

import datetime
from typing import Optional
from crypto_com_agent_client import tool

# Global BigQuery client instance
_bigquery_client: Optional[object] = None


def initialize_bigquery_client(langchain_llm, dataset_id: str) -> bool:
    """Initialize the BigQuery client with selected dataset."""
    import os
    import logging
    import bigquery_client

    global _bigquery_client
    logger = logging.getLogger(__name__)

    try:
        # Use dataset-specific schema file
        if "zkevm" in dataset_id:
            schemas_file = "bigquery_schemas_zkevm.json"
        else:
            schemas_file = "bigquery_schemas.json"

        logger.debug(f"[INIT] Initializing BigQuery with dataset: {dataset_id}")
        logger.debug(f"[SCHEMA] Using schema file: {schemas_file}")

        # Create client directly without config to avoid Pydantic issues
        _bigquery_client = bigquery_client.BigQueryClient(
            project_id=os.getenv("PROJECT_ID"),
            dataset_id=dataset_id,  # Pass directly
            schemas_file=schemas_file,
            langchain_llm=langchain_llm,
            max_bytes_billed=30 * (1024**3),
            query_timeout_ms=30000,
        )
        return True
    except Exception as e:
        logger.error(f"Failed to initialize BigQuery client: {e}")
        return False


@tool
def query_bigquery(question: str) -> str:
    """
    Query BigQuery database using natural language for blockchain analytics and historical data.

    Use this tool for:
    - Questions about blocks, transactions, logs data from the database
    - Historical analysis and aggregations
    - When user mentions "BigQuery", "database", "query", "analytics"
    - Complex data analysis questions
    - Questions like "latest blocks", "recent transactions", "top addresses"

    This provides cost-controlled access to large blockchain datasets with dry-run validation.

    Example: query_bigquery("Get the latest 5 blocks from the database")
    Example: query_bigquery("How many transactions were there in the last 24 hours?")
    Example: query_bigquery("Show me recent blocks using BigQuery")
    """
    try:
        if not _bigquery_client:
            return "BigQuery client not initialized. Please check your configuration."
        return _bigquery_client.query(question)
    except Exception as e:
        return f"Error querying BigQuery: {e}"


@tool
def get_bigquery_schema() -> str:
    """
    Get information about available BigQuery tables and their schemas.
    """
    try:
        if not _bigquery_client:
            return "BigQuery client not initialized. Please check your configuration."
        return _bigquery_client.get_schema_info()
    except Exception as e:
        return f"Error getting BigQuery schema: {e}"


@tool
def get_bigquery_cost_info() -> str:
    """
    Get current BigQuery cost limits and usage information.
    """
    try:
        if not _bigquery_client:
            return "BigQuery client not initialized. Please check your configuration."
        return _bigquery_client.get_cost_info()
    except Exception as e:
        return f"Error getting BigQuery cost info: {e}"


@tool
def get_bigquery_dataset_info() -> str:
    """
    Get information about the current BigQuery dataset being used.
    """
    try:
        if not _bigquery_client:
            return "BigQuery client not initialized. Please check your configuration."

        dataset_info = f"""[DATASET] Current BigQuery Dataset Information:

[CONFIG] Configuration:
   • Project: {_bigquery_client.project_id}
   • Dataset: {_bigquery_client.dataset_id}
   • Schema File: {_bigquery_client.schemas_file}

[LIMITS] Cost Limits:
   • Max GB per query: {_bigquery_client.max_bytes_billed / (1024**3):.1f} GB
   • Query timeout: {_bigquery_client.query_timeout_ms / 1000:.1f} seconds

[TABLES] Available Tables:
"""

        if _bigquery_client.schemas:
            for table_name, table_info in _bigquery_client.schemas.items():
                num_rows = table_info.get("num_rows", "Unknown")
                if isinstance(num_rows, int):
                    num_rows = f"{num_rows:,}"
                dataset_info += f"   • {table_name}: {num_rows} rows\n"
        else:
            dataset_info += "   • Schema information not available\n"

        return dataset_info
    except Exception as e:
        return f"Error getting BigQuery dataset info: {e}"


@tool
def get_current_time() -> str:
    """Returns current local and UTC time."""
    local_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    utc_time = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d %H:%M:%S")
    return f"Current time:\nLocal: {local_time}\nUTC: {utc_time}"


@tool
def bigquery_blocks_query(request: str) -> str:
    """
    Query blockchain blocks data using BigQuery database with cost controls and dry-run validation.

    Use this tool when users ask about:
    - "latest blocks", "recent blocks", "block data", "block information"
    - "get blocks", "show blocks", "find blocks", "query blocks"
    - Any question mentioning "BigQuery" or "database" related to blocks
    - Historical block analysis

    Example: bigquery_blocks_query("get latest 5 blocks")
    Example: bigquery_blocks_query("show me recent blocks")
    """
    try:
        if not _bigquery_client:
            return "BigQuery client not initialized. Please check your configuration."
        return _bigquery_client.query(request)
    except Exception as e:
        return f"Error querying BigQuery for blocks: {e}"


@tool
def explain_bigquery_usage() -> str:
    """Explains how to use BigQuery with natural language queries."""
    return """
BigQuery Integration Usage Guide:

[QUERIES] Natural Language Queries:
• "How many transactions were there in the last 24 hours?"
• "What are the top 10 addresses by transaction count?"
• "Show me the latest blocks"
• "What's the average gas price for recent transactions?"
• "Find the largest transactions by value"

[COST] Cost Controls:
• Dry run validation before execution
• 30GB query limit by default
• Cost estimation displayed
• Query optimization recommendations

[SECURITY] Security Features:
• Only SELECT queries allowed
• SQL injection protection
• Input sanitization
• Query validation

[TOOLS] Available Tools:
• query_bigquery() - Ask questions in natural language
• bigquery_blocks_query() - Specifically for block-related queries
• get_bigquery_schema() - View available tables and columns
• get_bigquery_cost_info() - Check current limits and usage
• get_bigquery_dataset_info() - View current dataset information
"""


def get_all_tools():
    """Return all BigQuery tools for agent initialization."""
    return [
        query_bigquery,
        bigquery_blocks_query,
        get_bigquery_schema,
        get_bigquery_cost_info,
        get_bigquery_dataset_info,
        get_current_time,
        explain_bigquery_usage,
    ]
