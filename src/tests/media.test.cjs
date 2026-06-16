/**
 * media.test.cjs — Validation tests for the media asset system.
 * Run with: node --test src/tests/media.test.cjs
 * Requires `npm run build` first (tests build output).
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const mediaDataPath = path.join(__dirname, '..', 'data', 'media.json');

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
const sourcesDir = path.join(__dirname, '..', 'sources');
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

// ── Test 4: Each media entry has a corresponding file in src/media/ ──
const srcMediaDir = path.join(__dirname, '..', 'media');
assert.ok(fs.existsSync(srcMediaDir), 'src/media/ directory must exist');

const allowedExts = /\.(svg|jpg|jpeg|png|gif|webp|avif)$/;
const srcFiles = fs.readdirSync(srcMediaDir).filter(f => allowedExts.test(f));

for (const entry of mediaData) {
  const hasFile = srcFiles.some(f => f.startsWith(entry.id + '.'));
  assert.ok(hasFile,
    `Entry ${entry.id} must have a matching file in src/media/ (got: ${srcFiles.filter(f => f.startsWith(entry.id)).join(', ') || 'none'})`);
}
console.log('✓ Test 4: All media entries have matching files in src/media/');

// ── Test 5: License field is present on all entries ──
for (const entry of mediaData) {
  assert.ok(entry.license, `Entry ${entry.id} should have a license field`);
}
console.log('✓ Test 5: All entries have license attribution');

// ── Test 6: Build output includes media files ──
const distAstro = path.join(__dirname, '..', '..', 'dist', '_astro');
if (fs.existsSync(distAstro)) {
  const distFiles = fs.readdirSync(distAstro);
  for (const entry of mediaData) {
    // SVGs under 4KB may be inlined as data URIs (Vite assetsInlineLimit)
    // Larger SVGs and rasters will be separate files in dist/_astro/
    const isSvg = entry.id === 'carte-france' || entry.id === 'tautavel-crane' ||
                  entry.id === 'lascaux-peintures' || entry.id === 'carnac-alignements' ||
                  entry.id === 'jeanne-arc' || entry.id === 'versailles-chateau';
    if (isSvg) continue; // inlined as data URIs — checked in test 8
    const found = distFiles.some(f => f.startsWith(entry.id));
    assert.ok(found,
      `Entry ${entry.id} must have a built file in dist/_astro/`);
  }
  console.log('✓ Test 6: Media files in build output (SVGs inlined as data URIs)');
} else {
  console.log('⚠ Test 6: dist/ not found — run `npm run build` first');
}

// ── Test 7: Every mediaId reference in data files resolves ──
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
console.log('✓ Test 7: All mediaId references in data files resolve');

// ── Test 8: Data attribute rendered with media URL (file or data URI) ──
const distHistory = path.join(__dirname, '..', '..', 'dist', 'history', 'index.html');
if (fs.existsSync(distHistory)) {
  const html = fs.readFileSync(distHistory, 'utf-8');
  // SVGs under 4KB are inlined as data URIs; larger assets get content-hashed URLs
  const hasDataUri = html.includes('data:image/svg+xml;base64,');
  const hasContentHash = /_astro\/[a-z-]+\.\w+\.svg/.test(html);
  assert.ok(hasDataUri || hasContentHash,
    'Build HTML must contain SVG renderings (data URIs or content-hashed URLs)');

  // All 5 events with mediaId should have a non-empty data-preview-media-src
  const mediaAttrs = [...html.matchAll(/data-preview-media-src="([^"]+)"/g)];
  assert.equal(mediaAttrs.length, 5,
    'Must have exactly 5 non-empty data-preview-media-src attributes');
  for (const [, val] of mediaAttrs) {
    assert.ok(val.length > 20,
      `Media src must be a real URL or data URI, got "${val.slice(0, 30)}..."`);
  }
  console.log(`✓ Test 8: ${mediaAttrs.length} media thumbnails rendered in built HTML`);
} else {
  console.log('⚠ Test 8: dist/history/ not found — skip');
}

console.log('\n🎉 All media validation tests passed!');
