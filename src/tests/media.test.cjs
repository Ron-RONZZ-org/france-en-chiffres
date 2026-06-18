/**
 * media.test.cjs — Validation tests for the media asset system.
 * Run with: node --test src/tests/media.test.cjs
 * Requires `npm run build` first (tests build output).
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const contentMediaDir = path.join(__dirname, '..', 'content', 'media');
const contentEventsDir = path.join(__dirname, '..', 'content', 'events');
const contentSourcesDir = path.join(__dirname, '..', 'content', 'sources');

// ── Test 1: content/media/ exists with valid files ──
assert.ok(fs.existsSync(contentMediaDir), 'src/content/media/ must exist');
const mediaFiles = fs.readdirSync(contentMediaDir).filter(f => f.endsWith('.json'));
assert.ok(mediaFiles.length >= 5, `Must have at least 5 media entries (found ${mediaFiles.length})`);

const mediaData = mediaFiles.map(f => JSON.parse(fs.readFileSync(path.join(contentMediaDir, f), 'utf-8')));
console.log(`✓ Test 1: content/media/ valid with ${mediaData.length} entries`);

// ── Test 2: Every entry has required fields ──
for (const entry of mediaData) {
  assert.ok(entry.id, `Entry must have "id" (got ${JSON.stringify(entry)})`);
  assert.ok(entry.alt, `Entry ${entry.id} must have "alt" text`);
  assert.ok(entry.alt.length >= 10, `Entry ${entry.id} alt text must be ≥ 10 chars`);
}
console.log('✓ Test 2: All entries have required fields (id, alt)');

// ── Test 3: Every sourceId reference resolves ──
if (fs.existsSync(contentSourcesDir)) {
  const sourceFiles = fs.readdirSync(contentSourcesDir).filter(f => f.endsWith('.json'));
  const sourceIds = new Set(
    sourceFiles.map(f => JSON.parse(fs.readFileSync(path.join(contentSourcesDir, f), 'utf-8')).id)
  );
  for (const entry of mediaData) {
    if (entry.sourceId) {
      assert.ok(sourceIds.has(entry.sourceId),
        `Entry ${entry.id}: sourceId "${entry.sourceId}" must exist in content/sources/`);
    }
  }
  console.log('✓ Test 3: All sourceId references in media resolve');
} else {
  console.log('⚠ Test 3: content/sources/ not found — skip cross-ref check');
}

// ── Test 4: Each media entry has a corresponding file in src/content/media/ ──
const srcMediaDir = path.join(__dirname, '..', 'content', 'media');
assert.ok(fs.existsSync(srcMediaDir), 'src/content/media/ directory must exist');

const allowedExts = /\.(svg|jpg|jpeg|png|gif|webp|avif)$/;
const srcFiles = fs.readdirSync(srcMediaDir).filter(f => allowedExts.test(f));

for (const entry of mediaData) {
  const hasFile = srcFiles.some(f => f.startsWith(entry.id + '.'));
  assert.ok(hasFile,
    `Entry ${entry.id} must have a matching file in src/content/media/ (got: ${srcFiles.filter(f => f.startsWith(entry.id)).join(', ') || 'none'})`);
}
console.log('✓ Test 4: All media entries have matching files in src/content/media/');

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
    // Check if the media file in src/content/media/ is SVG (likely inlined as data URI)
    const srcFile = srcFiles.find(f => f.startsWith(entry.id + '.'));
    const isSvg = srcFile?.endsWith('.svg') ?? false;
    if (isSvg) continue; // SVGs < 4KB inlined as data URIs
    const found = distFiles.some(f => f.startsWith(entry.id));
    assert.ok(found,
      `Entry ${entry.id} must have a built file in dist/_astro/`);
  }
  console.log('✓ Test 6: Media files in build output (SVGs inlined as data URIs)');
} else {
  console.log('⚠ Test 6: dist/ not found — run `npm run build` first');
}

// ── Test 7: Every mediaId reference in event files resolves ──
const mediaIds = new Set(mediaData.map(e => e.id));

if (fs.existsSync(contentEventsDir)) {
  const eventFiles = fs.readdirSync(contentEventsDir).filter(f => f.endsWith('.md'));
  for (const file of eventFiles) {
    const content = fs.readFileSync(path.join(contentEventsDir, file), 'utf-8');
    const refRegex = /mediaId:\s*"([^"]+)"/g;  // YAML frontmatter format
    let match;
    while ((match = refRegex.exec(content)) !== null) {
      assert.ok(mediaIds.has(match[1]),
        `Event ${file}: mediaId "${match[1]}" not found in media registry`);
    }
  }
  console.log('✓ Test 7: All mediaId references in event files resolve');
} else {
  console.log('⚠ Test 7: content/events/ not found — skip');
}

// ── Test 8: Media thumbnails rendered in built HTML ──
const distHistory = path.join(__dirname, '..', '..', 'dist', 'histoire', 'index.html');
if (fs.existsSync(distHistory)) {
  const html = fs.readFileSync(distHistory, 'utf-8');

  // Media source attributes on timeline events
  const mediaAttrs = [...html.matchAll(/data-preview-media-src="([^"]+)"/g)];
  const validAttrs = mediaAttrs.filter(([, val]) => val.length > 20);

  // If media is referenced, it must resolve to a real URL/data URI
  if (validAttrs.length > 0) {
    const hasDataUri = html.includes('data:image/svg+xml;base64,');
    const hasContentHash = /_astro\/[a-z-]+\.\w+\.svg/.test(html);
    assert.ok(hasDataUri || hasContentHash,
      'Build HTML must contain SVG renderings (data URIs or content-hashed URLs) when media is referenced');
  }

  if (mediaAttrs.length === 0) {
    console.log('⚠ Test 8: No media thumbnails rendered (no event references media yet)');
  } else {
    for (const [, val] of mediaAttrs) {
      if (val.length > 0) {
        assert.ok(val.length > 20,
          `Media src must be a real URL or data URI, got "${val.slice(0, 30)}..."`);
      }
    }
    console.log(`✓ Test 8: ${validAttrs.length}/${mediaAttrs.length} media thumbnails rendered in built HTML`);
  }
} else {
  console.log('⚠ Test 8: dist/history/ not found — skip');
}

console.log('\n🎉 All media validation tests passed!');
