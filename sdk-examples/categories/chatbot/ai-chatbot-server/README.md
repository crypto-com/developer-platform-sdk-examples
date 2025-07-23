# AI Chatbot Server (Flask Backend)

This is the Flask-based backend server for the Crypto.com AI Chatbot. It provides a single API endpoint to interact with an AI agent powered by the `crypto_com_agent_client` library.

## Table of Contents

- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [API Endpoint](#api-endpoint)
- [License](#license)

## Installation

### 1. Navigate to the server directory:

```sh
cd sdk-examples/categories/ai-chatbot-server
```

### 2. Create a virtual environment:

```sh
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
```

### 3. Install dependencies:

```sh
pip install -r requirements.txt
```

## Environment Variables

Create a `.env` file in the `ai-chatbot-server` directory with the following content:

```env
OPENAI_API_KEY=your-openai-api-key
SDK_API_KEY=your-sdk-api-key
PRIVATE_KEY=your-wallet-private-key
AI_CHATBOT_APP_URL=http://localhost:5173
```

## Usage

Start the Flask server locally:

```sh
flask run --port=5000
```

The server will be available at `http://localhost:5000`

## API Endpoint

### `POST /chat`

**Request Body:**

```json
{
  "message": "Hello",
  "thread": [{ "role": "user", "content": "Hi" }]
}
```

**Response:**

```json
{
  "reply": "Hello! How can I assist you?",
  "thread": [
    { "role": "user", "content": "Hi" },
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hello! How can I assist you?" }
  ]
}
```

## License

This project is licensed under the MIT License. See the LICENSE file for details.
