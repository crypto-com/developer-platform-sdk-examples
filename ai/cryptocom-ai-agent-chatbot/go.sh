#!/bin/bash

if [ -z "$OPENAI_API_KEY" ]; then
  echo "OPENAI_API_KEY environment variable is not set. Please set it before running the script."
  exit 1
else
  echo "OPENAI_API_KEY is set successfully"
fi

# Set environment variables
export VITE_OPENAI_API_KEY=${OPENAI_API_KEY}
export VITE_AGENT_SERVICE_URL=
export VITE_BASE_API_URL=http://localhost:8000
export VITE_BASE_WEBAPP_URL=http://localhost:8020

# Run yarn dev
yarn dev




