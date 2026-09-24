#!/bin/sh
set -e

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Ejecutando migraciones de base de datos..."
  node dist/migrate.js
fi

exec "$@"
