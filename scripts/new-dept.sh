#!/usr/bin/env bash
# new-dept.sh — Scaffold a department content file
# Usage: bash scripts/new-dept.sh <code>
# Example: bash scripts/new-dept.sh 01
#
# Looks up department name, region, population from existing data files.

set -euo pipefail

CODE="${1:?"Usage: $PROG <code>"}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE="$PROJECT_ROOT/templates/department-template.md"
TARGET="$PROJECT_ROOT/src/content/departements/${CODE}.md"

[ -f "$TEMPLATE" ] || { echo "Error: department-template.md not found"; exit 1; }
[ -f "$TARGET" ] && { echo "Error: $CODE.md already exists"; exit 1; }

# Look up data from JSON files
NOM=$(python3 -c "
import json
with open('$PROJECT_ROOT/src/data/geo/departements.geojson') as f:
    for feat in json.load(f)['features']:
        if feat['properties']['code'] == '$CODE':
            print(feat['properties']['nom'])
            break
" 2>/dev/null || echo "")

REGION=$(python3 -c "
import json
with open('$PROJECT_ROOT/src/data/france-regions.json') as f:
    print(json.load(f).get('$CODE', ''))
" 2>/dev/null || echo "")

[ -z "$NOM" ] && { echo "Error: Department $CODE not found in GeoJSON"; exit 1; }

# Fill template
sed -e "s/^code:\s*$/code: \"${CODE}\"/" \
    -e "s/^nom:\s*$/nom: \"${NOM}\"/" \
    -e "s/^region:\s*$/region: \"${REGION}\"/" \
    -e "s/^prefecture:\s*$/prefecture: \"\"/" \
    "$TEMPLATE" > "$TARGET"

echo "✓ Created $TARGET"
${EDITOR:-vi} "$TARGET"
