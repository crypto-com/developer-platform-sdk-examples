/**
 * Builds a BigQuery SQL query to count the number of distinct values for a specified field,
 * filtered by a list of values and a time window.
 *
 * Typically used to calculate metrics such as Unique Active Wallets (UAW) over a time period.
 *
 * @param {string} field - The field to count distinct values from (e.g., 'from_address').
 * @param {string} dataset - The BigQuery dataset name.
 * @param {string} table - The BigQuery table name.
 * @param {string} filterField - The field used for filtering (e.g., 'to_address').
 * @param {string} filterValues - A comma-separated string of quoted filter values.
 * @param {string} timeField - The timestamp field to apply the time window filter on (e.g., 'block_timestamp').
 * @param {number} days - The number of days to look back from the current timestamp.
 * @returns {string} - The final BigQuery SQL query string.
 *
 * @example
 * const query = buildDistinctCountQuery(
 *   'from_address',
 *   'my-gcp-project',
 *   'cronos_dataset',
 *   'transactions',
 *   'to_address',
 *   `'0xabc...', '0xdef...'`,
 *   'block_timestamp',
 *   7
 * );
 */
export const buildDistinctCountQuery = (
  field: string,
  dataset: string,
  table: string,
  filterField: string,
  filterValues: string,
  timeField: string,
  days: number
): string => `
  SELECT COUNT(DISTINCT ${field}) AS count
  FROM \`${dataset}.${table}\`
  WHERE ${filterField} IN (${filterValues})
    AND ${timeField} >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
`;
