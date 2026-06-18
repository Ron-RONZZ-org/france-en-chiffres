#!/usr/bin/env bash
# fetch-geo-data.sh — Download and prepare all geo data for the interactive map
# Run: bash scripts/fetch-geo-data.sh
#
# Orchestrates all data sources for the /geographie/carte-interactive/ page.
# Each script can also be run individually.
#
# Sources:
#   Departments — gregoiredavid/france-geojson (MIT)
#   Density grid — INSEE via geo.api.gouv.fr (Open Licence 2.0)
#   Roads — OpenStreetMap via Overpass API (ODbL)
#
# NPM wrappers: npm run fetch:geo, npm run build:density, npm run fetch:roads

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== France en Chiffres — Geo Data ==="
echo ""

# ── 1. Department boundaries ──
echo "→ [1/4] Department boundaries..."
DEP_URL="https://raw.githubusercontent.com/gregoiredavid/france-geojson/refs/heads/master/departements.geojson"
mkdir -p "$PROJECT_ROOT/src/data/geo"
curl -sS -o "$PROJECT_ROOT/src/data/geo/departements.geojson" "$DEP_URL" && \
  echo "  ✓ Departments downloaded" || echo "  ✗ Failed"

# ── 2. Simplify for web ──
echo "→ [2/4] Simplifying GeoJSON..."
node "$SCRIPT_DIR/simplify-geojson.js"

# ── 3. Commune-level density grid (populations + boundaries) ──
echo "→ [3/4] Commune-level density..."
node "$SCRIPT_DIR/build-density-grid.js"

# ── 4. Roads ──
echo "→ [4/4] Roads from Overpass..."
node "$SCRIPT_DIR/fetch-roads.js" || echo "  ⚠ Roads may be partial"

echo ""
echo "=== All geo data processed ==="
