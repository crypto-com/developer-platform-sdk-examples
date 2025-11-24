#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi


echo "Testing cryptocom-agent-client Lambda locally..."
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running"
    exit 1
fi

# Build test image
echo "Building Docker image..."
docker buildx build --platform linux/arm64 --provenance=false --load -t cryptocom-agent-lambda:test .

# Stop existing container
docker stop cryptocom-agent-test 2>/dev/null || true

# Start container
echo "Starting Lambda emulator..."
docker run --rm -d --platform linux/arm64 -p 9000:8080 \
    --name cryptocom-agent-test \
    cryptocom-agent-lambda:test

sleep 3

# Test request
USER_INPUT="${1:-What is the current time?}"
echo "Testing with: $USER_INPUT"
echo ""

PAYLOAD=$(jq -n \
    --arg input "$USER_INPUT" \
    --arg openai_key "$OPENAI_API_KEY" \
    --arg dashboard_key "$DASHBOARD_API_KEY" \
    '{user_input: $input, openai_api_key: $openai_key, dashboard_api_key: $dashboard_key}')

curl -s -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" \
    -d "$PAYLOAD" | jq '.'

echo ""

# Cleanup
docker stop cryptocom-agent-test 2>/dev/null || true

echo "Local test complete!"
