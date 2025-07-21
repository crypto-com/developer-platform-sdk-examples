# Wallet Playground App (React + Vite)

This is the front-end interface for the Crypto.com Wallet Playground, built using React, Vite, and TypeScript. It provides a simple UI to create wallets using the official Crypto.com Developer Platform SDK.

## Table of Contents

- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Build](#build)
- [Features](#features)
- [License](#license)

## Installation

Navigate to the app folder and install dependencies:

```sh
cd sdk-examples/categories/wallet
npm install
```

## Environment Variables

This example uses a client-side SDK and may require an API key. You can initialize the SDK inside your app code like so:

```ts
import { Client } from '@crypto.com/developer-platform-client';

Client.init({
  apiKey: 'sk-proj-...',
});
```

> **Note:** Never expose real or production API keys in a public or client-side app.

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

- Simple wallet creation using the Crypto.com Developer SDK
- Displays:

  - Wallet address
  - Private key
  - Mnemonic phrase

- Clean, dark-themed UI with styled components

## License

This project is licensed under the MIT License. See the LICENSE file for details.
