#!/bin/bash

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Auto-detect AWS Account ID if not set
if [ -z "$AWS_ACCOUNTID" ]; then
    AWS_ACCOUNTID=$(aws sts get-caller-identity --query Account --output text)
fi

echo "Cleaning up cryptocom-agent-client Lambda resources..."
echo "AWS Account: $AWS_ACCOUNTID"
echo "AWS Region: $AWS_DEFAULT_REGION"
echo ""

# Configuration
REPO_NAME="cryptocom-agent-lambda"
FUNCTION_NAME="cryptocom-agent-lambda"
ROLE_NAME="lambda-exec-cryptocom-agent"

# Delete Lambda function
echo "Deleting Lambda function..."
aws lambda delete-function \
    --function-name ${FUNCTION_NAME} \
    --region ${AWS_DEFAULT_REGION} 2>/dev/null && echo "  Lambda function deleted" || echo "  Lambda function not found"

# Delete ECR repository
echo "Deleting ECR repository..."
aws ecr delete-repository \
    --repository-name ${REPO_NAME} \
    --region ${AWS_DEFAULT_REGION} \
    --force 2>/dev/null && echo "  ECR repository deleted" || echo "  ECR repository not found"

# Detach policy and delete role
echo "Cleaning up IAM role..."
aws iam detach-role-policy \
    --role-name ${ROLE_NAME} \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole 2>/dev/null || true

aws iam delete-role \
    --role-name ${ROLE_NAME} 2>/dev/null && echo "  IAM role deleted" || echo "  IAM role not found"

# Clean up local files
echo "Cleaning up local files..."
rm -f response.json

# Remove local Docker images
echo "Removing Docker images..."
docker rmi cryptocom-agent-lambda:latest 2>/dev/null || true
docker rmi cryptocom-agent-lambda:test 2>/dev/null || true
docker rmi ${AWS_ACCOUNTID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/${REPO_NAME}:latest 2>/dev/null || true

echo ""
echo "Cleanup complete!"
