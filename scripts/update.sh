#!/usr/bin/env bash
# ArmaField backend update + cleanup helper.
#
# Usage:   ./scripts/update.sh
# Runs from any CWD - re-locates itself to the repo root.
#
# Steps:
#   1. git pull
#   2. docker compose up -d --build   (preserves local-db profile if db was running)
#   3. docker image prune -f          (removes untagged old image versions)
#   4. docker builder prune -af       (removes build cache older than 72h)
#   5. prints reclaimed disk space
set -euo pipefail

# ── Locate repo root (script lives in scripts/, repo root is its parent) ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

if [ ! -f docker-compose.yml ]; then
  echo "ERROR: docker-compose.yml not found in $REPO_ROOT" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not found in PATH" >&2
  exit 1
fi

# ── Detect deployment mode by checking whether the db service is running ──
COMPOSE_ARGS=()
if docker compose ps --services --status running 2>/dev/null | grep -qx 'db'; then
  echo "→ Detected local-db profile (db service is running)."
  COMPOSE_ARGS+=(--profile local-db)
else
  echo "→ External database mode (db service not running)."
fi

# ── Snapshot disk usage before cleanup ──
df_before=$(df -BM --output=used "$REPO_ROOT" | tail -1 | tr -d ' M')

echo ""
echo "── Pulling latest changes ──"
git pull --ff-only

echo ""
echo "── Rebuilding containers ──"
docker compose "${COMPOSE_ARGS[@]}" up -d --build

echo ""
echo "── Cleaning up old images ──"
docker image prune -f

echo ""
echo "── Cleaning up build cache (> 72h) ──"
docker builder prune -af --filter "until=72h"

# ── Report reclaimed space ──
df_after=$(df -BM --output=used "$REPO_ROOT" | tail -1 | tr -d ' M')
reclaimed=$(( df_before - df_after ))

echo ""
if [ "$reclaimed" -gt 0 ]; then
  echo "✓ Update complete. Reclaimed ~${reclaimed} MB of disk space."
else
  echo "✓ Update complete."
fi

echo ""
echo "── Container status ──"
docker compose "${COMPOSE_ARGS[@]}" ps
