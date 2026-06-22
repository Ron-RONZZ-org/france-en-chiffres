#!/usr/bin/env bash
set -euo pipefail

# ─── new-media.sh ──────────────────────────────────────────────────
# Scaffold a new media entry: copies the source file and creates
# the JSON metadata.
#
# Usage:
#   scripts/new-media.sh <source-file>
#     → ID derived from filename (normalized)
#   scripts/new-media.sh <id> <source-file>
#     → explicit ID
#
# Examples:
#   scripts/new-media.sh ~/Downloads/Château-versailles.jpg
#   scripts/new-media.sh versailles ~/Downloads/Château-versailles.jpg
#
# Normalizes filenames: NFD-decompose → strip diacritics → lowercase
# → [^a-z0-9]+ → "-" → trim dashes.
# ─────────────────────────────────────────────────────────────────────

readonly PROG="new-media.sh"

# ── Normalize ID ───────────────────────────────────────────────────
# Takes a filename stem, returns a normalized kebab-case ID.
normalize_id() {
  node -e "
const s = process.argv[1];
const id = s
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+\$/g, '');
console.log(id || 'untitled');
" "$1"
}

# ── Parse args ─────────────────────────────────────────────────────
if [ $# -eq 0 ]; then
  echo "Usage: $PROG [<id>] <source-file>" >&2
  exit 1
fi

if [ $# -eq 1 ]; then
  SOURCE_FILE="$1"
  BASENAME="$(basename "$SOURCE_FILE")"
  STEM="${BASENAME%.*}"
  ID="$(normalize_id "$STEM")"
elif [ $# -eq 2 ]; then
  ID="$1"
  SOURCE_FILE="$2"
else
  echo "Usage: $PROG [<id>] <source-file>" >&2
  exit 1
fi

# ── Paths ──────────────────────────────────────────────────────────
readonly TEMPLATE="templates/media-template.json"
readonly TARGET_DIR="src/content/media"
readonly TARGET_JSON="${TARGET_DIR}/${ID}.json"
readonly EXT="${SOURCE_FILE##*.}"
readonly TARGET_FILE="${TARGET_DIR}/${ID}.${EXT}"

# ── Pre-flight checks ─────────────────────────────────────────────
if [ ! -f "$TEMPLATE" ]; then
  echo "Error: template not found — $TEMPLATE" >&2
  echo "Run this script from the project root (france-en-chiffres/)." >&2
  exit 1
fi

if [ ! -f "$SOURCE_FILE" ]; then
  echo "Error: source file not found — $SOURCE_FILE" >&2
  exit 1
fi

# Validate extension
LOWER_EXT="$(echo "$EXT" | tr '[:upper:]' '[:lower:]')"
case "$LOWER_EXT" in
  svg|png|jpg|jpeg|gif|webp|avif) ;;
  *)
    echo "Error: unsupported file type '.$EXT' — use SVG, PNG, JPG, JPEG, GIF, WebP, or AVIF." >&2
    exit 1
    ;;
esac

if [ -f "$TARGET_JSON" ]; then
  echo "Error: metadata already exists — $TARGET_JSON" >&2
  exit 1
fi

if [ -f "$TARGET_FILE" ]; then
  echo "Error: media file already exists — $TARGET_FILE" >&2
  exit 1
fi

echo "ID: $ID"

# ── Copy media file ────────────────────────────────────────────────
cp "$SOURCE_FILE" "$TARGET_FILE"
echo "✓ Copied $SOURCE_FILE → $TARGET_FILE"

# ── Scaffold JSON metadata ────────────────────────────────────────
cp "$TEMPLATE" "$TARGET_JSON"

# Prefill id and optionally detect dimensions
node -e "
const fs = require('fs');
const path = '$TARGET_JSON';
let d = JSON.parse(fs.readFileSync(path, 'utf-8'));
d.id = '$ID';

const ext = '$LOWER_EXT';
if (ext !== 'svg') {
  try {
    const cp = require('child_process');
    const info = cp.execFileSync('identify', ['-format', '%w %h', '$TARGET_FILE'], {encoding: 'utf-8'}).trim();
    const [w, h] = info.split(' ').map(Number);
    if (w > 0) d.width = w;
    if (h > 0) d.height = h;
  } catch {
    // identify not available — width/height stay null
  }
}

fs.writeFileSync(path, JSON.stringify(d, null, 2) + '\n');
"

echo "✓ Created $TARGET_JSON"
echo ""
echo "→ Fill in alt text, caption, credit, and sourceId:"
echo "   ${EDITOR:-vim} \"$TARGET_JSON\""

# ── Open in editor ────────────────────────────────────────────────
${EDITOR:-vim} "$TARGET_JSON"
