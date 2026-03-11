#!/usr/bin/env bash

set -euo pipefail

STACK_NAME="${1:-}"
VPC_ID="${2:-}"
PRIVATE_SUBNET_IDS="${3:-}"
PUBLIC_SUBNET_IDS="${4:-}"
IMAGE_URL="${5:-}"
DATABASE_URL="${6:-}"
CORS_ALLOWED_ORIGINS="${7:-}"
PROJECT_NAME="${PROJECT_NAME:-sentiment-app}"
TEMPLATE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/templates/ecs-backend.yaml"

if [[ -z "$STACK_NAME" || -z "$VPC_ID" || -z "$PRIVATE_SUBNET_IDS" || -z "$PUBLIC_SUBNET_IDS" || -z "$IMAGE_URL" || -z "$DATABASE_URL" ]]; then
  echo "Usage: $0 <stack-name> <VpcId> <PrivateSubnetIds> <PublicSubnetIds> <ImageUrl> <DatabaseUrl> [CorsAllowedOrigins]"
  echo "  CorsAllowedOrigins: optional, comma-separated (e.g. https://d123.cloudfront.net,http://localhost:3000)"
  exit 1
fi

PARAMS=(
  ProjectName="$PROJECT_NAME"
  VpcId="$VPC_ID"
  PrivateSubnetIds="$PRIVATE_SUBNET_IDS"
  PublicSubnetIds="$PUBLIC_SUBNET_IDS"
  ImageUrl="$IMAGE_URL"
  DatabaseUrl="$DATABASE_URL"
  CorsAllowedOrigins="${CORS_ALLOWED_ORIGINS:-}"
)

aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --template-file "$TEMPLATE_FILE" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides "${PARAMS[@]}"

aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs" \
  --output table

