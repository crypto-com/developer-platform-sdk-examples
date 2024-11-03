#!/bin/bash

# Set environment variables
export VITE_OPENAI_API_KEY=${OPENAI_API_KEY}
export VITE_EXPLORER_API_KEY=${CRONOS_ZKEVM_TESTNET_AP}
export VITE_AGENT_SERVICE_URL=
export VITE_BASE_API_URL=http://localhost:8000
export VITE_BASE_WEBAPP_URL=http://localhost:8020

# Run yarn dev
yarn dev



