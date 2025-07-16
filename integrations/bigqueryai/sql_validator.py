"""
SQL Generation and Validation Module

This module handles SQL query generation using AI and security validation.
"""

import re
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


class SQLValidator:
    """SQL security validation for BigQuery queries."""

    @staticmethod
    def validate_user_input(user_input: str) -> Tuple[bool, str]:
        """Validate user input before processing to prevent XSS and malicious patterns."""
        if not user_input or len(user_input.strip()) == 0:
            return False, "Empty input not allowed"

        # Check for excessively long input
        if len(user_input) > 1000:
            return False, "Input too long (max 1000 characters)"

        # Check for suspicious patterns that could indicate XSS or other attacks
        dangerous_patterns = [
            (r"<script", "Script tags not allowed"),
            (r"javascript:", "JavaScript URLs not allowed"),
            (r"data:", "Data URLs not allowed"),
            (r"vbscript:", "VBScript not allowed"),
            (r"onload\s*=", "Event handlers not allowed"),
            (r"onerror\s*=", "Event handlers not allowed"),
            (r"onclick\s*=", "Event handlers not allowed"),
            (r"onmouseover\s*=", "Event handlers not allowed"),
            (r"<iframe", "Iframes not allowed"),
            (r"<object", "Objects not allowed"),
            (r"<embed", "Embeds not allowed"),
            (r"<form", "Forms not allowed"),
            (r"<input", "Input elements not allowed"),
        ]

        for pattern, message in dangerous_patterns:
            if re.search(pattern, user_input, re.IGNORECASE):
                return False, message

        return True, ""

    @staticmethod
    def validate_sql_security(sql_query: str) -> Tuple[bool, str]:
        """Enhanced SQL security validation based on reference implementation."""
        if not sql_query:
            return False, "Empty SQL query"

        sql_upper = sql_query.upper().strip()

        # Must start with SELECT
        if not sql_upper.startswith("SELECT"):
            return False, "Only SELECT queries are allowed"

        # Enhanced list of dangerous keywords
        dangerous_keywords = [
            "INSERT",
            "UPDATE",
            "DELETE",
            "DROP",
            "CREATE",
            "ALTER",
            "TRUNCATE",
            "REPLACE",
            "MERGE",
            "GRANT",
            "REVOKE",
            "EXEC",
            "EXECUTE",
            "CALL",
            "DECLARE",
            "SET",
            "PROCEDURE",
            "FUNCTION",
            "TRIGGER",
            "INDEX",
            "SCHEMA",
            "DATABASE",
            "TABLE",
            "VIEW",
            "UNION",
            "EXCEPT",
            "INTERSECT",
        ]

        for keyword in dangerous_keywords:
            # Use word boundaries to avoid false positives
            pattern = r"\b" + re.escape(keyword) + r"\b"
            if re.search(pattern, sql_upper):
                return False, f"Dangerous SQL keyword detected: {keyword}"

        # Check for SQL injection patterns
        injection_patterns = [
            (r";\s*--", "SQL comment after semicolon"),
            (r"'.*OR.*'", "Basic SQL injection pattern"),
            (r"'.*AND.*'", "Basic SQL injection pattern"),
            (r"UNION\s+SELECT", "Union-based injection"),
            (r"1\s*=\s*1", "Always true condition"),
            (r"1\s*=\s*0", "Always false condition"),
            (r"'\s*;\s*", "Quote followed by semicolon"),
            (r"--\s*", "SQL comment"),
            (r"/\*.*\*/", "SQL block comment"),
        ]

        for pattern, description in injection_patterns:
            if re.search(pattern, sql_upper):
                return False, f"Potential SQL injection pattern detected: {description}"

        # Check for excessive wildcards or broad queries
        if sql_upper.count("*") > 5:
            return False, "Too many wildcards in query"

        return True, ""


class SQLGenerator:
    """SQL query generator using AI models."""

    def __init__(self, project_id: str, dataset_id: str, langchain_llm=None):
        self.project_id = project_id
        self.dataset_id = dataset_id
        self.langchain_llm = langchain_llm
        self.validator = SQLValidator()

    def generate_sql_with_ai(self, user_prompt: str, schema_text: str) -> Optional[str]:
        """Generate SQL query using AI with enhanced security."""
        if not self.langchain_llm:
            return None

        # SECURITY FIX: Validate user input first
        is_valid_input, input_error = self.validator.validate_user_input(user_prompt)
        if not is_valid_input:
            logger.error(f"[SECURITY] User input validation failed: {input_error}")
            return None

        system_prompt = f"""You are a BigQuery SQL expert. Generate a valid BigQuery SQL query based on the user's request.

SECURITY REQUIREMENTS:
- ONLY generate SELECT statements
- No data modification commands allowed
- No SQL comments (-- or /* */)
- No stacked queries
- No UNION, EXCEPT, or INTERSECT operations unless specifically requested

TECHNICAL REQUIREMENTS:
1. Use proper BigQuery syntax
2. Always use full table names: `{self.project_id}.{self.dataset_id}.table_name`
3. Use appropriate BigQuery functions and data types
4. Include LIMIT clauses for large datasets (default LIMIT 1000)
5. ALWAYS wrap reserved words and potentially conflicting field names in backticks (`field_name`)
   Common reserved words to wrap in backticks:
   - `hash` (very common in blockchain data)
   - `value` (common field name)
   - `type` (common field name)
   - `size` (common field name)
   - `timestamp` (reserved word)
   - `number` (common field name)
   - `index` (reserved word)
   - `data` (common field name)
   - `status` (common field name)
   - `order` (reserved word)
   - `key` (common field name)
   - `function` (reserved word)
   - `table` (reserved word)
   - `date` (reserved word)
   - `time` (reserved word)
   - `array` (reserved word)
   - `string` (reserved word)
   - `case` (reserved word)
   - `when` (reserved word)
   - `then` (reserved word)
   - `else` (reserved word)
   - `end` (reserved word)
   - `cast` (reserved word)
   - `extract` (reserved word)
   - `interval` (reserved word)
   Examples: SELECT `hash`, `value`, `type` FROM table WHERE `timestamp` > '2023-01-01'
6. For RECORD fields, use dot notation (e.g., value.bignumeric_value)
7. All fields in ORDER BY, GROUP BY, HAVING must be in SELECT clause
8. Use TIMESTAMP functions for date/time operations
9. Handle NULL values appropriately

COST OPTIMIZATION:
- Use LIMIT clauses to reduce data processed
- Be specific in WHERE clauses
- Avoid SELECT * on large tables
- Use appropriate aggregation functions

Return ONLY the SQL query, no explanations or markdown formatting."""

        prompt = f"User request: {user_prompt}\n\n{schema_text}\n\nGenerate a secure, optimized SELECT-only SQL query:"

        try:
            from langchain_core.messages import HumanMessage, SystemMessage

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=prompt),
            ]
            response = self.langchain_llm.invoke(messages)
            sql_query = response.content.strip()

            # Clean up markdown formatting
            if sql_query.startswith("```"):
                sql_query = sql_query.split("\n", 1)[1]
            if sql_query.endswith("```"):
                sql_query = sql_query.rsplit("\n", 1)[0]

            # Remove any remaining markdown
            sql_query = sql_query.replace("```sql", "").replace("```", "").strip()

            # Validate security
            is_valid, error_message = self.validator.validate_sql_security(sql_query)
            if not is_valid:
                logger.error(
                    f"[SECURITY] SQL Security Validation Failed: {error_message}"
                )
                return None

            logger.info("[SECURITY] SQL Security Validation Passed")
            return sql_query

        except Exception as e:
            logger.error(f"Error generating SQL: {e}")
            return None
