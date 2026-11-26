#!/usr/bin/env bash
# Build and (re)start the whole stack with Docker Compose.
# First run: creates .env from .env.example with random secrets, then starts everything.
# Later runs: pulls the latest code (if this is a git checkout), rebuilds and restarts.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. On Ubuntu run: sudo ./scripts/setup-server.sh" >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "Creating .env with random secrets..."
  cp .env.example .env
  rand() { openssl rand -hex "$1" 2>/dev/null || head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; }
  DB_PASS="$(rand 16)"
  JWT="$(rand 32)"
  ADMIN_PASS="$(rand 8)"
  sed -i.bak \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${DB_PASS}|" \
    -e "s|^JWT_SECRET=.*|JWT_SECRET=${JWT}|" \
    -e "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${ADMIN_PASS}|" \
    .env
  rm -f .env.bak
  echo ""
  echo "  Admin email:    $(grep '^ADMIN_EMAIL=' .env | cut -d= -f2)"
  echo "  Admin password: ${ADMIN_PASS}"
  echo "  (saved in .env; change it after your first sign-in)"
  echo ""
fi

if [ -d .git ] && [ "${SKIP_PULL:-false}" != "true" ]; then
  echo "Pulling latest code..."
  git pull --ff-only || echo "git pull skipped (local changes or no remote)"
fi

echo "Building and starting containers..."
docker compose up -d --build --remove-orphans

echo "Waiting for the API to become healthy..."
for i in $(seq 1 60); do
  status="$(docker compose ps --format '{{.Service}} {{.Health}}' 2>/dev/null | awk '$1=="api"{print $2}')"
  if [ "$status" = "healthy" ]; then
    break
  fi
  sleep 3
done

docker compose ps
PORT="$(grep '^WEB_PORT=' .env | cut -d= -f2)"
echo ""
echo "Done. Store:  http://localhost:${PORT:-8080}"
echo "      Admin:  http://localhost:${PORT:-8080}/admin"
