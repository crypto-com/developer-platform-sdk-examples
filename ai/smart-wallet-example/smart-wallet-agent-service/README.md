# Smart Wallet Service 

This repository demonstrates the implementation of a **Smart Wallet Service** that integrates with the **Cronos zkEVM** blockchain. The service enables on-chain transactions, wallet management, AI-driven copy trading, and event listening.

**note: All the features are experimental and not intended for production
---

## Features

### Integration
- **Wallet Management:**
  - Generate wallets programmatically.
  - Retrieve wallet balances.
  - Manage transactions and monitor their statuses.

- **Copy Trading:**
  - Automatically monitors and replicates transactions from top accounts.

- **Event Listening:**
  - Listens to blockchain events and processes relevant transactions in real-time.

---

## Set-Up

### Prerequisites

1. **Node.js**: Version 20 or above.
2. **Dependencies**: Install the required packages using the following command:
   ```bash
   npm install
   ```
   Key dependencies:
   - **zksync-ethers** (v6.9.0)
   - **ethers.js** (v6.x)
   - **express**: For API routing.

### Environment Variables

Set up a `.env` file in the root directory with the following variables:

```plaintext
HTTP_ENDPOINT=<zkEVM-http-endpoint>
WS_ENDPOINT=<zkEVM-websocket-endpoint>
TARGET_ADDRESS=<address-to-monitor>
WBTC_ADDRESS=<wrapped-bitcoin-address>
```

---

## Simulation Steps for Smart Wallet Contract

Follow these steps to simulate the smart wallet contract functionality:

### 1. **Initialize Copy Trading**

Send a query to the AI agent to start copy trading.

**Endpoint:**
```http
POST /api/v1/cdc-ai-agent-service/query
```

**Payload:**
```json
{
    "query": "hi, can you start copy trading the top accounts?",
    "options": {
        "openAI": {
            "apiKey": "key"
        },
        "chainId": 240,
        "explorerKeys": {
            "cronosZkEvmTestnetKey": "key"
        }
    }
}
```

**Response:**
```json
{
    "status": "success",
    "hasErrors": false,
    "results": [
        {
            "status": "Success",
            "data": {
                "address": "AI_AGENT_WALLET",
                "message": "I will copy trade from now on the transaction from the top accounts. I have generated a wallet: AI_AGENT_WALLET. Please authorize this wallet to send transactions from your account."
            }
        }
    ],
    "context": [
        {
            "role": "user",
            "content": "hi, can you start copy trading the top accounts?"
        },
        {
            "role": "assistant",
            "content": "[{\"status\":\"Success\",\"data\":{\"address\":\"AI_AGENT_WALLET\",\"message\":\"I will copy trade from now on the transaction from the top accounts. I have generated a wallet: AI_AGENT_WALLET. Please authorize this wallet to send transactions from your account.\"}}]"
        }
    ]
}
```

---

### 2. **Deploy the Smart Wallet Contract**

Deploy the smart wallet contract using the address generated in the previous step.

#### Step 1: Deploy the Smart Wallet
**Command:**
```bash
cd ../smart-wallet-core-solidty
npx hardhat compile
yarn deploy --args '0x00a897Ac6cb6f1566D638c3596a45d3Bb28757DC'

Replace `0x00a897Ac6cb6f1566D638c3596a45d3Bb28757DC` with the address from the AI agent response.

#### Step 2: Verify the Deployment
After deploying, confirm the smart wallet address is returned by the deployment script and ready for use.

---

### 3. **Return Smart Wallet Address**

Send the smart wallet address back to the AI agent to confirm copy trading.

**Endpoint:**
```http
POST /api/v1/cdc-ai-agent-service/query
```

**Payload:**
```json
{
    "query": "here is my address SMART_WALLET_ADDRESS",
    "options": {
        "openAI": {
            "apiKey": "key"
        },
        "chainId": 240,
        "explorerKeys": {
            "cronosZkEvmTestnetKey": "key"
        }
    }
}
```

**Response:**
```json
{
    "status": "success",
    "hasErrors": false,
    "results": [
        {
            "status": "Success",
            "data": {
                "message": "Starting to copy top accounts for address SMART_WALLET_ADDRESS"
            }
        }
    ],
    "context": [
        {
            "role": "user",
            "content": "here is my address SMART_WALLET_ADDRESS"
        },
        {
            "role": "assistant",
            "content": "[{\"status\":\"Success\",\"data\":{\"message\":\"Starting to copy top accounts for address SMART_WALLET_ADDRESS\"}}]"
        }
    ]
}
```

---

### 4. **Simulate Copy Trading**

To simulate copy trading, deploy a random transaction using the trader smart wallet.

**Command:**
```bash
npx hardhat deploy-zksync --script sendTx.ts --network cronosZkEvmTestnet
```

---

### 5. **Monitor Transactions**

Check the smart wallet transactions in the **Cronos zkEVM testnet explorer**:
- [Cronos zkEVM Explorer Testnet](https://explorer.zkevm.cronos.org/testnet)

---

## Usage

### Blockchain Operations

#### Generate Wallet
The **SmartWalletService** can create a new wallet and return its details:
```typescript
const walletDetails = await smartWalletService.accountRequest();
console.log(walletDetails);
```

#### Retrieve Transactions
Fetch and clear the transaction history:
```typescript
const transactions = smartWalletService.getTransaction();
console.log(transactions);
```

#### Copy Trading
Start copy trading for a specific address:
```typescript
smartWalletService.initCopyTrade('<address>');
```

---

### API Endpoints

The service exposes the following endpoints:

- **Health Check**:
  ```http
  GET /healthcheck
  ```
  Returns the application's health status.

- **Query Processing**:
  ```http
  POST /v1/cdc-ai-agent-service/query
  ```
  Processes queries and triggers blockchain operations.

- **Transaction Events**:
  ```http
  GET /v1/cdc-ai-agent-service/events
  ```
  Returns the status of detected and completed transactions.

---

## Troubleshooting

1. **Insufficient Funds Error:**
   Ensure your wallet has enough ETH for gas fees and transaction values. Check balances using:
   ```typescript
   const balance = await provider.getBalance(wallet.address);
   console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
   ```

2. **Contract Verification Issues:**
   - Verify the correct chain ID and API key.
   - Ensure the contract constructor arguments are encoded properly.

3. **TLS Warnings:**
   Ensure `NODE_TLS_REJECT_UNAUTHORIZED` is not set to `0` in production.

---

## Further Reading

- [Cronos zkEVM Documentation](https://docs.zkevm.cronos.org)
- [zkSync SDK Documentation](https://docs.zksync.io/build/sdks/js/zksync-ethers/getting-started.html)
- [Ethers.js Documentation](https://docs.ethers.org/v6/)
