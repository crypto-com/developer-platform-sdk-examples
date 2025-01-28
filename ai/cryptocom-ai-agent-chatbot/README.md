# Crypto.com AI Agent Chatbot

The **Crypto.com AI Agent Chatbot** is a Vite-powered React application integrated with OpenAI's NLP capabilities and the Crypto.com Developer Platform. This chatbot app allows users to interact with blockchain services through natural language, making it easy to query data or perform actions on the blockchain.

![vite](https://img.shields.io/badge/Vite-frontend-blue) ![react](https://img.shields.io/badge/React-JS-orange)

## Features

- Real-time chatbot interface for interacting with the Crypto.com AI Agent API.
- Integrated with **OpenAI** for processing natural language queries.
- Easy-to-use front end for querying blockchain services like retrieving block data, checking wallet balances, and more.
- Built with **Vite** for fast development and optimized builds.
- **React + TypeScript**: Fully typed for better developer experience.

## Getting Started

Follow the instructions below to get the project up and running locally.

### Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v18 or higher);
- **npm** or **yarn**;
- [AI-Agent-Service](https://github.com/crypto-com/developer-platform-sdk-examples/tree/main/ai/cryptocom-ai-agent-service);
- [AI-Agent-Signer-App](https://github.com/crypto-com/cdc-ai-agent-signer-app) for transaction signing.

### Installation

1. **Clone the repository**:

   ```bash
    git clone https://github.com/crypto-com/developer-platform-sdk-examples.git
    cd developer-platform-sdk-examples/ai/cryptocom-ai-agent-chatbot
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:

   Create a `.env` file in the root of `ai/cryptocom-ai-agent-chatbot`. You can refer to the `.env.example` file for the required variables:

   ```bash
   VITE_BASE_API_URL=http://localhost:8000
   VITE_OPEN_AI_KEY=<your-openai-api-key>
   VITE_DEEP_SEEK_KEY=<your-deepseek-api-key>
   VITE_GEMINI_KEY=<your-gemini-api-key>
   
   These environment variables will configure the app to communicate with the Crypto.com AI Agent Service API, "VITE_BASE_API_URL" stand for 
   ```

### Running the Application

Start the development server:

```bash
npm run dev
```

This will start the Vite development server. Open your browser and navigate to [http://localhost:5173](http://localhost:5173) to see the chatbot in action.

### Building for Production

To build the app for production:

```bash
npm run build
```

This command will generate the static files in the `dist` folder, optimized for deployment.

## Usage

Once the application is running, you can interact with the chatbot in real-time. The chatbot is connected to the **Crypto.com AI Agent Service**, which processes your queries and returns blockchain data or executes blockchain commands.

### Example Queries

You can try some example queries such as:

- **"What's the latest block?"**
- **"Check balance for address 0x...?"**
- **"Fetch transaction details for hash 0x...?"**

The responses are generated using OpenAI's NLP model, and the application then interacts with the blockchain using the Crypto.com Developer Platform.

## Project Structure

The core files and folders are organized as follows:

```plaintext
src/
│
├── components/         # Reusable React components
├── hooks/              # Custom React hooks
├── services/           # API interaction logic (with Crypto.com AI Agent)
├── assets/             # Static assets such as images or styles
└── App.tsx             # Main entry point for the application
```

### Key Components:

- **Chatbot**: The main interface for interacting with the Crypto.com AI Agent API.
- **Message Display**: Displays the conversation between the user and the AI agent.
- **API Integration**: Services that handle communication with the AI Agent Service API and OpenAI.

## Technologies Used

- **Vite**: Fast build tool and dev server for modern web apps.
- **React**: Front-end JavaScript library for building user interfaces.
- **TypeScript**: Type safety for JavaScript code.
- **OpenAI API**: For NLP processing of natural language queries.
- **Crypto.com AI Agent Service API**: Backend service for interacting with blockchain services.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
