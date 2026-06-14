#!/bin/sh
set -e

if [ ! -f /data/claw.db ]; then
  if [ -s /app/seed.db ]; then
    echo "Seeding database from backup..."
    cp /app/seed.db /data/claw.db
  else
    echo "Initializing fresh database..."
    node scripts/init-db.mjs
  fi
fi

echo "Applying schema patches..."
node scripts/apply-patches.mjs

echo "Starting application..."
exec node server.js
