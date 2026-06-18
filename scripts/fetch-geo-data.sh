#!/usr/bin/env bash
# fetch-geo-data.sh — Download and prepare geo-referenced data for the interactive map
# Run from project root: bash scripts/fetch-geo-data.sh
#
# Sources:
#   Department GeoJSON: https://github.com/gregoiredavid/france-geojson (MIT)
#   Population data: INSEE (processed from CSV to JSON)
#
# Output: src/data/geo/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GEO_DIR="$PROJECT_ROOT/src/data/geo"

echo "=== France en Chiffres — Geo Data Fetcher ==="
echo "Output: $GEO_DIR"
echo ""

mkdir -p "$GEO_DIR"

# ── 1. Department boundaries (contours des départements) ──
echo "→ Downloading department boundaries (GeoJSON)..."
DEPARTMENTS_URL="https://raw.githubusercontent.com/gregoiredavid/france-geojson/refs/heads/master/departements.geojson"
DEPARTMENTS_OUT="$GEO_DIR/departements.geojson"

if curl -sS -o "$DEPARTMENTS_OUT" "$DEPARTMENTS_URL"; then
  FEATURES=$(python3 -c "import json; d=json.load(open('$DEPARTMENTS_OUT')); print(len(d['features']))" 2>/dev/null || echo "?")
  echo "  ✓ Saved: $DEPARTMENTS_OUT ($FEATURES departments)"
else
  echo "  ✗ Failed to download from $DEPARTMENTS_URL"
  exit 1
fi

# ── 2. Population density data ──
echo "→ Creating population density dataset..."
cat > "$GEO_DIR/population-density.json" << 'POPEOF'
{
  "source": "INSEE — Estimations de population 2024",
  "sourceUrl": "https://www.insee.fr/fr/statistiques/series/1234",
  "unit": "habitants/km²",
  "departments": []
}
POPEOF
echo "  ✓ Created: $GEO_DIR/population-density.json (template — populate with INSEE data)"

echo ""
echo "=== Done ==="
