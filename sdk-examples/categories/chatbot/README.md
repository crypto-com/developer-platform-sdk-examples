# AI Chatbot Example

This monorepo contains both the **AI-powered chatbot backend** (Flask server) and the **React frontend** (Vite app) for interacting with the chatbot.

## Table of Contents

- [Structure](#structure)
- [Installation](#installation)
- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [License](#license)

## Structure

```txt
├── README.md                 # Monorepo root guide
├── ai-chatbot-server/       # Python Flask backend
│   └── README.md
├── ai-chatbot-app/          # React + Vite frontend
│   └── README.md
```

## Installation

### 1. Clone the repository

```sh
git clone https://github.com/crypto-com/developer-platform-sdk-examples.git
cd developer-platform-sdk-examples/sdk-examples/categories/chatbot
```

### 2. Backend Setup (Python)

```sh
cd ai-chatbot-server
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### 3. Frontend Setup (React + Vite)

```sh
cd ../ai-chatbot-app
npm install
```

## Usage

### Start the backend (Flask)

```sh
cd ai-chatbot-server
flask run
```

This will start the Flask server at `http://localhost:5000`

### Start the frontend (Vite)

```sh
cd ai-chatbot-app
npm run dev
```

This will start the React app at `http://localhost:5173`

Make sure to set `VITE_CHATBOT_SERVER_BASE_URL=http://localhost:5000` in the frontend `.env` file.

## Environment Variables

You will need the following environment variables for the Flask server (`ai-chatbot-server/.env`):

```env
OPENAI_API_KEY=your-openai-api-key
SDK_API_KEY=your-sdk-api-key
PRIVATE_KEY=your-wallet-private-key
AI_CHATBOT_APP_URL=http://localhost:5173
```

## License

This project is licensed under the MIT License. See the LICENSE file for details.
