#!/usr/bin/env bash
#
# Deploy full stack: Network -> RDS -> Backend (build+push+stack) -> Frontend (build+stack+assets).
# Copy infra-aws/.env.example to infra-aws/.env and set at least RDS_MASTER_PASSWORD (and optionally NEXT_PUBLIC_API_URL).
# Run from project root: ./infra-aws/deploy/deploy-all.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$INFRA_DIR/.." && pwd)"

# Load config: prefer .env, fallback to .env.example (read-only)
if [[ -f "$INFRA_DIR/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$INFRA_DIR/.env"
  set +a
  echo "Loaded config from $INFRA_DIR/.env"
elif [[ -f "$INFRA_DIR/.env.example" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$INFRA_DIR/.env.example"
  set +a
  echo "Loaded config from $INFRA_DIR/.env.example (copy to .env to customize)"
fi

export PROJECT_NAME="${PROJECT_NAME:-sentiment-app}"
STACK_NETWORK="${STACK_NETWORK_NAME:-my-project-network}"
STACK_RDS="${STACK_RDS_NAME:-my-project-rds}"
STACK_BACKEND="${STACK_BACKEND_NAME:-my-project-backend}"
STACK_FRONTEND="${STACK_FRONTEND_NAME:-my-project-frontend}"

if [[ -z "${RDS_MASTER_PASSWORD:-}" ]]; then
  echo "ERROR: RDS_MASTER_PASSWORD is not set. Copy infra-aws/.env.example to infra-aws/.env and set RDS_MASTER_PASSWORD." >&2
  exit 1
fi

cd "$PROJECT_ROOT"
AWS_REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null)}"
if [[ -z "${AWS_REGION:-}" ]]; then
  echo "ERROR: AWS_REGION not set and 'aws configure get region' failed. Set AWS_REGION or run aws configure." >&2
  exit 1
fi
AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"

echo ""
echo "=== Deploy full stack (7 steps) ==="
echo "  Network -> RDS -> Backend (build+push+deploy) -> Frontend (build+stack+assets) -> CORS update"
echo "  Stacks: $STACK_NETWORK, $STACK_RDS, $STACK_BACKEND, $STACK_FRONTEND"
echo ""

echo "=== 1/7 Deploy network stack ==="
bash "$SCRIPT_DIR/deploy-network.sh" "$STACK_NETWORK"
VPC_ID="$(aws cloudformation describe-stacks --stack-name "$STACK_NETWORK" --query "Stacks[0].Outputs[?OutputKey=='VpcId'].OutputValue" --output text)"
PRIVATE_SUBNETS="$(aws cloudformation describe-stacks --stack-name "$STACK_NETWORK" --query "Stacks[0].Outputs[?OutputKey=='PrivateSubnetIds'].OutputValue" --output text)"
PUBLIC_SUBNETS="$(aws cloudformation describe-stacks --stack-name "$STACK_NETWORK" --query "Stacks[0].Outputs[?OutputKey=='PublicSubnetIds'].OutputValue" --output text)"

echo "=== 2/7 Deploy RDS stack ==="
bash "$SCRIPT_DIR/deploy-rds.sh" "$STACK_RDS" "$VPC_ID" "$PRIVATE_SUBNETS" "$RDS_MASTER_PASSWORD"
DB_ENDPOINT="$(aws cloudformation describe-stacks --stack-name "$STACK_RDS" --query "Stacks[0].Outputs[?OutputKey=='DbEndpoint'].OutputValue" --output text)"
DB_NAME="${DATABASE_NAME:-sentiment_reviews}"
DB_USER="${MASTER_USERNAME:-app}"
export DATABASE_URL="postgresql://${DB_USER}:${RDS_MASTER_PASSWORD}@${DB_ENDPOINT}:5432/${DB_NAME}?sslmode=require&uselibpqcompat=true"

echo "=== 3/7 Build and push backend image ==="
IMAGE_URI="${IMAGE_URI:-${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/my-backend:latest}"
aws ecr create-repository --repository-name my-backend 2>/dev/null || true
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
cd "$PROJECT_ROOT/backend"
docker build --platform linux/amd64 -t my-backend .
docker tag my-backend:latest "$IMAGE_URI"
docker push "$IMAGE_URI"
cd "$PROJECT_ROOT"

echo "=== 4/7 Deploy backend stack ==="
wait_for_stack_stable() {
  local stack="$1"
  local max_wait="${2:-600}"
  local elapsed=0
  while true; do
    local status
    status="$(aws cloudformation describe-stacks --stack-name "$stack" --query "Stacks[0].StackStatus" --output text 2>/dev/null || echo "NOT_FOUND")"
    case "$status" in
      CREATE_COMPLETE|UPDATE_COMPLETE|UPDATE_ROLLBACK_COMPLETE|ROLLBACK_COMPLETE|CREATE_FAILED|ROLLBACK_FAILED|UPDATE_ROLLBACK_FAILED|DELETE_FAILED|NOT_FOUND) return 0 ;;
      CREATE_IN_PROGRESS|UPDATE_IN_PROGRESS|DELETE_IN_PROGRESS|ROLLBACK_IN_PROGRESS)
        if [[ $elapsed -ge $max_wait ]]; then
          echo "WARNING: Stack $stack still in $status after ${max_wait}s, continuing anyway." >&2
          return 0
        fi
        echo "  Waiting for stack $stack (status: $status)... ${elapsed}s"
        sleep 30
        elapsed=$((elapsed + 30))
        ;;
      *) echo "  Unknown status: $status" >&2; return 0 ;;
    esac
  done
}
if aws cloudformation describe-stacks --stack-name "$STACK_BACKEND" &>/dev/null; then
  wait_for_stack_stable "$STACK_BACKEND" 600
fi
bash "$SCRIPT_DIR/deploy-backend.sh" "$STACK_BACKEND" "$VPC_ID" "$PRIVATE_SUBNETS" "$PUBLIC_SUBNETS" "$IMAGE_URI" "$DATABASE_URL"
API_CF_DOMAIN="$(aws cloudformation describe-stacks --stack-name "$STACK_BACKEND" --query "Stacks[0].Outputs[?OutputKey=='ApiDistributionDomainName'].OutputValue" --output text 2>/dev/null || true)"
if [[ -n "$API_CF_DOMAIN" ]]; then
  export NEXT_PUBLIC_API_URL="https://${API_CF_DOMAIN}"
  echo "Backend API (HTTPS): $NEXT_PUBLIC_API_URL"
else
  # Do not use ALB (HTTP) — FE must call API via CloudFront (HTTPS). Use infra .env value or leave unset so frontend lib/api.ts uses PRODUCTION_API_URL.
  if [[ -z "${NEXT_PUBLIC_API_URL:-}" ]]; then
    echo "Backend API: using frontend default (CloudFront). Set NEXT_PUBLIC_API_URL in infra .env to override."
  else
    echo "Backend API (from .env): $NEXT_PUBLIC_API_URL"
  fi
fi

echo "=== 5/7 Build frontend and deploy frontend stack ==="
# Only override for local; production build should get CloudFront from step above or from frontend lib/api.ts fallback
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-}"
cd "$PROJECT_ROOT/frontend"
npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund
npm run build
cd "$PROJECT_ROOT"
bash "$SCRIPT_DIR/deploy-frontend-stack.sh" "$STACK_FRONTEND"
BUCKET_NAME="$(aws cloudformation describe-stacks --stack-name "$STACK_FRONTEND" --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)"

echo "=== 6/7 Upload frontend assets to S3 ==="
FRONTEND_DIR="$PROJECT_ROOT/frontend/out" bash "$SCRIPT_DIR/deploy-frontend-assets.sh" "$BUCKET_NAME"

CF_DOMAIN="$(aws cloudformation describe-stacks --stack-name "$STACK_FRONTEND" --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" --output text)"
CF_DIST_ID="$(aws cloudformation describe-stacks --stack-name "$STACK_FRONTEND" --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" --output text 2>/dev/null || true)"
if [[ -n "$CF_DIST_ID" ]]; then
  echo "Invalidating CloudFront cache (paths /*)..."
  aws cloudfront create-invalidation --distribution-id "$CF_DIST_ID" --paths "/*" --output text 2>/dev/null || true
fi
CORS_ORIGIN="https://${CF_DOMAIN}"

echo "=== 7/7 Update backend CORS (allow CloudFront origin) ==="
bash "$SCRIPT_DIR/deploy-backend.sh" "$STACK_BACKEND" "$VPC_ID" "$PRIVATE_SUBNETS" "$PUBLIC_SUBNETS" "$IMAGE_URI" "$DATABASE_URL" "$CORS_ORIGIN"

echo ""
echo "=== Deploy complete ==="
echo "Frontend: https://${CF_DOMAIN}"
echo "Backend API: ${NEXT_PUBLIC_API_URL}"
echo "CORS allowed origin: $CORS_ORIGIN"
