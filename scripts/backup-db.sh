#!/usr/bin/env bash
# Back up the database and uploaded images into ./backups/<timestamp>/
# Tip: schedule it daily with cron, e.g.
#   0 2 * * * cd /opt/adcessoriesecommerce && ./scripts/backup-db.sh >> backups/backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."
set -a
. ./.env
set +a

STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="backups/${STAMP}"
mkdir -p "$DEST"

echo "Dumping database..."
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-adcessories}" -d "${POSTGRES_DB:-adcessories}" --format=custom > "${DEST}/db.dump"

echo "Archiving uploaded images..."
docker compose exec -T api tar -czf - -C /app uploads > "${DEST}/uploads.tar.gz"

# Keep the 14 most recent backups
ls -1d backups/*/ 2>/dev/null | sort | head -n -14 | xargs -r rm -r --

echo "Backup written to ${DEST}"
