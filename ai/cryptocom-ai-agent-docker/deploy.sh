#!/bin/bash
set -e

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

echo "Deploying cryptocom-agent-client Lambda..."
echo "AWS Account: $AWS_ACCOUNTID"
echo "AWS Region: $AWS_DEFAULT_REGION"
echo ""

# Configuration
IMAGE_NAME="cryptocom-agent-lambda"
REPO_NAME="cryptocom-agent-lambda"
FUNCTION_NAME="cryptocom-agent-lambda"
ROLE_NAME="lambda-exec-cryptocom-agent"

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Build Docker image
echo "Building Docker image..."
docker buildx build --platform linux/arm64 --provenance=false --load -t ${IMAGE_NAME}:latest .

# Create ECR repository if needed
echo "Setting up ECR repository..."
aws ecr describe-repositories --repository-names ${REPO_NAME} --region ${AWS_DEFAULT_REGION} > /dev/null 2>&1 || \
    aws ecr create-repository --repository-name ${REPO_NAME} --region ${AWS_DEFAULT_REGION}

# Set ECR repository policy for Lambda access
echo "Setting ECR repository policy..."
aws ecr set-repository-policy \
    --repository-name ${REPO_NAME} \
    --region ${AWS_DEFAULT_REGION} \
    --policy-text '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LambdaECRImageRetrievalPolicy",
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": [
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ]
    }
  ]
}' > /dev/null

# Push to ECR
echo "Pushing to ECR..."
aws ecr get-login-password --region ${AWS_DEFAULT_REGION} | \
    docker login --username AWS --password-stdin ${AWS_ACCOUNTID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com

IMAGE_URI="${AWS_ACCOUNTID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/${REPO_NAME}:latest"
docker tag ${IMAGE_NAME}:latest ${IMAGE_URI}
docker push ${IMAGE_URI}

# Create IAM role if needed
ROLE_ARN="arn:aws:iam::${AWS_ACCOUNTID}:role/${ROLE_NAME}"
if ! aws iam get-role --role-name ${ROLE_NAME} > /dev/null 2>&1; then
    echo "Creating IAM role..."

    cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    aws iam create-role \
        --role-name ${ROLE_NAME} \
        --assume-role-policy-document file:///tmp/trust-policy.json

    aws iam attach-role-policy \
        --role-name ${ROLE_NAME} \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

    rm /tmp/trust-policy.json
    echo "Waiting for role propagation..."
    sleep 15
fi

# Create or update Lambda function
if ! aws lambda get-function --function-name ${FUNCTION_NAME} --region ${AWS_DEFAULT_REGION} > /dev/null 2>&1; then
    echo "Creating Lambda function..."
    aws lambda create-function \
        --function-name ${FUNCTION_NAME} \
        --package-type Image \
        --code ImageUri=${IMAGE_URI} \
        --role ${ROLE_ARN} \
        --architectures arm64 \
        --timeout 300 \
        --memory-size 1024 \
        --region ${AWS_DEFAULT_REGION}
else
    echo "Updating Lambda function..."
    aws lambda update-function-code \
        --function-name ${FUNCTION_NAME} \
        --image-uri ${IMAGE_URI} \
        --region ${AWS_DEFAULT_REGION}

    # Wait for update to complete
    echo "Waiting for function to be ready..."
    aws lambda wait function-updated --function-name ${FUNCTION_NAME} --region ${AWS_DEFAULT_REGION}

    aws lambda update-function-configuration \
        --function-name ${FUNCTION_NAME} \
        --timeout 300 \
        --memory-size 1024 \
        --region ${AWS_DEFAULT_REGION}

    # Wait for configuration update
    aws lambda wait function-updated --function-name ${FUNCTION_NAME} --region ${AWS_DEFAULT_REGION}
fi

# Final wait to ensure function is active
echo "Waiting for function to become active..."
aws lambda wait function-active-v2 --function-name ${FUNCTION_NAME} --region ${AWS_DEFAULT_REGION}

echo ""
echo "Deployment complete!"
echo "Function: ${FUNCTION_NAME}"
echo ""
echo "Next steps:"
echo "  ./run.sh                    # Test with default prompt"
echo "  ./run.sh \"your question\"    # Test with custom prompt"
echo "  ./cleanup.sh                # Remove all resources"
