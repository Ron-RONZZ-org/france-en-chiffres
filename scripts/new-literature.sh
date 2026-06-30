#!/usr/bin/env bash
set -euo pipefail

# ─── new-literature.sh ──────────────────────────────────────────────
# Scaffold a new literature content file from the editorial template.
#
# Usage:   scripts/new-literature.sh <id> <year>
# Example: scripts/new-literature.sh candide-ou-l-optimisme 1759
#
# The script copies templates/literature-template.md →
# src/content/litterature/<id>.md, prefills the id: and year: fields,
# then opens the new file in $EDITOR.
# ──────────────────────────────────────────────────────────────────────

readonly PROG="new-literature.sh"
readonly ID="${1:?"Usage: $PROG <id> <year>"}"
readonly YEAR="${2:?"Usage: $PROG <id> <year>"}"
readonly TEMPLATE="templates/literature-template.md"
readonly TARGET="src/content/litterature/${ID}.md"

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

# ── Ensure target directory exists ──
mkdir -p "$(dirname "$TARGET")"

# ── Scaffold ─────────────────────────────────────────────────────────
cp "$TEMPLATE" "$TARGET"

# Prefill id and year fields
sed -i "s/^id:\s*$/id: ${ID}/" "$TARGET"
sed -i "s/^year:\s*$/year: ${YEAR}/" "$TARGET"

echo "✓ Created $TARGET"

# ── Open in editor ───────────────────────────────────────────────────
${EDITOR:-vim} "$TARGET"
