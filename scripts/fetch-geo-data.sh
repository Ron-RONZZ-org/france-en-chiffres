#!/usr/bin/env bash
# fetch-geo-data.sh — Download and prepare all geo data for the interactive map
# Run: bash scripts/fetch-geo-data.sh
#
# Orchestrates all data sources for the /geographie/carte-interactive/ page.
# Each script can also be run individually.
#
# Output: public/data/ (web serving), src/data/geo/ (source data for rebuilds)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== France en Chiffres — Geo Data ==="
echo ""

# ── 1. Department boundaries ──
echo "→ [1/5] Department boundaries..."
DEP_URL="https://raw.githubusercontent.com/gregoiredavid/france-geojson/refs/heads/master/departements.geojson"
mkdir -p "$PROJECT_ROOT/src/data/geo"
curl -sS -o "$PROJECT_ROOT/src/data/geo/departements.geojson" "$DEP_URL" && \
  echo "  ✓ Departments downloaded" || echo "  ✗ Failed"

# ── 2. Simplify for web ──
echo "→ [2/5] Simplifying GeoJSON..."
node "$SCRIPT_DIR/simplify-geojson.js"

# ── 3. Commune-level density grid (populations + boundaries) ──
echo "→ [3/5] Commune-level density..."
node "$SCRIPT_DIR/build-density-grid.js"

# ── 4. Roads ──
echo "→ [4/5] Roads from Overpass..."
node "$SCRIPT_DIR/fetch-roads.js" || echo "  ⚠ Roads may be partial"

# ── 5. Communes (point data from API, legacy) ──
echo "→ [5/5] Commune centroids (legacy)..."
node "$SCRIPT_DIR/fetch-communes.js" 2>/dev/null || echo "  ⚠ Skipped (optional)"

# ── Legacy density (kept for reference) ──
node "$SCRIPT_DIR/populate-density.js" 2>/dev/null || true

echo ""
echo "=== All geo data processed ==="
echo "  public/data/ — ready for web serving"
echo "  npm run build:density  — rebuild density grid"
echo "  npm run fetch:roads    — rebuild road network"
