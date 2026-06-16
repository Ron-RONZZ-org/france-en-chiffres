#!/usr/bin/env bash
set -euo pipefail

# ─── new-era.sh ──────────────────────────────────────────────────────
# Scaffold a new era content file from the editorial template.
#
# Usage:   scripts/new-era.sh <id> <start-year> <end-year>
# Example: scripts/new-era.sh restauration 1814 1848
#
# The script copies templates/era-template.md → src/content/eras/<id>.md,
# prefills id, start, and end fields, then opens the new file in $EDITOR.
# ──────────────────────────────────────────────────────────────────────

readonly PROG="new-era.sh"
readonly ID="${1:?"Usage: $PROG <id> <start-year> <end-year>"}"
readonly START="${2:?"Usage: $PROG <id> <start-year> <end-year>"}"
readonly END="${3:?"Usage: $PROG <id> <start-year> <end-year>"}"
readonly TEMPLATE="templates/era-template.md"
readonly TARGET="src/content/eras/${ID}.md"

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

# Prefill id field (quoted YAML string)
sed -i "s/^id:\s*$/id: \"${ID}\"/" "$TARGET"

# Prefill start and end (numeric, no quotes)
sed -i "s/^start:\s*$/start: ${START}/" "$TARGET"
sed -i "s/^end:\s*$/end: ${END}/" "$TARGET"

echo "✓ Created $TARGET"

# ── Open in editor ───────────────────────────────────────────────────
${EDITOR:-vim} "$TARGET"
