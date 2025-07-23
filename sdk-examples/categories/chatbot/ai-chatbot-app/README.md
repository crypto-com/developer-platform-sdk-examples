# AI Chatbot App (React + Vite)

This is the front-end interface for the Crypto.com AI Chatbot, built using React, Vite, and TypeScript. It provides a floating chat UI that communicates with the Flask backend.

## Table of Contents

- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Build](#build)
- [License](#license)

## Installation

Navigate to the app folder and install dependencies:

```sh
cd developer-platform-sdk-examples/sdk-examples/categories/chatbot/ai-chatbot-app
npm install
```

## Environment Variables

Create a `.env` file in the root of the `ai-chatbot-app` directory:

```env
VITE_CHATBOT_SERVER_BASE_URL=http://localhost:5000
```

This ensures the React app knows how to reach the Flask backend.

## Usage

To run the app in development mode:

```sh
npm run dev
```

Open your browser at `http://localhost:5173`.

## Build

To generate a production-ready build:

```sh
npm run build
```

To preview the build:

```sh
npm run preview
```

## Features

- Floating chat widget with toggle
- Scroll-to-bottom on new message
- Markdown support for AI responses
- Styled components for custom dark theme

## License

This project is licensed under the MIT License. See the LICENSE file for details.
