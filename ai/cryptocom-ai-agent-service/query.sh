curl -X POST http://localhost:8000/api/v1/cdc-ai-agent-service/query \
-H "Content-Type: application/json" \
-d '{
  "query": "Get the latest block",
  "options": {
    "openAI": {
      "apiKey": "'"$OPENAI_API_KEY"'"
    },
    "chainId": 240,
    "explorer": {
      "apiKey": "'"$CRONOS_ZKEVM_TESTNET_API"'"
    }
  }
}'