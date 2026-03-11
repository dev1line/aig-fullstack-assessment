#!/usr/bin/env bash

set -euo pipefail

STACK_NAME="${1:-}"
PROJECT_NAME="${PROJECT_NAME:-sentiment-app}"
TEMPLATE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/templates/s3-cloudfront-frontend.yaml"

if [[ -z "$STACK_NAME" ]]; then
  echo "Usage: $0 <stack-name>"
  exit 1
fi

aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --template-file "$TEMPLATE_FILE" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides ProjectName="$PROJECT_NAME"

aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs" \
  --output table

