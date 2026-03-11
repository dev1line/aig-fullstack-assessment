#!/usr/bin/env bash
# Output DATABASE_URL for RDS using AWS CLI. Load infra-aws/.env for RDS_MASTER_PASSWORD and stack name.
# Usage: eval $(./infra-aws/deploy/get-database-url.sh)   # export DATABASE_URL
#    or: ./infra-aws/deploy/get-database-url.sh           # print DATABASE_URL=...
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$INFRA_DIR/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$INFRA_DIR/.env"
  set +a
fi

STACK_RDS="${STACK_RDS_NAME:-my-project-rds}"
if [[ -z "${RDS_MASTER_PASSWORD:-}" ]]; then
  echo "ERROR: RDS_MASTER_PASSWORD not set. Set it in infra-aws/.env" >&2
  exit 1
fi

DB_ENDPOINT="$(aws cloudformation describe-stacks --stack-name "$STACK_RDS" --query "Stacks[0].Outputs[?OutputKey=='DbEndpoint'].OutputValue" --output text)"
DB_NAME="$(aws cloudformation describe-stacks --stack-name "$STACK_RDS" --query "Stacks[0].Outputs[?OutputKey=='DatabaseName'].OutputValue" --output text)"
DB_USER="$(aws cloudformation describe-stacks --stack-name "$STACK_RDS" --query "Stacks[0].Outputs[?OutputKey=='MasterUsername'].OutputValue" --output text)"

# RDS requires SSL. Use uselibpqcompat=true so sslmode=require = encrypt only (no cert verify); avoids "self-signed certificate in certificate chain".
# Output export DATABASE_URL='...' (password may contain special chars; avoid unquoted output)
URL="postgresql://${DB_USER}:${RDS_MASTER_PASSWORD}@${DB_ENDPOINT}:5432/${DB_NAME}?sslmode=require&uselibpqcompat=true"
# Use single quotes so only ' in password would need escaping
printf "export DATABASE_URL='%s'\n" "$(printf '%s' "$URL" | sed "s/'/'\\\\''/g")"
