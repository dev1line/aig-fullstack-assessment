#!/bin/sh
set -e
# Ensure DATABASE_URL is available: export for child processes and write .env for Prisma CLI (dotenv)
export DATABASE_URL="${DATABASE_URL:-}"
if [ -n "$DATABASE_URL" ]; then
  # Quote value so special chars (e.g. ! in password) are read correctly by dotenv
  printf 'DATABASE_URL="%s"\n' "$DATABASE_URL" > .env
  echo "DATABASE_URL is set (length $(echo "$DATABASE_URL" | wc -c))"
else
  echo "WARNING: DATABASE_URL is empty" >&2
fi
echo "Ensuring DB grants for RDS (CONNECT + schema public)..."
node scripts/ensure-db-grants.js || true
echo "Running Prisma migrate deploy..."
# Pass DATABASE_URL explicitly so Prisma CLI (prisma.config.ts env()) sees it
if ! env DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy; then
  echo "ERROR: prisma migrate deploy failed. Check DATABASE_URL is reachable from ECS (e.g. RDS endpoint, not localhost)." >&2
  exit 1
fi
echo "Re-running DB grants (tables now exist after migrate)..."
node scripts/ensure-db-grants.js || true
echo "Starting application..."
exec node dist/src/main.js
