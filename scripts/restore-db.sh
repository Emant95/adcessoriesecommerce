#!/usr/bin/env bash
# Restore a backup made by backup-db.sh.
# Usage: ./scripts/restore-db.sh backups/20260101-020000
# WARNING: this replaces the current database contents and uploaded images.
set -euo pipefail

cd "$(dirname "$0")/.."
SRC="${1:?Usage: $0 backups/<timestamp>}"
[ -f "${SRC}/db.dump" ] || { echo "No db.dump in ${SRC}" >&2; exit 1; }

set -a
. ./.env
set +a

read -r -p "This will overwrite the current database with ${SRC}. Type 'restore' to continue: " answer
[ "$answer" = "restore" ] || { echo "Cancelled."; exit 1; }

echo "Restoring database..."
docker compose exec -T db pg_restore -U "${POSTGRES_USER:-adcessories}" -d "${POSTGRES_DB:-adcessories}" --clean --if-exists --no-owner < "${SRC}/db.dump"

if [ -f "${SRC}/uploads.tar.gz" ]; then
  echo "Restoring uploaded images..."
  docker compose exec -T api tar -xzf - -C /app < "${SRC}/uploads.tar.gz"
fi

docker compose restart api
echo "Restore complete."
