#!/usr/bin/env bash
# fetch-geo-data.sh — Download and prepare all geo data for the interactive map
# Run from project root: bash scripts/fetch-geo-data.sh
#
# This script orchestrates all geo data sources:
#   1. Department boundaries — gregoiredavid/france-geojson (MIT)
#   2. Population density — INSEE via Node script
#   3. Road network — OpenStreetMap via Overpass API
#   4. Commune boundaries — geo.api.gouv.fr
#   5. GeoJSON simplification
#
# Output: public/data/  (served to web clients)
#         src/data/     (source data for rebuilds)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== France en Chiffres — Geo Data Fetcher ==="
echo ""

# ── 1. Department boundaries ──
echo "→ [1/4] Downloading department boundaries..."
DEPARTMENTS_URL="https://raw.githubusercontent.com/gregoiredavid/france-geojson/refs/heads/master/departements.geojson"
mkdir -p "$PROJECT_ROOT/src/data/geo"
curl -sS -o "$PROJECT_ROOT/src/data/geo/departements.geojson" "$DEPARTMENTS_URL" && \
  echo "  ✓ Department boundaries downloaded" || \
  echo "  ✗ Failed to download department boundaries"

# ── 2. Population density ──
echo "→ [2/4] Generating population density data..."
node "$SCRIPT_DIR/populate-density.js"

# ── 3. Roads ──
echo "→ [3/4] Fetching road network data..."
node "$SCRIPT_DIR/fetch-roads.js" || echo "  ⚠ Roads data may be partial (see above)"

# ── 4. Communes ──
echo "→ [4/4] Fetching commune boundaries..."
node "$SCRIPT_DIR/fetch-communes.js" || echo "  ⚠ Communes data may be partial (see above)"

# ── 5. Simplify GeoJSON ──
echo "→ Simplifying GeoJSON for web delivery..."
node "$SCRIPT_DIR/simplify-geojson.js"

echo ""
echo "=== All geo data processed ==="
echo "  public/data/ — ready for web serving"
