# Cronos BigQuery Integration

This service uses **Google BigQuery** to fetch and count the number of **unique active wallets (UAW)** that have interacted with one or more smart contracts on a blockchain over configurable time windows (daily, weekly, monthly, yearly).

## Features

- Supports multiple smart contract addresses
- Queries 1-day, 7-day, 30-day, and 365-day windows
- Built on Node.js + TypeScript
- Uses the official `@google-cloud/bigquery` SDK
- Fully typed and documented with JSDoc

## Project Structure

```

.
├── src/
│   ├── bigquery.api.ts        # BigQueryService class
│   ├── bigquery.constants.ts  # Field constants (column names)
│   ├── bigquery.helpers.ts    # SQL query builder
│   ├── bigquery.interface.ts  # Types and enums
│   └── index.ts               # Main CLI entry point
├── .env                       # Environment variables
├── README.md
├── tsconfig.json
└── package.json

```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/crypto-com/developer-platform-sdk-examples.git
cd developer-platform-sdk-examples/integrations/bigquery

```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a `.env` file

```ini
GCP_PROJECT_ID=your-gcp-project-id
BIGQUERY_DATASET=your_dataset
BIGQUERY_TABLE=your_table
GOOGLE_APPLICATION_CREDENTIALS=./gcpkey.json
```

> Ensure that your BigQuery dataset and table contain transaction data with `from_address`, `to_address`, and `block_timestamp`.

### 3 Authentication

To run this example, you need access to BigQuery via a Google Cloud service account.

1. Create a service account with `BigQuery Data Viewer` and `BigQuery Job User` roles.
2. Download the JSON key and set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable in .env.

### 4. Run the script

```bash
npm run dev
```

You should see output like:

```json
{
  "status": "success",
  "data": { "daily": 0, "weekly": 5, "monthly": 13, "yearly": 616 }
}
```

## How It Works

The core logic is in `BigQueryService`, which:

- Builds a SQL query that selects `DISTINCT from_address` where `to_address` matches one of the provided smart contract addresses.
- Filters records by `block_timestamp` within the time window (1, 7, 30, 365 days).
- Returns the number of distinct wallet addresses for each time window.

## Scripts

| Script          | Description                   |
| --------------- | ----------------------------- |
| `npm run start` | Runs the main `index.ts` file |
| `npm run dev`   | Runs in dev mode              |

## Requirements

- Node.js `>=18.x`
- TypeScript `^5.x`

## License

MIT — Crypto.com Developer Platform Team
