#!/usr/bin/env bash
set -euo pipefail

# ─── new-event.sh ────────────────────────────────────────────────────
# Scaffold a new event content file from the editorial template.
#
# Usage:   scripts/new-event.sh <id> [year]
# Example: scripts/new-event.sh bataille-de-marignan 1515
#
# The script copies templates/event-template.md → src/content/events/<id>.md,
# prefills the id: field (and optionally start:/end:), then opens the new
# file in $EDITOR.
# ──────────────────────────────────────────────────────────────────────

readonly PROG="new-event.sh"
readonly ID="${1:?"Usage: $PROG <id> [year]"}"
readonly YEAR="${2:-}"
readonly TEMPLATE="templates/event-template.md"
readonly TARGET="src/content/events/${ID}.md"

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

# If year provided, prefill start and end (numeric, no quotes)
if [ -n "$YEAR" ]; then
  # Only replace blank start:/end: lines (not already-filled ones)
  sed -i "s/^start:\s*$/start: ${YEAR}/" "$TARGET"
  sed -i "s/^end:\s*$/end: ${YEAR}/" "$TARGET"
fi

echo "✓ Created $TARGET"

# ── Open in editor ───────────────────────────────────────────────────
${EDITOR:-vim} "$TARGET"
