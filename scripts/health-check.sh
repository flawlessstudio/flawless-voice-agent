#!/usr/bin/env bash
# health-check.sh — Check all external service connectivity
# Usage: bash scripts/health-check.sh
# Requires: .env to be populated

set -euo pipefail

if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

PASS=0
FAIL=0

check() {
  local name="$1"
  local result="$2"
  if [ "$result" = "ok" ]; then
    echo "  ✅ $name"
    PASS=$((PASS+1))
  else
    echo "  ❌ $name — $result"
    FAIL=$((FAIL+1))
  fi
}

echo "🔍 Health Check — Flawless Voice Agent"
echo "======================================="

# Local server
SERVER=$(curl -sf http://localhost:5050/health > /dev/null 2>&1 && echo "ok" || echo "not running")
check "Local server (:5050)" "$SERVER"

# OpenAI
OPENAI=$(curl -sf -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${OPENAI_API_KEY:-missing}" \
  https://api.openai.com/v1/models 2>/dev/null || echo "000")
[ "$OPENAI" = "200" ] && check "OpenAI API" "ok" || check "OpenAI API" "HTTP $OPENAI"

# Deepgram
DEEPGRAM=$(curl -sf -o /dev/null -w "%{http_code}" \
  -H "Authorization: Token ${DEEPGRAM_API_KEY:-missing}" \
  https://api.deepgram.com/v1/projects 2>/dev/null || echo "000")
[ "$DEEPGRAM" = "200" ] && check "Deepgram API" "ok" || check "Deepgram API" "HTTP $DEEPGRAM"

# HubSpot
if [ -n "${HUBSPOT_ACCESS_TOKEN:-}" ]; then
  HS=$(curl -sf -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
    https://api.hubapi.com/crm/v3/objects/contacts?limit=1 2>/dev/null || echo "000")
  [ "$HS" = "200" ] && check "HubSpot API" "ok" || check "HubSpot API" "HTTP $HS"
else
  check "HubSpot API" "HUBSPOT_ACCESS_TOKEN not set"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
