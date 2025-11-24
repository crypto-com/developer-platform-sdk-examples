#!/bin/bash

# =============================================================================
# cryptocom-agent-client AWS Lambda Example
# Interactive menu for deployment and testing
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FUNCTION_NAME="cryptocom-agent-lambda"

# Load environment variables
load_env() {
    if [ -f .env ]; then
        set -a
        source .env
        set +a
    fi
}

# Check if Lambda function is deployed
is_deployed() {
    aws lambda get-function --function-name ${FUNCTION_NAME} --region ${AWS_DEFAULT_REGION} > /dev/null 2>&1
    return $?
}

# Show menu
show_menu() {
    clear
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  cryptocom-agent-client Lambda Example ${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "AWS Account: ${GREEN}$AWS_ACCOUNTID${NC}"
    echo -e "AWS Region:  ${GREEN}$AWS_DEFAULT_REGION${NC}"
    echo ""

    # Check deployment status
    if is_deployed; then
        DEPLOY_STATUS="${GREEN}[DEPLOYED]${NC}"
        RUN_ENABLED=true
    else
        DEPLOY_STATUS="${YELLOW}[NOT DEPLOYED]${NC}"
        RUN_ENABLED=false
    fi

    echo -e "Lambda Status: $DEPLOY_STATUS"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo ""
    echo "  1) Build Docker image"
    echo "  2) Test locally with Docker"
    echo "  3) Deploy to AWS Lambda"

    if [ "$RUN_ENABLED" = true ]; then
        echo "  4) Run on AWS Lambda"
        echo "  5) Cleanup all AWS resources"
    else
        echo -e "  4) Run on AWS Lambda ${RED}(deploy first)${NC}"
        echo -e "  5) Cleanup all AWS resources ${RED}(deploy first)${NC}"
    fi

    echo ""
    echo "  q) Quit"
    echo ""
}

# Build Docker image
do_build() {
    echo -e "${BLUE}Building Docker image...${NC}"
    echo ""

    # Check Docker
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}Error: Docker is not running${NC}"
        read -p "Press Enter to continue..."
        return
    fi

    docker buildx build --platform linux/arm64 --provenance=false --load -t cryptocom-agent-lambda:latest .

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}Docker image built successfully!${NC}"
    else
        echo ""
        echo -e "${RED}Docker build failed${NC}"
    fi
    read -p "Press Enter to continue..."
}

# Deploy function
do_deploy() {
    echo -e "${BLUE}Deploying to AWS Lambda...${NC}"
    echo ""
    ./deploy.sh
    echo ""
    echo -e "${GREEN}Deployment complete!${NC}"
    read -p "Press Enter to continue..."
}

# Test locally
do_test_local() {
    echo -e "${BLUE}Testing locally with Docker...${NC}"
    echo ""
    read -p "Enter prompt (default: What is the current time?): " prompt
    prompt="${prompt:-What is the current time?}"
    ./test-local.sh "$prompt"
    echo ""
    read -p "Press Enter to continue..."
}

# Run on AWS
do_run() {
    if [ "$RUN_ENABLED" != true ]; then
        echo -e "${RED}Error: Lambda function not deployed. Please deploy first.${NC}"
        read -p "Press Enter to continue..."
        return
    fi

    echo -e "${BLUE}Running on AWS Lambda...${NC}"
    echo ""
    read -p "Enter prompt (default: What is the current time?): " prompt
    prompt="${prompt:-What is the current time?}"
    ./run.sh "$prompt"
    echo ""
    read -p "Press Enter to continue..."
}

# Cleanup resources
do_cleanup() {
    if [ "$RUN_ENABLED" != true ]; then
        echo -e "${RED}Error: Nothing to clean up. Lambda not deployed.${NC}"
        read -p "Press Enter to continue..."
        return
    fi

    echo -e "${YELLOW}WARNING: This will delete all AWS resources!${NC}"
    echo ""
    read -p "Are you sure? (y/N): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        echo ""
        ./cleanup.sh
        echo ""
        echo -e "${GREEN}Cleanup complete!${NC}"
    else
        echo "Cancelled."
    fi
    read -p "Press Enter to continue..."
}

# Main loop
main() {
    load_env

    while true; do
        show_menu
        read -p "Select option: " choice

        case $choice in
            1) do_build ;;
            2) do_test_local ;;
            3) do_deploy ;;
            4) do_run ;;
            5) do_cleanup ;;
            q|Q)
                echo ""
                echo "Goodbye!"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option${NC}"
                sleep 1
                ;;
        esac
    done
}

main
