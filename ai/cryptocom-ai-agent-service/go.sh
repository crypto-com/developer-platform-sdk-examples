#!/bin/bash

if [ -z "$CRONOS_ZKEVM_TESTNET_API" ]; then
  echo "CRONOS_ZKEVM_TESTNET_API environment variable is not set. Please set it before running the script."
  exit 1
else
  echo "CRONOS_ZKEVM_TESTNET_API is set successfully"
fi

rm -rf node_modules
yarn

# Set environment variables
export EXPLORER_API_KEY=$CRONOS_ZKEVM_TESTNET_API
export NODE_ENV=development

# Run yarn dev
yarn dev


