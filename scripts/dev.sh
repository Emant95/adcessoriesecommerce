#!/usr/bin/env bash
# Start a local development environment:
#   PostgreSQL in Docker, the API on :4000 and the website on :5173 (with hot reload).
set -euo pipefail

cd "$(dirname "$0")/.."

docker compose -f docker-compose.dev.yml up -d

[ -f backend/.env ] || cp backend/.env.example backend/.env

(cd backend && npm install && npx prisma migrate deploy && node prisma/seed.js)
(cd frontend && npm install)

echo "Starting API and website (Ctrl+C to stop)..."
(cd backend && npm run dev) &
API_PID=$!
trap 'kill $API_PID 2>/dev/null' EXIT
cd frontend && npm run dev
