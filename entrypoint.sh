#!/bin/sh
set -e

if [ ! -f /data/claw.db ]; then
  if [ -s /app/seed.db ]; then
    echo "Seeding database from backup..."
    cp /app/seed.db /data/claw.db
  else
    echo "Fresh init — Drizzle will create schema on first startup..."
  fi
fi

echo "Starting application..."
exec node server.js
