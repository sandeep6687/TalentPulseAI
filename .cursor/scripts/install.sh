#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

cd "$REPO_ROOT/frontend"
npm ci

cd "$REPO_ROOT/backend"
export PATH="${HOME}/.dotnet:${PATH}"
dotnet restore

echo "Install complete."
