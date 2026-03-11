#!/usr/bin/env bash

set -euo pipefail

BUCKET_NAME="${1:-}"
FRONTEND_DIR="${FRONTEND_DIR:-frontend/out}"

if [[ -z "$BUCKET_NAME" ]]; then
  echo "Usage: $0 <BucketName>"
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "Frontend build directory '$FRONTEND_DIR' not found. Run 'npm run build' in the frontend folder first (Next.js static export → out/)."
  exit 1
fi

aws s3 sync "$FRONTEND_DIR" "s3://$BUCKET_NAME" --delete

