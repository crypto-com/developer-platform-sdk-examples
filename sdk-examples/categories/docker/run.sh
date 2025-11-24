#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi


FUNCTION_NAME="cryptocom-agent-lambda"
USER_INPUT="${1:-What is the current time?}"

echo "Invoking cryptocom-agent-client Lambda..."
echo "Prompt: $USER_INPUT"
echo ""

# Create payload
PAYLOAD=$(jq -n \
    --arg input "$USER_INPUT" \
    --arg openai_key "$OPENAI_API_KEY" \
    --arg dashboard_key "$DASHBOARD_API_KEY" \
    '{user_input: $input, openai_api_key: $openai_key, dashboard_api_key: $dashboard_key}')

# Invoke Lambda
aws lambda invoke \
    --function-name ${FUNCTION_NAME} \
    --region ${AWS_DEFAULT_REGION} \
    --cli-binary-format raw-in-base64-out \
    --payload "$PAYLOAD" \
    response.json

echo "Response:"
cat response.json | jq '.'

echo ""
echo "Examples:"
echo "  ./run.sh \"What is the current time?\""
echo "  ./run.sh \"Calculate fibonacci of 10\""
echo "  ./run.sh \"Get the latest block on Cronos\""
