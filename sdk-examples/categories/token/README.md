# Token Example

This example demonstrates how to use the `@crypto.com/developer-platform-client` Token module to interact with blockchain tokens.

## Table of Contents

- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Features](#features)
- [Usage](#usage)
- [Build](#build)
- [Development](#development)
- [License](#license)

## Installation

Navigate to the app folder and install dependencies:

```sh
cd developer-platform-sdk-examples/sdk-examples/categories/token
npm install
```

## Environment Variables

This example uses a client-side SDK and may require an API key. You can initialize the SDK inside your app code like so:

```ts
import { Client } from "@crypto.com/developer-platform-client";

Client.init({
  apiKey: "sk-proj-...",
});
```

> **Note:** Never expose real or production API keys in a public or client-side app.

## Features

## Features

This example showcases the following **Token module** functions:

- **getNativeTokenBalance**: Retrieve the native token balance for a given wallet address (supports `.cro` addresses)
- **getERC20TokenBalance**: Retrieve the ERC20 token balance for a wallet and contract address
- **getERC721TokenBalance**: Retrieve the ERC721 token balance for a wallet and contract address
- **getTokenOwner**: Get the owner of a specific ERC721 token ID
- **getTokenUri**: Get the token URI for a specific ERC721 token ID
- **getERC20Metadata**: Fetch metadata (name, symbol, decimals) for an ERC20 token
- **getERC721Metadata**: Fetch metadata for an ERC721 token contract
- **transferToken**: Initiate a native or ERC20 token transfer transaction
- **wrapToken**: Wrap native tokens into wrapped tokens
- **swapToken**: Swap tokens between ERC20 contracts

## Usage

To run the app in development mode:

```sh
npm run dev
```

Open your browser and navigate to the provided local URL (typically `http://localhost:5173`).

The application provides a user interface to test Token module functions. You can:

- Enter a wallet address to fetch native, ERC20, or ERC721 token balances
- View token metadata (name, symbol, decimals) for ERC20 and ERC721 contracts
- Initiate token transfers, swaps, and wraps
- Fetch ERC721 token owner and token URI information
- View formatted JSON responses with token data

## Build

To generate a production-ready build:

```sh
npm run build
```

To preview the build:

```sh
npm run preview
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## API Key Requirements

Some functions may require valid API credentials. Make sure to provide valid credentials when testing blockchain transaction features.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
