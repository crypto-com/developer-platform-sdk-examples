import {
  BigQueryLocation,
  CountResult,
  TimeWindow,
  UAWWindowCounts,
} from "./bigquery.interface.js";
import { buildDistinctCountQuery } from "./bigquery.helpers.js";
import { BIGQUERY_FIELDS } from "./bigquery.constants.js";
import { BigQuery } from "@google-cloud/bigquery";

/**
 * BigQueryService class handles smart contract analytics via BigQuery.
 *
 * @class BigQueryService
 */
export class BigQueryService {
  private bigQuery: BigQuery;
  private dataset: string;
  private table: string;

  /**
   * Creates an instance of BigQueryService.
   *
   * @param {string} projectId - The GCP project ID containing the BigQuery dataset.
   * @param {string} dataset - The BigQuery dataset name.
   * @param {string} table - The BigQuery table name containing transaction data.
   * @memberof BigQueryService
   */
  constructor(projectId: string, dataset: string, table: string) {
    this.bigQuery = new BigQuery({ projectId });
    this.dataset = dataset;
    this.table = table;
  }

  /**
   * Retrieves the number of unique active wallets (UAW) that have interacted with the specified contracts
   * over 1-day, 7-day, and 30-day windows.
   *
   * @async
   * @param {string[]} contractAddresses - Array of smart contract addresses (to_address).
   * @returns {Promise<UAWWindowCounts>} - Object containing UAW counts for each window.
   * @throws {Error} - If the query fails or returns an invalid result.
   *
   * @example
   * const contract = new BigQueryService(...);
   * const uaw = await contract.getUniqueActiveWallets(['0xabc...', '0xdef...']);
   */
  public async getUniqueActiveWallets(
    contractAddresses: string[]
  ): Promise<UAWWindowCounts> {
    const contractList = contractAddresses
      .map((addr) => `'${addr.toLowerCase()}'`)
      .join(", ");

    try {
      const [daily, weekly, monthly, yearly] = await Promise.all([
        this.getUAWForWindow(TimeWindow.DAILY, contractList),
        this.getUAWForWindow(TimeWindow.WEEKLY, contractList),
        this.getUAWForWindow(TimeWindow.MONTHLY, contractList),
        this.getUAWForWindow(TimeWindow.YEARLY, contractList),
      ]);

      return {
        daily,
        weekly,
        monthly,
        yearly,
      };
    } catch (e) {
      throw new Error(
        `Failed to calculate unique active wallets: ${(e as Error).message}`
      );
    }
  }

  /**
   * Runs a UAW count query for a given time window.
   *
   * @private
   * @param {number} days - Lookback window in days (e.g., 1, 7, or 30).
   * @param {string} contractList - Comma-separated string of quoted contract addresses.
   * @returns {Promise<number>} - Unique wallet count.
   */
  private async getUAWForWindow(
    days: number,
    contractList: string
  ): Promise<number> {
    const query = buildDistinctCountQuery(
      BIGQUERY_FIELDS.FROM_ADDRESS,
      this.dataset,
      this.table,
      BIGQUERY_FIELDS.TO_ADDRESS,
      contractList,
      BIGQUERY_FIELDS.BLOCK_TIMESTAMP,
      days
    );

    const [job] = await this.bigQuery.createQueryJob({
      query,
      location: BigQueryLocation.US,
    });

    const [rows] = await job.getQueryResults();

    if (!rows[0] || typeof rows[0].count !== "number") {
      throw new Error(
        'Unexpected result from BigQuery: missing or invalid "count" field'
      );
    }

    return parseInt((rows[0] as CountResult)?.count?.toString() || "0", 10);
  }
}
