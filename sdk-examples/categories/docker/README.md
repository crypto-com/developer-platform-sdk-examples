# cryptocom-agent-client AWS Lambda Example

Deploy [cryptocom-agent-client](https://pypi.org/project/cryptocom-agent-client/) as a serverless AWS Lambda function using Docker.

## Overview

This example demonstrates how to:
- Deploy a cryptocom-agent-client powered AI agent to AWS Lambda
- Use Docker containers for Lambda deployment
- Create custom tools (functions) the agent can invoke
- Query blockchain data through the Crypto.com Developer Platform

## Features

- **AI Agent**: Uses OpenAI GPT-4o-mini with cryptocom-agent-client
- **Custom Tools**:
  - `get_current_time()` - Returns current local and UTC time
  - `fibonacci(n)` - Calculates the nth Fibonacci number
- **Blockchain Integration**: Query Cronos blockchain data via Dashboard API
- **Serverless**: Auto-scaling, pay-per-use AWS Lambda deployment

## Prerequisites

- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate credentials
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
- [jq](https://jqlang.github.io/jq/) for JSON processing
- AWS account with permissions for Lambda, ECR, and IAM
- [OpenAI API key](https://platform.openai.com/api-keys)
- [Crypto.com Developer Platform API key](https://developer.crypto.com/)

## Quick Start

### 1. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```bash
# AWS (use profile or access keys)
AWS_PROFILE=default
AWS_DEFAULT_REGION=us-east-1

# API Keys
OPENAI_API_KEY=sk-...
DASHBOARD_API_KEY=your-dashboard-api-key
```

### 2. Deploy to AWS

```bash
./deploy.sh
```

This will:
- Build Docker image (ARM64 optimized)
- Create ECR repository and push image
- Create IAM role with basic execution permissions
- Deploy Lambda function (300s timeout, 1024MB memory)

### 3. Test the Function

```bash
# Default prompt
./run.sh

# Custom prompts
./run.sh "What is the current time?"
./run.sh "Calculate fibonacci of 10"
./run.sh "Get the latest block on Cronos"
```

### 4. Clean Up

```bash
./cleanup.sh
```

## Local Testing

Test the Lambda function locally before deploying:

```bash
./test-local.sh "What is the current time?"
```

## Project Structure

```
.
├── handler.py          # Lambda handler with AI agent
├── requirements.txt    # Python dependencies
├── Dockerfile          # Container configuration
├── deploy.sh           # Deploy to AWS Lambda
├── run.sh              # Invoke the Lambda function
├── test-local.sh       # Test locally with Docker
├── cleanup.sh          # Remove all AWS resources
└── .env.example        # Environment template
```

## Customization

### Adding Custom Tools

Edit `handler.py` to add your own tools:

```python
from crypto_com_agent_client import tool

@tool
def my_custom_tool(param: str) -> str:
    """
    Description of what this tool does.

    Args:
        param: Description of parameter

    Returns:
        Description of return value
    """
    # Your implementation
    return result
```

Register the tool in the agent initialization:

```python
agent = Agent.init(
    llm_config={...},
    blockchain_config={...},
    plugins={
        "tools": [get_current_time, fibonacci, my_custom_tool],
    },
)
```

### Changing the LLM Model

Modify the `llm_config` in `handler.py`:

```python
llm_config={
    "provider": Provider.OpenAI,
    "model": "gpt-4o",  # or "gpt-3.5-turbo", etc.
    "provider-api-key": openai_api_key,
}
```

### Using Different Providers

The cryptocom-agent-client supports multiple LLM providers:

```python
from crypto_com_agent_client.lib.enums.provider_enum import Provider

# AWS Bedrock
llm_config={
    "provider": Provider.AWSBedrock,
    "model": "anthropic.claude-3-haiku-20240307-v1:0",
}

# Google AI
llm_config={
    "provider": Provider.GoogleAI,
    "model": "gemini-pro",
    "provider-api-key": google_api_key,
}
```

## Architecture

```
┌─────────────┐    ┌─────────────────┐    ┌──────────────┐
│   Client    │───>│  AWS Lambda     │───>│   OpenAI     │
│  (run.sh)   │    │  (handler.py)   │    │   GPT-4o     │
└─────────────┘    └────────┬────────┘    └──────────────┘
                            │
                            v
                   ┌─────────────────┐
                   │   Crypto.com    │
                   │   Dashboard     │
                   │   (Blockchain)  │
                   └─────────────────┘
```

## Lambda Configuration

| Setting | Value |
|---------|-------|
| Runtime | Python 3.12 (Docker) |
| Architecture | ARM64 |
| Timeout | 300 seconds |
| Memory | 1024 MB |

## AWS Resource Identifiers

### What is ARN?

ARN (Amazon Resource Name) is a unique identifier for any resource in AWS.

**Format:**
```
arn:aws:<service>:<region>:<account-id>:<resource-type>/<resource-name>
```

**Example for this Lambda:**
```
arn:aws:lambda:us-east-1:123456789012:function:cryptocom-agent-lambda
         │       │          │              │
         │       │          │              └─ Function name
         │       │          └─ Your AWS account ID
         │       └─ Region (e.g., us-east-1)
         └─ Service (lambda)
```

### Resource Identifiers Used

| Resource | Identifier |
|----------|------------|
| Lambda Function | `cryptocom-agent-lambda` |
| ECR Repository | `cryptocom-agent-lambda` |
| IAM Role | `lambda-exec-cryptocom-agent` |
| Docker Image | `cryptocom-agent-lambda:latest` |

When invoking the Lambda in the same account/region, scripts use just the function name. AWS resolves the full ARN automatically from your credentials.

## Security Notes

- API keys are passed at runtime in the request payload, not stored in Lambda environment
- The IAM role has minimal permissions (AWSLambdaBasicExecutionRole only)
- Never commit `.env` files with real credentials

## Troubleshooting

### Docker Build Issues
- Ensure Docker Desktop is running
- On macOS, the build uses ARM64 for Apple Silicon optimization

### Lambda Timeout
- Default timeout is 300 seconds
- First invocation may take longer due to cold start
- Subsequent invocations use cached agent instance

### ECR Push Failures
- Verify AWS credentials are configured: `aws sts get-caller-identity`
- Check ECR permissions in your AWS account

## Related Resources

- [cryptocom-agent-client on PyPI](https://pypi.org/project/cryptocom-agent-client/)
- [Crypto.com Developer Platform](https://developer.crypto.com/)
- [AWS Lambda Container Images](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)

## License

Apache-2.0
