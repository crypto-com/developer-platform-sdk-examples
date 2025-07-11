"""
BigQuery Client Module

This module contains the main BigQuery client wrapper with query execution capabilities.
"""

import os
import json
import logging
import re
from typing import Optional, Dict, Any, List
from google.cloud import bigquery

import sql_validator

logger = logging.getLogger(__name__)


class BigQueryClient:
    """
    BigQuery client wrapper for natural language to SQL query generation and execution.
    """

    def __init__(
        self,
        project_id: Optional[str] = None,
        dataset_id: Optional[str] = None,
        schemas_file: Optional[str] = None,
        langchain_llm=None,
        max_bytes_billed: Optional[int] = None,
        query_timeout_ms: Optional[int] = None,
    ) -> None:
        """Initialize the BigQuery client."""
        self.project_id = project_id or os.getenv("PROJECT_ID")

        # Debug: Check what dataset_id we received
        logger.debug(
            f"[CONFIG] BigQueryClient.__init__ received dataset_id: {dataset_id}"
        )

        # Use the provided dataset_id, don't fallback to default immediately
        if dataset_id:
            self.dataset_id = dataset_id
            logger.debug(f"[SUCCESS] Using provided dataset_id: {self.dataset_id}")
        else:
            self.dataset_id = "public_preview___blockchain_analytics_cronos_mainnet"
            logger.debug(
                f"[WARNING] No dataset_id provided, using default: {self.dataset_id}"
            )

        self.schemas_file = schemas_file or "bigquery_schemas.json"
        self.schemas_file_was_none = schemas_file is None
        self.max_bytes_billed = max_bytes_billed or (30 * 1024**3)  # 30GB default
        self.query_timeout_ms = query_timeout_ms or 30000  # 30 seconds default

        if not self.project_id:
            raise ValueError("PROJECT_ID must be provided or set in environment")

        # Initialize BigQuery client
        self.bq_client = bigquery.Client(project=self.project_id)
        self.langchain_llm = langchain_llm

        # Initialize SQL generator
        self.sql_generator = sql_validator.SQLGenerator(
            self.project_id, self.dataset_id, langchain_llm
        )

        # Load schemas
        logger.debug("Initializing BigQuery schema information...")
        logger.debug(f"[TARGET] Using dataset: {self.dataset_id}")
        self.schemas = self._load_schemas()

        # Display configuration
        debug_mode = os.getenv("DEBUG_LOGGING", "false").lower() == "true"
        self._display_configuration(debug_mode)

    def _display_configuration(self, debug_mode: bool = False) -> None:
        """Display current BigQuery configuration and limits."""
        limit_gb = self.max_bytes_billed / (1024**3)
        timeout_sec = self.query_timeout_ms / 1000

        if debug_mode:
            logger.info("=" * 70)
            logger.info("[CONFIG] BigQuery Configuration")
            logger.info("=" * 70)
            logger.info(f"[PROJECT] Project: {self.project_id}")
            logger.info(f"[DATASET] Dataset: {self.dataset_id}")
            logger.info(f"[LIMIT] Max GB Limit: {limit_gb:.1f} GB")
            logger.info(f"[TIMEOUT] Query Timeout: {timeout_sec:.1f} seconds")
            logger.info(f"[SCHEMAS] Schemas File: {self.schemas_file}")
            logger.info("=" * 70)
        else:
            # Show minimal configuration
            print(f"\n[CONFIG] BigQuery Ready: {self.dataset_id}")
            print(
                f"[LIMIT] Limit: {limit_gb:.1f} GB | [TIMEOUT] Timeout: {timeout_sec:.0f}s"
            )

    def _load_schemas(self) -> Optional[Dict[str, Any]]:
        """Load database schemas from file or download on-the-fly."""
        logger.debug(f"Attempting to load schemas from: {self.schemas_file}")

        if self.schemas_file_was_none:
            logger.debug("[DOWNLOAD] DOWNLOADING SCHEMA (schemas-file was None)")
            return self._download_schemas_on_the_fly()

        try:
            with open(self.schemas_file, "r") as f:
                schemas = json.load(f)

            if schemas and isinstance(schemas, dict) and len(schemas) > 0:
                table_count = len(schemas)
                file_size = os.path.getsize(self.schemas_file)
                logger.debug(
                    f"[SUCCESS] Loaded {table_count} table schemas from {self.schemas_file}"
                )
                return schemas
            else:
                logger.warning(
                    "[WARNING] Schema file is empty or invalid, downloading schemas..."
                )
                return self._download_schemas_on_the_fly()

        except FileNotFoundError:
            logger.warning(
                "[WARNING] Schema file not found, downloading schemas on-the-fly..."
            )
            return self._download_schemas_on_the_fly()
        except json.JSONDecodeError as e:
            logger.warning(
                f"[WARNING] Invalid JSON in schema file: {e}, downloading schemas..."
            )
            return self._download_schemas_on_the_fly()

    def _download_schemas_on_the_fly(self) -> Dict[str, Any]:
        """Download schema information from BigQuery."""
        try:
            logger.info(
                f"[DOWNLOAD] Downloading schemas from BigQuery dataset: {self.project_id}.{self.dataset_id}"
            )

            dataset_ref = self.bq_client.dataset(
                self.dataset_id, project=self.project_id
            )
            tables = list(self.bq_client.list_tables(dataset_ref))
            logger.info(f"[INFO] Found {len(tables)} tables in dataset")

            if not tables:
                logger.error("[ERROR] No tables found in the dataset.")
                return {}

            new_schemas = {}
            for table in tables:
                table_id = table.table_id
                try:
                    table_ref = dataset_ref.table(table_id)
                    table_obj = self.bq_client.get_table(table_ref)

                    schema_info = {
                        "description": table_obj.description or f"{table_id} table",
                        "num_rows": table_obj.num_rows,
                        "num_bytes": table_obj.num_bytes,
                        "schema": [],
                    }

                    for field in table_obj.schema:
                        field_info = {
                            "name": field.name,
                            "type": field.field_type,
                            "mode": field.mode,
                            "description": field.description or f"{field.name} field",
                        }
                        schema_info["schema"].append(field_info)

                    new_schemas[table_id] = schema_info
                    logger.info(f"[SUCCESS] Downloaded schema for table: {table_id}")

                except Exception as e:
                    logger.error(
                        f"[ERROR] Error downloading schema for {table_id}: {e}"
                    )

            # Save schemas to file
            if new_schemas:
                try:
                    with open(self.schemas_file, "w") as f:
                        json.dump(new_schemas, f, indent=2)
                    logger.info(f"[SAVE] Saved schemas to {self.schemas_file}")
                except Exception as e:
                    logger.warning(f"[WARNING] Could not save schema file: {e}")

            return new_schemas

        except Exception as e:
            logger.error(f"[ERROR] Error downloading schemas: {e}")
            return {}

    def format_schema_for_prompt(self) -> str:
        """Format schemas for AI prompt."""
        if not self.schemas:
            return "No schema information available."

        schema_text = f"Database Schema Information:\n\nDataset: {self.project_id}.{self.dataset_id}\n"
        schema_text += "Available tables:\n\n"

        for table_name, table_info in self.schemas.items():
            full_table_name = f"`{self.project_id}.{self.dataset_id}.{table_name}`"
            schema_text += f"Table: {full_table_name}\n"
            schema_text += (
                f"Description: {table_info.get('description', 'No description')}\n"
            )
            schema_text += f"Rows: {table_info.get('num_rows', 'Unknown'):,}\n"
            schema_text += "Columns:\n"

            for column in table_info.get("schema", []):
                col_name = column.get("name", "Unknown")
                col_type = column.get("type", "Unknown")
                col_mode = column.get("mode", "Unknown")
                col_desc = column.get("description", "No description")
                schema_text += f"  - {col_name} ({col_type}, {col_mode}): {col_desc}\n"

            schema_text += "\n"

        return schema_text

    def _get_qualified_table_name(self, table_name: str) -> str:
        """Safely get qualified table name using whitelist approach to prevent SQL injection."""
        if not self.schemas:
            # Fallback to default table names if schema not loaded
            default_tables = ["batches", "blocks", "logs", "transactions"]
            if table_name not in default_tables:
                raise ValueError(f"Table '{table_name}' not found in allowed tables")
        else:
            # Use schema-based whitelist
            if table_name not in self.schemas:
                raise ValueError(f"Table '{table_name}' not found in allowed tables")

        return f"`{self.project_id}.{self.dataset_id}.{table_name}`"

    def _sanitize_sql_for_logging(self, sql: str) -> str:
        """Remove sensitive data from SQL for logging."""
        # Replace potential sensitive values with placeholders
        sanitized = re.sub(r"'[^']*'", "'***'", sql)
        # Replace potential numeric values that might be sensitive
        sanitized = re.sub(r"\b\d{10,}\b", "***", sanitized)
        return sanitized

    def execute_bigquery(
        self, sql_query: str, debug_mode: bool = False
    ) -> Optional[Any]:
        """Execute SQL query on BigQuery with enhanced cost controls."""
        try:
            # SECURITY FIX: Use whitelist approach for table names instead of string replacement
            if self.schemas:
                table_names = list(self.schemas.keys())
            else:
                table_names = ["batches", "blocks", "logs", "transactions"]

            # SECURITY FIX: Replace unsafe string replacement with secure table name validation
            # Check if query contains any table names that need qualification
            for table in table_names:
                # Only qualify unqualified table names
                if (
                    f" {table} " in sql_query
                    or f"FROM {table}" in sql_query
                    or f"JOIN {table}" in sql_query
                ):
                    try:
                        qualified_name = self._get_qualified_table_name(table)
                        # Safe replacement patterns
                        sql_query = sql_query.replace(
                            f" {table} ", f" {qualified_name} "
                        )
                        sql_query = sql_query.replace(
                            f" {table}\n", f" {qualified_name}\n"
                        )
                        sql_query = sql_query.replace(
                            f"FROM {table}", f"FROM {qualified_name}"
                        )
                        sql_query = sql_query.replace(
                            f"JOIN {table}", f"JOIN {qualified_name}"
                        )
                    except ValueError as e:
                        logger.error(f"[SECURITY] Table validation failed: {e}")
                        return None

            # SECURITY FIX: Secure logging - never log full SQL queries
            if logger.isEnabledFor(logging.DEBUG):
                sanitized_query = self._sanitize_sql_for_logging(sql_query)
                logger.debug(f"Executing SQL Query: {sanitized_query}")
            else:
                logger.debug("Executing SQL Query: [REDACTED]")

            # STEP 1: DRY RUN - Estimate cost first
            logger.debug("=" * 50)
            logger.debug("[COST] PERFORMING DRY RUN COST ESTIMATION")
            logger.debug("=" * 50)

            print("\n[COST] PERFORMING DRY RUN COST ESTIMATION")
            print("=" * 50)

            dry_run_config = bigquery.QueryJobConfig(dry_run=True, use_legacy_sql=False)

            try:
                dry_run_job = self.bq_client.query(sql_query, job_config=dry_run_config)
                bytes_processed = dry_run_job.total_bytes_processed
                gb_processed = bytes_processed / (1024**3)
                mb_processed = bytes_processed / (1024**2)
                limit_gb = self.max_bytes_billed / (1024**3)

                # Always show cost estimation
                print("[ANALYSIS] DRY RUN RESULTS:")
                print(f"   [SIZE] Will process: {bytes_processed:,} bytes")
                print(f"   [SIZE] Will process: {mb_processed:.2f} MB")
                print(f"   [SIZE] Will process: {gb_processed:.3f} GB")
                print(f"   [LIMIT] Current limit: {limit_gb:.1f} GB")
                print(f"   [USAGE] Usage: {(gb_processed/limit_gb)*100:.1f}% of limit")

                # Check if query exceeds our billing limit
                if bytes_processed > self.max_bytes_billed:
                    print("=" * 50)
                    print("[ALERT] QUERY EXCEEDS COST LIMIT!")
                    print("=" * 50)
                    print(f"   [ERROR] Query would process: {gb_processed:.2f} GB")
                    print(f"   [WARNING] Current limit: {limit_gb:.1f} GB")
                    print(f"   [TIP] Reduce data by adding WHERE clauses or LIMIT")
                    print("=" * 50)
                    return None

                # Categorize query size
                if bytes_processed < 1024**2:  # Less than 1MB
                    print("[SUCCESS] Small query: Very efficient!")
                elif bytes_processed < 100 * 1024**2:  # Less than 100MB
                    print("[SUCCESS] Medium query: Good efficiency")
                elif bytes_processed < 1024**3:  # Less than 1GB
                    print("[WARNING] Large query: Consider optimization")
                else:  # 1GB or more
                    print("[WARNING] Very large query: Review for optimization")

                print("[SUCCESS] DRY RUN PASSED - PROCEEDING WITH EXECUTION")
                print("=" * 50)

            except Exception as dry_run_error:
                logger.debug(f"[ERROR] Dry run failed: {dry_run_error}")
                logger.debug("[WARNING] Proceeding without cost estimation")
                print(f"[ERROR] Dry run failed: {dry_run_error}")
                print("[WARNING] Proceeding without cost estimation")

            # STEP 2: ACTUAL EXECUTION with cost controls
            job_config = bigquery.QueryJobConfig(
                maximum_bytes_billed=self.max_bytes_billed,
                job_timeout_ms=self.query_timeout_ms,
                dry_run=False,
                use_query_cache=True,
                use_legacy_sql=False,
            )

            logger.debug("=" * 50)
            logger.debug("[EXECUTE] EXECUTING QUERY WITH COST CONTROLS")
            logger.debug("=" * 50)

            query_job = self.bq_client.query(sql_query, job_config=job_config)
            results = query_job.result()

            # Log actual usage (only detailed info in debug mode)
            logger.debug("=" * 50)
            logger.debug("[SUCCESS] QUERY EXECUTION COMPLETED")
            logger.debug("=" * 50)

            if (
                hasattr(query_job, "total_bytes_processed")
                and query_job.total_bytes_processed
            ):
                actual_bytes = query_job.total_bytes_processed
                actual_mb = actual_bytes / (1024**2)
                actual_gb = actual_bytes / (1024**3)
                limit_gb = self.max_bytes_billed / (1024**3)

                logger.debug("[USAGE] ACTUAL USAGE:")
                logger.debug(f"   [SIZE] Processed: {actual_bytes:,} bytes")
                logger.debug(f"   [SIZE] Processed: {actual_mb:.2f} MB")
                logger.debug(f"   [SIZE] Processed: {actual_gb:.3f} GB")
                logger.debug(f"   [LIMIT] Limit: {limit_gb:.1f} GB")
                logger.debug(
                    f"   [USAGE] Used: {(actual_gb/limit_gb)*100:.1f}% of limit"
                )
                logger.debug(f"   [ROWS] Rows returned: {results.total_rows:,}")

                # Query efficiency feedback
                if actual_gb < 0.001:  # Less than 1MB
                    logger.debug("[EXCELLENT] Excellent: Very efficient query!")
                elif actual_gb < 0.1:  # Less than 100MB
                    logger.debug("[GOOD] Good: Efficient query")
                elif actual_gb < 1.0:  # Less than 1GB
                    logger.debug("[MODERATE] Moderate: Consider optimization")
                else:  # 1GB or more
                    logger.debug("[HEAVY] Heavy: Review for optimization opportunities")
            else:
                logger.debug("   [ROWS] Rows returned: {results.total_rows:,}")
                logger.debug("   [WARNING] Usage data not available")

            return results

        except Exception as e:
            error_msg = str(e)
            logger.debug(f"[ERROR] Error executing BigQuery: {error_msg}")
            # SECURITY FIX: Don't log the actual SQL query that failed
            logger.debug("SQL Query that failed: [REDACTED]")

            # Check if it's a schema-related error
            if "Unrecognized name" in error_msg or "not found" in error_msg.lower():
                logger.debug("\n[WARNING] This appears to be a schema mismatch error.")
                logger.debug(
                    "[TIP] Try refreshing your schema file or check table names."
                )

            print(f"[ERROR] Error executing BigQuery: {error_msg}")
            return None

    def query(self, user_prompt: str) -> str:
        """Main method to process natural language queries."""
        try:
            # Check debug mode for display only
            debug_mode = os.getenv("DEBUG_LOGGING", "false").lower() == "true"

            logger.debug("[START] STARTING BIGQUERY PROCESSING")
            logger.debug("=" * 70)
            logger.debug(f"[QUESTION] User Question: {user_prompt}")

            # Step 1: Display current cost limits
            limit_gb = self.max_bytes_billed / (1024**3)
            logger.debug(f"[LIMIT] Current GB Limit: {limit_gb:.1f} GB")
            logger.debug(f"[DATASET] Target Dataset: {self.dataset_id}")
            logger.debug("=" * 70)

            # Step 2: Generate SQL
            logger.debug("[GENERATE] GENERATING SQL QUERY...")
            schema_text = self.format_schema_for_prompt()
            sql_query = self.sql_generator.generate_sql_with_ai(
                user_prompt, schema_text
            )
            if not sql_query:
                return "[ERROR] Failed to generate SQL query from your request."

            # Step 3: Display generated SQL (always show this)
            print("\n" + "=" * 70)
            print("[SQL] GENERATED SQL QUERY:")
            print("=" * 70)
            for i, line in enumerate(sql_query.split("\n"), 1):
                print(f"{i:3d}: {line}")
            print("=" * 70)

            # Step 4: Execute BigQuery with cost controls
            logger.debug("[EXECUTE] EXECUTING WITH COST CONTROLS...")
            results = self.execute_bigquery(sql_query, debug_mode)
            if results is None:
                return "[ERROR] Failed to execute the generated SQL query due to cost limits or errors."

            # Step 5: Convert results to list to avoid iterator issues
            logger.debug("[PROCESS] PROCESSING QUERY RESULTS...")
            results_list = []
            try:
                for row in results:
                    row_data = {key: str(row[key]) for key in row.keys()}
                    results_list.append(row_data)
            except Exception as e:
                logger.error(f"Error processing results: {e}")
                return "[ERROR] Error processing query results."

            total_rows = results.total_rows
            results_text = self._convert_results_to_text(results_list, total_rows)

            # Step 6: Display query results (always show this)
            print("\n" + "=" * 70)
            print("[RESULTS] QUERY RESULTS:")
            print("=" * 70)
            print(f"[ROWS] Rows returned: {total_rows:,}")
            if (
                hasattr(results, "total_bytes_processed")
                and results.total_bytes_processed
            ):
                actual_gb = results.total_bytes_processed / (1024**3)
                print(f"[SIZE] Data processed: {actual_gb:.3f} GB")
            print("=" * 70)

            # Print actual rows returned
            self._print_query_results(results_list, total_rows)

            logger.debug("[RESULTS] Detailed query results logged")

            # Step 7: Generate final response
            logger.debug("[GENERATE] GENERATING AI ANALYSIS...")
            final_response = self._generate_final_response_with_ai(
                user_prompt, results_text, sql_query
            )

            logger.debug("[COMPLETE] BIGQUERY PROCESSING COMPLETED")
            logger.debug("=" * 70)
            return final_response

        except Exception as e:
            logger.error(f"[ERROR] Error processing BigQuery request: {e}")
            return f"An error occurred while processing your request. Please try again."

    def _print_query_results(self, results_list, total_rows) -> None:
        """Print the actual query results in a readable format."""
        if not results_list:
            print("No results returned from the query.")
            return

        headers = list(results_list[0].keys()) if results_list else []
        row_count = min(len(results_list), 10)  # Limit displayed rows to 10

        if headers and results_list:
            print("\n[DATA] QUERY DATA:")
            print("-" * 70)

            # Print headers
            header_line = " | ".join(f"{header:15}" for header in headers)
            print(header_line)
            print("-" * len(header_line))

            # Print rows
            for row_data in results_list[:row_count]:
                row_line = " | ".join(
                    f"{str(row_data[header]):15}" for header in headers
                )
                print(row_line)

            if total_rows > row_count:
                print(
                    f"\n... (showing first {row_count} rows of {total_rows} total rows)"
                )
            print("-" * 70)

    def _convert_results_to_text(self, results_list, total_rows) -> str:
        """Convert BigQuery results to text format."""
        if not results_list:
            logger.debug("No results returned from the query.")
            return "No results returned from the query."

        result_text = "BigQuery Results:\n" + "=" * 40 + "\n\n"

        if results_list:
            headers = list(results_list[0].keys())
            result_text += "Columns: " + ", ".join(headers) + "\n\n"
            logger.debug(f"Query columns: {headers}")

        row_count = min(len(results_list), 100)  # Limit for AI processing

        result_text += f"Data ({row_count} rows):\n"
        for i, row_data in enumerate(results_list[:row_count]):
            result_text += (
                f"Row {i+1}: "
                + ", ".join([f"{k}={v}" for k, v in row_data.items()])
                + "\n"
            )
            logger.debug(f"Row {i+1}: {row_data}")

        if total_rows > row_count:
            result_text += (
                f"\n... (showing first {row_count} rows of {total_rows} total rows)\n"
            )
            logger.debug(f"Total rows in result set: {total_rows}")

        return result_text

    def _generate_final_response_with_ai(
        self, user_prompt: str, results_text: str, sql_query: str
    ) -> str:
        """Generate final response using AI."""
        if not self.langchain_llm:
            return f"Query Results:\n{results_text}"

        system_prompt = """You are a data analyst expert. Provide a comprehensive analysis that:
1. Directly answers the user's question
2. Provides insights and context about the data
3. Highlights key findings and patterns
4. Uses clear, readable formatting with headers and bullet points
5. Includes relevant statistics and summaries
6. Suggests follow-up questions if appropriate

Make your response engaging and informative."""

        prompt = f"User's Question: {user_prompt}\n\nSQL Query:\n{sql_query}\n\n{results_text}\n\nProvide analysis:"

        try:
            from langchain_core.messages import HumanMessage, SystemMessage

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=prompt),
            ]
            response = self.langchain_llm.invoke(messages)
            return response.content.strip()

        except Exception as e:
            logger.error(f"Error generating final response: {e}")
            return f"Query Results:\n{results_text}"

    def get_schema_info(self) -> str:
        """Get formatted schema information."""
        return self.format_schema_for_prompt()

    def get_cost_info(self) -> str:
        """Get current cost and limit information."""
        limit_gb = self.max_bytes_billed / (1024**3)
        timeout_sec = self.query_timeout_ms / 1000

        info = f"""[COST] BigQuery Cost & Limits Information:

[CONFIG] Current Configuration:
   • Max GB Limit: {limit_gb:.1f} GB per query
   • Query Timeout: {timeout_sec:.1f} seconds
   • Project: {self.project_id}
   • Dataset: {self.dataset_id}

[TIPS] Cost Optimization Tips:
   • Use LIMIT clauses to reduce data processed
   • Be specific in WHERE clauses
   • Avoid SELECT * on large tables
   • Use date/time filters for time-series data

[SECURITY] Security Features:
   • Dry run validation before execution
   • SQL injection protection
   • Query cost estimation
   • Automatic query optimization"""

        return info
