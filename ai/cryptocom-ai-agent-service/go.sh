#!/bin/bash

rm -rf node_modules
yarn

# Set environment variables
export EXPLORER_API_KEY=$CRONOS_ZKEVM_TESTNET_API
export NODE_ENV=development

# Run yarn dev
yarn dev


