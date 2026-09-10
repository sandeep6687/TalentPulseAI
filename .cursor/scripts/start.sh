#!/usr/bin/env bash
set -euo pipefail

export PATH="${HOME}/.dotnet:${PATH}"

if ! command -v pg_isready >/dev/null 2>&1; then
  echo "PostgreSQL client tools are not installed."
  exit 1
fi

if ! pg_isready -h localhost -U postgres >/dev/null 2>&1; then
  sudo service postgresql start
  for _ in $(seq 1 30); do
    if pg_isready -h localhost -U postgres >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

if ! pg_isready -h localhost -U postgres >/dev/null 2>&1; then
  echo "PostgreSQL failed to become ready."
  exit 1
fi

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'talentpulsedb'" | grep -q 1 \
  || sudo -u postgres createdb talentpulsedb

sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" >/dev/null 2>&1 || true

echo "PostgreSQL ready (database: talentpulsedb)."
