# Crypto.com AI Agent Service API

This service is part of the **Crypto.com Developer Platform** SDK, designed to facilitate querying blockchain services (Developer Platform Client) via Natural Language Processing (NLP) integrated with OpenAI. The core logic of the service interprets user queries, matches them with blockchain functions, and interacts with blockchain nodes and explorers.

![vite](https://img.shields.io/badge/TypeScript-blue) ![react](https://img.shields.io/badge/Node-JS-orange)

## Table of Contents

- [Background](#background)
- [Features](#features)
- [How It Works](#how-it-works)
- [Installation and Running the API](#installation-and-running-the-api)
- [Docker Setup](#docker-setup)
  - [Building and Running the Container](#building-and-running-the-container)
- [API Endpoints](#api-endpoints)
  - [Health Check](#health-check)
  - [Query Route](#query-route)
- [Swagger Documentation](#swagger-documentation)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)
- [License](#license)

## Background

The Crypto.com AI Agent Service API integrates multiple technologies to provide a seamless interaction with blockchain services via natural language queries, using the Crypto.com Developer Platform Client.

## Features

- **NLP Query Mapping**: Maps user queries to blockchain functions using OpenAI.
- **Blockchain Commands**: Perform blockchain-specific commands such as retrieving blocks, creating wallets, and more.
- **Health Monitoring**: A health check route to monitor the API’s status and uptime.

## How It Works

The service exposes two main API routes:

1. **Health Check Route**: Provides basic uptime and response time of the service, allowing users or automated systems to monitor the API.
2. **Query Route**: Allows the user to input a query in natural language, which is processed by the core Agent logic. This logic, powered by OpenAI, maps the input to a specific blockchain function and executes the corresponding action on the blockchain.

The architecture:
- The **query server** accepts a query and processes it through the agent logic.
- **OpenAI** processes the query using NLP and matches it with a relevant function.
- The matched function is then executed by interacting with the **blockchain** via **Crypto.com Developer Platform Client** to retrieve or perform the desired action.

## Installation and Running the API

### Prerequisites

- **Node.js**: You need Node.js (v18 or higher) installed.
- **npm**: Make sure npm is installed.
- **API Keys**: You will need API keys for OpenAI and blockchain explorer keys when initializing the client in agent.service.ts.

### Steps

1. **Clone the repository**:

    ```bash
    git clone https://github.com/developer-platform-sdk-examples.git
    cd ai/cryptocom-ai-agent-service
    ```

2. **Install dependencies**:

    ```bash
    npm install
    ```

3. **Create a `.env` file** - at the root of `ai/cryptocom-ai-agent-service` with the following content, or refer to the `.env.example` file:

    ```bash
    NODE_ENV=development
    EXPLORER_API_KEY=<your-chain-explorer-api-key>
    ```

4. **Run the development server**:

    ```bash
    npm run dev
    ```

5. **Production build**:

    ```bash
    npm run build
    npm start
    ```

## API Endpoints

### Health Check

- **Endpoint**: `/healthcheck`
- **Method**: `GET`
- **Description**: Returns the uptime and health status of the service.

- **Response Example**:

    ```json
    {
      "status": "success",
      "result": {
        "uptime": 120.34,
        "responsetime": [0, 252939],
        "message": "OK",
        "timestamp": 1632846348163
      }
    }
    ```

### Query Route

#### Querying with OpenAI Model
- **Endpoint**: `/api/v1/cdc-ai-agent-service/query`
- **Method**: `POST`
- **Description**: Takes a natural language query, maps it to a blockchain command via OpenAI, and executes the command.

- **Request Body Example**:

    ```json
    {
      "query": "get latest block",
      "options": {
        "openAI": {
          "apiKey": "<your-openai-api-key>",
          "model": "gpt-4"
        },
        "llmProvider": "openai",
        "chainId": 282,
        "explorer": {
          "apiKey": "<your-explorer-api-key>"
        },
      }
    }
    ```

- **Response Example**:

    ```json
    {
      "status": "success",
      "result": {
        "action": "getBlock",
        "message": "Retrieved latest block",
        "data": {
          "blockNumber": 123456,
          "timestamp": "2023-09-12T10:12:15Z"
        }
      }
    }
    ```

#### Querying with DeepSeek Model
- **Endpoint**: `/api/v1/cdc-ai-agent-service/query`
- **Method**: `POST`
- **Description**: Takes a natural language query, maps it to a blockchain command via DeepSeek, and executes the command.

- **Request Body Example**:

    ```json
    {
      "query": "get latest block",
      "options": {
        "deepSeek": {
          "apiKey": "<your-deepseek-api-key>",
          "model": "deepseek-chat"
        },
        "llmProvider": "deepseek",
        "chainId": 282,
        "explorer": {
          "apiKey": "<your-explorer-api-key>"
        },
      }
    }
    ```

- **Response Example**:

    ```json
    {
      "status": "success",
      "result": {
        "action": "getBlock",
        "message": "Retrieved latest block",
        "data": {
          "blockNumber": 123456,
          "timestamp": "2023-09-12T10:12:15Z"
        }
      }
    }
    ```

## Project Structure

The core files and folders are organized as follows:

```plaintext
src/
│
├── controllers/        # Route handlers
├── routes/             # API routes
├── services/           # Core logic services (e.g., agent, query service)
├── lib/                # Helper modules, including Swagger setup
└── index.ts            # Main entry point for the Express app
```

## Technologies Used

- **Node.js**: Backend JavaScript runtime.
- **Express**: Web framework for building the API.
- **OpenAI**: NLP processing for user queries.
- **TypeScript**: Type safety for the project.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
