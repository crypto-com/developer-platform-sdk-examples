import { config } from "dotenv";
import { BigQueryService } from "./bigquery/bigquery.api.js";

config();

/**
 * Project ID of your Google Cloud Platform project.
 * Loaded from environment variable `GCP_PROJECT_ID`.
 */
const projectId = process.env.BIGQUERY_PROJECT_ID!;

/**
 * BigQuery dataset name containing blockchain data.
 * Loaded from environment variable `BIGQUERY_DATASET`.
 */
const dataset = process.env.BIGQUERY_ZKEVM_MAINNET_DATASET!;

/**
 * Fetches UAW counts from BigQuery and returns structured service response.
 */
async function getUAWResponse(contractAddresses: string[]) {
  try {
    const bigQueryService = new BigQueryService(
      "discord-faucet-recaptcha",
      "cronos_zkevm_mainnet",
      "transactions"
    );

    const counts = await bigQueryService.getUniqueActiveWallets(
      contractAddresses
    );

    return {
      status: "success",
      data: counts,
    };
  } catch (e) {
    console.error("[getUAWResponse] Error:", e);
    return {
      status: "failed",
      error: "Failed retrieving Unique Active Wallets.",
    };
  }
}

/**
 * CLI entry point.
 */
async function main() {
  const contracts = ["0xa61947027cadbe9505d2a40e73eb21cb957e2dad"];
  const response = await getUAWResponse(contracts);
  console.log(response);
}

main();
