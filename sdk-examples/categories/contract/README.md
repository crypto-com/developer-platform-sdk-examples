# Contract Example

This example demonstrates how to use the `@crypto.com/developer-platform-client` Contract module to interact with blockchain contracts.

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
cd developer-platform-sdk-examples/sdk-examples/categories/contract
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

This example showcases the following **Contract module** functions:

- **getContractCode**: Fetch a contract bytecode by its contract address
- **getContractAbi**: Fetch contract abi for a specific contract

## Usage

To run the app in development mode:

```sh
npm run dev
```

Open your browser and navigate to the provided local URL (typically `http://localhost:5173`).

The application provides a user interface to test Contract module functions. You can:

- Enter contract address to fetch detailed contract information
- View formatted JSON responses with contract data

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
