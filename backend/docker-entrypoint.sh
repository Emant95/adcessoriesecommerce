#!/bin/sh
set -e
# Apply pending database migrations, then seed the first admin and default content.
# Seeding is idempotent: it never overwrites existing records.
npx prisma migrate deploy
if [ "${RUN_SEED:-true}" = "true" ]; then
  node prisma/seed.js
fi
exec "$@"
