# Transaction Example

This example demonstrates how to use the `@crypto.com/developer-platform-client` Transaction module to interact with blockchain transactions.

## Features

This example showcases the following Transaction functions:

- **getTransactionsByAddress**: Fetch transactions for a specific wallet address
- **getTransactionByHash**: Fetch a transaction by its hash
- **getTransactionStatus**: Check transaction status by hash
- **getTransactionCount**: Get transaction count for a wallet
- **getGasPrice**: Fetch current gas price
- **getFeeData**: Get current fee data
- **estimateGas**: Estimate gas for a transaction

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to the provided local URL (typically `http://localhost:5173`)

## Usage

The application provides a user interface to test various Transaction module functions. You can:

- Enter wallet addresses to fetch transaction history
- Look up specific transactions by hash
- Check transaction status
- Get current gas prices and fee data
- Estimate gas for transactions

## API Key Requirements

Some functions may require an explorer API key. Make sure to provide valid credentials when testing blockchain explorer features.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build 