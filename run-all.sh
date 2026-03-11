#!/usr/bin/env bash
#
# Run Frontend (Next.js) and Backend (NestJS) concurrently.
# Press Ctrl+C to stop both.
#

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Colors for log output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_fe() { echo -e "${GREEN}[FE]${NC} $*"; }
log_be() { echo -e "${YELLOW}[BE]${NC} $*"; }
log_err() { echo -e "${RED}[ERR]${NC} $*"; }

# Check npm is available
if ! command -v npm &>/dev/null; then
  log_err "Node.js/npm is required."
  exit 1
fi

# Copy .env.example to .env in FE and BE if .env is missing (so app runs with defaults)
if [[ ! -f "$ROOT/frontend/.env" ]] && [[ -f "$ROOT/frontend/.env.example" ]]; then
  log_fe "Copying frontend .env.example -> .env"
  cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env"
fi
if [[ ! -f "$ROOT/backend/.env" ]] && [[ -f "$ROOT/backend/.env.example" ]]; then
  log_be "Copying backend .env.example -> .env"
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
fi

# Start PostgreSQL via Docker before backend (backend needs DB)
if command -v docker &>/dev/null; then
  log_be "Starting PostgreSQL (docker compose)..."
  (cd "$ROOT/backend" && docker compose up -d postgres 2>/dev/null || docker-compose up -d postgres 2>/dev/null) || true
  sleep 2
  # Wait for Postgres to be ready (avoid ECONNREFUSED on backend start)
  for i in {1..30}; do
    if (cd "$ROOT/backend" && docker compose exec -T postgres pg_isready -U app -d sentiment_reviews 2>/dev/null) \
       || (docker-compose -f "$ROOT/backend/docker-compose.yml" exec -T postgres pg_isready -U app -d sentiment_reviews 2>/dev/null); then
      log_be "PostgreSQL is ready."
      break
    fi
    [[ $i -eq 30 ]] && log_err "PostgreSQL did not become ready in time; backend may fail to connect."
    sleep 1
  done
else
  log_be "Docker not found; skipping Postgres. Start it manually if needed (e.g. cd backend && docker compose up -d postgres)."
fi

# Install dependencies if not present
if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
  log_fe "Installing frontend dependencies..."
  (cd "$ROOT/frontend" && npm install)
fi
if [[ ! -d "$ROOT/backend/node_modules" ]]; then
  log_be "Installing backend dependencies..."
  (cd "$ROOT/backend" && npm install)
fi

cleanup() {
  log_err "Stopping FE and BE..."
  [[ -n "$FE_PID" ]] && kill "$FE_PID" 2>/dev/null || true
  [[ -n "$BE_PID" ]] && kill "$BE_PID" 2>/dev/null || true
  [[ -n "$PRISMA_PID" ]] && kill "$PRISMA_PID" 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# Run backend (NestJS, port 3001)
log_be "Running prisma client..."
(cd "$ROOT/backend" && npx prisma generate) &
PRISMA_PID=$!

# Run backend (NestJS, port 3001)
log_be "Starting backend..."
(cd "$ROOT/backend" && npm run start:dev) &
BE_PID=$!

# Run frontend (Next.js)
log_fe "Starting frontend..."
(cd "$ROOT/frontend" && npm run dev) &
FE_PID=$!

echo ""
echo "Frontend (Next.js): http://localhost:3000"
echo "Backend (NestJS): usually at http://localhost:3001"
echo "Press Ctrl+C to stop both."
echo ""

wait
