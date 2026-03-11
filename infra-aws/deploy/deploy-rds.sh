#!/usr/bin/env bash

set -euo pipefail

STACK_NAME="${1:-}"
VPC_ID="${2:-}"
PRIVATE_SUBNET_IDS="${3:-}"
MASTER_PASSWORD="${4:-}"
PROJECT_NAME="${PROJECT_NAME:-sentiment-app}"
TEMPLATE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/templates/rds.yaml"

if [[ -z "$STACK_NAME" || -z "$VPC_ID" || -z "$PRIVATE_SUBNET_IDS" || -z "$MASTER_PASSWORD" ]]; then
  echo "Usage: $0 <stack-name> <VpcId> <PrivateSubnetIds_comma_separated> <MasterUserPassword>"
  echo "  Get VpcId and PrivateSubnetIds from the network stack outputs (deploy-network.sh)."
  echo "  MasterUserPassword must be at least 8 characters."
  exit 1
fi

aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --template-file "$TEMPLATE_FILE" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    ProjectName="$PROJECT_NAME" \
    VpcId="$VPC_ID" \
    PrivateSubnetIds="$PRIVATE_SUBNET_IDS" \
    MasterUserPassword="$MASTER_PASSWORD" \
    VpcCidr="${VPC_CIDR:-10.0.0.0/16}" \
    DatabaseName="${DATABASE_NAME:-sentiment_reviews}" \
    MasterUsername="${MASTER_USERNAME:-app}"

aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs" \
  --output table
