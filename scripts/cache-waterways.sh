#!/usr/bin/env bash
# cache-waterways.sh — Fetch waterways GeoJSON only if cache is missing/stale
# Run: bash scripts/cache-waterways.sh
#
# Part of the build pipeline: respects cache to avoid overloading Overpass API.

set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT="$PROJECT_DIR/public/data/waterways.geojson"
LOCKFILE="$PROJECT_DIR/public/data/.waterways-fetching.lock"

# If file exists and is > 1 KB, skip
if [ -f "$OUTPUT" ] && [ "$(stat -c%s "$OUTPUT" 2>/dev/null || stat -f%z "$OUTPUT" 2>/dev/null)" -gt 1024 ]; then
  SIZE_KB="$(($(stat -c%s "$OUTPUT" 2>/dev/null || stat -f%z "$OUTPUT" 2>/dev/null) / 1024))"
  echo "✓ waterways.geojson cached (${SIZE_KB} KB) — skipping fetch"
  exit 0
fi

# Acquire lock (simple file-based) to prevent concurrent fetches
if [ -f "$LOCKFILE" ] && kill -0 "$(cat "$LOCKFILE")" 2>/dev/null; then
  echo "⏳ waterways fetch already in progress — skipping"
  exit 0
fi
echo "$$" > "$LOCKFILE"
trap 'rm -f "$LOCKFILE"' EXIT

echo "→ No cached waterways data found — fetching from Overpass API..."
node "$PROJECT_DIR/scripts/fetch-waterways.js" && \
  echo "→ Clipping waterways to France boundaries..." && \
  node "$PROJECT_DIR/scripts/clip-to-france.js" "$OUTPUT" && \
  echo "→ Simplifying and classifying waterways..." && \
  node "$PROJECT_DIR/scripts/simplify-line-layers.js"
