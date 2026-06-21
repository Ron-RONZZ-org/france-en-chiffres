#!/usr/bin/env bash
set -euo pipefail

# ─── new-figure.sh ───────────────────────────────────────────────────
# Scaffold a new chart figure JSON file from the editorial template.
#
# Usage:   scripts/new-figure.sh <id> <type>
# Example: scripts/new-figure.sh population-evolution line
#
# Supported types: line, bar, population-pyramid, bump, choropleth,
#                  comparison, sankey
#
# Creates src/content/figures/<id>.json, prefills the id/type fields,
# then opens the new file in $EDITOR.
# ──────────────────────────────────────────────────────────────────────

readonly PROG="new-figure.sh"
readonly ID="${1:?"Usage: $PROG <id> <type>"}"
readonly TYPE="${2:?"Usage: $PROG <id> <type>"}"
readonly TEMPLATE="templates/figure-template.json"
readonly TARGET="src/content/figures/${ID}.json"

VALID_TYPES="line|bar|population-pyramid|bump|choropleth|comparison|sankey"
if ! echo "$TYPE" | grep -qE "^($VALID_TYPES)$"; then
  echo "Error: unknown type \"$TYPE\". Valid types: ${VALID_TYPES//|/, }" >&2
  exit 1
fi

# ── Pre-flight checks ────────────────────────────────────────────────
if [ ! -f "$TEMPLATE" ]; then
  echo "Error: template not found — $TEMPLATE" >&2
  echo "Run this script from the project root (france-en-chiffres/)." >&2
  exit 1
fi

if [ -f "$TARGET" ]; then
  echo "Error: target already exists — $TARGET" >&2
  exit 1
fi

# ── Scaffold ─────────────────────────────────────────────────────────
cp "$TEMPLATE" "$TARGET"

# Prefill id and type using sed
sed -i "s/\"\"$/\"${ID}\"/; s/\"line\"/\"${TYPE}\"/" "$TARGET"

echo "✓ Created $TARGET"

# ── Open in editor ───────────────────────────────────────────────────
${EDITOR:-vim} "$TARGET"
