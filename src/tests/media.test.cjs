/**
 * media.test.cjs — Validation tests for the media asset system.
 * Run with: node --test src/tests/media.test.cjs
 * Requires `npm run build` first (tests build output).
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const mediaDataPath = path.join(__dirname, '..', 'data', 'media.json');
const sourcesDir = path.join(__dirname, '..', 'sources');
const publicMediaDir = path.join(__dirname, '..', '..', 'public', 'media');

// ── Test 1: media.json exists and has valid structure ──
assert.ok(fs.existsSync(mediaDataPath), 'src/data/media.json must exist');
const mediaData = JSON.parse(fs.readFileSync(mediaDataPath, 'utf-8'));
assert.ok(Array.isArray(mediaData), 'media.json must be an array');
assert.ok(mediaData.length >= 5, 'Must have at least 5 media entries');
console.log(`✓ Test 1: media.json valid with ${mediaData.length} entries`);

// ── Test 2: Every entry has required fields ──
for (const entry of mediaData) {
  assert.ok(entry.id, `Entry must have "id" (got ${JSON.stringify(entry)})`);
  assert.ok(entry.alt, `Entry ${entry.id} must have "alt" text`);
  assert.ok(entry.alt.length >= 10, `Entry ${entry.id} alt text must be ≥ 10 chars`);
}
console.log('✓ Test 2: All entries have required fields (id, alt)');

// ── Test 3: Every sourceId reference resolves ──
if (fs.existsSync(sourcesDir)) {
  const sourceFiles = fs.readdirSync(sourcesDir).filter(f => f.endsWith('.json'));
  const sourceIds = new Set(
    sourceFiles.map(f => JSON.parse(fs.readFileSync(path.join(sourcesDir, f), 'utf-8')).id)
  );
  for (const entry of mediaData) {
    if (entry.sourceId) {
      assert.ok(sourceIds.has(entry.sourceId),
        `Entry ${entry.id}: sourceId "${entry.sourceId}" must exist in src/sources/`);
    }
  }
  console.log('✓ Test 3: All sourceId references in media.json resolve');
} else {
  console.log('⚠ Test 3: sources directory not found — skip cross-ref check');
}

// ── Test 4: Each media entry has a corresponding file in public/media/ ──
assert.ok(fs.existsSync(publicMediaDir), 'public/media/ directory must exist');
const mediaFiles = fs.readdirSync(publicMediaDir);
for (const entry of mediaData) {
  const hasSvg = mediaFiles.includes(`${entry.id}.svg`);
  const hasRaster = mediaFiles.some(f =>
    f.startsWith(entry.id + '.') &&
    /\.(jpg|jpeg|png|gif|webp|avif)$/.test(f)
  );
  assert.ok(hasSvg || hasRaster,
    `Entry ${entry.id} must have a matching file in public/media/`);
}
console.log('✓ Test 4: All media entries have matching files in public/media/');

// ── Test 5: Build output includes media files ──
const distMediaDir = path.join(__dirname, '..', '..', 'dist', 'media');
if (fs.existsSync(distMediaDir)) {
  const builtFiles = fs.readdirSync(distMediaDir);
  for (const entry of mediaData) {
    assert.ok(builtFiles.includes(`${entry.id}.svg`),
      `Entry ${entry.id}.svg must be in dist/media/`);
  }
  console.log(`✓ Test 5: ${mediaData.length} media files in build output`);
} else {
  console.log('⚠ Test 5: dist/media/ not found — run `npm run build` first');
}

// ── Test 6: Every mediaId reference in data files resolves ──
const dataFiles = ['france.json', 'history.json'];
const mediaIds = new Set(mediaData.map(e => e.id));

for (const dataFile of dataFiles) {
  const filePath = path.join(__dirname, '..', 'data', dataFile);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf-8');
  const refRegex = /"mediaId"\s*:\s*"([^"]+)"/g;
  let match;
  while ((match = refRegex.exec(content)) !== null) {
    assert.ok(mediaIds.has(match[1]),
      `File ${dataFile}: mediaId "${match[1]}" not found in media.json`);
  }
}
console.log('✓ Test 6: All mediaId references in data files resolve');

// ── Test 7: License field is present on all entries ──
for (const entry of mediaData) {
  assert.ok(entry.license, `Entry ${entry.id} should have a license field`);
}
console.log('✓ Test 7: All entries have license attribution');

console.log('\n🎉 All media validation tests passed!');
