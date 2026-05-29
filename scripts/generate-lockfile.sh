#!/usr/bin/env bash
# generate-lockfile.sh — regenerate package-lock.json from package.json
#
# Run this after:
#  - adding/removing/updating any dependency in package.json
#  - switching Node versions
#  - cloning the repo for the first time with a stale lockfile
#
# Usage:
#   bash scripts/generate-lockfile.sh

set -euo pipefail

echo "[lockfile] Node: $(node -v)"
echo "[lockfile] npm:  $(npm -v)"
echo "[lockfile] Generating package-lock.json..."

npm install --package-lock-only --ignore-scripts

echo "[lockfile] Done. Commit the result:"
echo "  git add package-lock.json"
echo "  git commit -m 'chore: update package-lock.json'"
