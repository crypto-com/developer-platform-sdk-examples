# BigQuery AI Integration for Crypto.com Agent

This project provides a BigQuery integration for the Crypto.com Agent Client, enabling natural language queries against blockchain data stored in Google Cloud BigQuery. The integration allows users to query blockchain information using conversational language, which is then converted to SQL and executed against BigQuery datasets.

## Features

- **Natural Language Queries**: Convert plain English questions into SQL queries
- **Multi-Chain Support**: Query data from multiple blockchain networks (Cronos zkEVM, Cronos EVM)
- **Automated Schema Management**: Automatically download and cache table schemas
- **Cost Controls**: Built-in query limits and timeouts to manage BigQuery costs
- **Comprehensive Blockchain Tools**: Specialized tools for querying blocks, transactions, and addresses
- **Real-time Results**: Get instant answers to blockchain data questions

## Requirements

- Python 3.12+
- Google Cloud Project with BigQuery enabled
- OpenAI API key (or other supported LLM provider)
- Crypto.com Dashboard API key
- Google Cloud credentials configured

## Installation

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables**:
   Create a `.env` file in the project root:
   ```bash
   # Required
   PROJECT_ID=your-google-cloud-project-id
   OPENAI_API_KEY=your-openai-api-key
   DASHBOARD_API_KEY=your-cryptocom-dashboard-api-key
   
   # Optional
   DEBUG_LOGGING=false
   ```

3. **Configure Google Cloud credentials**:
   ```bash
   # Option 1: Service account key
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/your/service-account-key.json"
   
   # Option 2: gcloud CLI
   gcloud auth application-default login
   ```

## Usage

### Basic Usage

Run the main script:
```bash
python bigquery.py
```

The script will:
1. Initialize the BigQuery connection
2. Download and cache table schemas
3. Start an interactive session for natural language queries

### Example Queries

Examples of natural language questions you can ask about blockchain data:

```
"How many transactions were there in the last 24 hours?"
"What are the top 10 addresses by transaction count?"
"Show me the latest blocks"
"What's the average gas price for recent transactions?"
"Find all transactions with value greater than 1000 CRO"
"What blocks were mined in the last hour?"
```

### Supported Datasets

The integration supports multiple blockchain datasets:

- **Cronos zkEVM Mainnet**: `cronos_zkevm_mainnet`
- **Cronos EVM Mainnet**: `public_preview___blockchain_analytics_cronos_mainnet`

## Environment Variables Required:
- PROJECT_ID=your-google-cloud-project-id
- OPENAI_API_KEY=your-openai-api-key
- DASHBOARD_API_KEY=your-dashboard-api-key
- PRIVATE_KEY=your-private-key

