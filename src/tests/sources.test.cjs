/**
 * sources.test.cjs — Validation tests for CSL-JSON source system.
 * Run with: node --test src/tests/sources.test.cjs
 *
 * These tests run AFTER `npm run build` (they test build output too).
 * For data-level validation, they run directly on the source files.
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const sourcesDir = path.join(__dirname, '..', 'sources');
const dataDir = path.join(__dirname, '..', 'data');

// ── Test 1: All source files have valid CSL-JSON ──
assert.ok(fs.existsSync(sourcesDir), 'src/sources/ directory must exist');
const sourceFiles = fs.readdirSync(sourcesDir).filter(f => f.endsWith('.json'));
assert.ok(sourceFiles.length >= 30, `Must have ≥ 30 source files (found ${sourceFiles.length})`);

const sourceIds = new Set();
for (const file of sourceFiles) {
  const content = JSON.parse(fs.readFileSync(path.join(sourcesDir, file), 'utf-8'));
  assert.ok(content.id, `Source file ${file} must have an "id" field`);
  assert.ok(content.type, `Source file ${file} must have a "type" field`);
  assert.ok(!sourceIds.has(content.id), `Duplicate source id: ${content.id}`);
  sourceIds.add(content.id);
  // Validate against CSL-JSON known types
  const validTypes = [
    'article', 'article-journal', 'article-magazine', 'article-newspaper',
    'bill', 'book', 'broadcast', 'chapter', 'classic', 'collection',
    'dataset', 'document', 'entry', 'entry-dictionary', 'entry-encyclopedia',
    'event', 'figure', 'graphic', 'hearing', 'interview', 'legal_case',
    'legislation', 'manuscript', 'map', 'motion_picture', 'musical_score',
    'pamphlet', 'paper-conference', 'patent', 'performance', 'periodical',
    'personal_communication', 'post', 'post-weblog', 'regulation', 'report',
    'review', 'review-book', 'software', 'song', 'speech', 'standard',
    'thesis', 'treaty', 'webpage'
  ];
  assert.ok(validTypes.includes(content.type),
    `Source ${content.id}: unknown type "${content.type}"`);
}
console.log(`✓ Test 1: ${sourceFiles.length} source files with valid CSL-JSON structure`);

// ── Test 2: All sourceId references in data files resolve ──
const dataFiles = ['france.json', 'history.json'];
const unresolvedRefs = [];

for (const dataFile of dataFiles) {
  const filePath = path.join(dataDir, dataFile);
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, 'utf-8');
  // Find all "sourceId": "..." references via regex
  const refRegex = /"sourceId"\s*:\s*"([^"]+)"/g;
  let match;
  while ((match = refRegex.exec(content)) !== null) {
    const refId = match[1];
    if (!sourceIds.has(refId)) {
      unresolvedRefs.push({ file: dataFile, refId });
    }
  }
}
assert.equal(unresolvedRefs.length, 0,
  `Unresolved sourceId references: ${JSON.stringify(unresolvedRefs)}`);
console.log('✓ Test 2: All sourceId references in data files resolve');

// ── Test 3: Build output includes bibliography pages ──
const distDir = path.join(__dirname, '..', '..', 'dist');
if (fs.existsSync(distDir)) {
  const bibIndex = path.join(distDir, 'bibliography', 'index.html');
  assert.ok(fs.existsSync(bibIndex),
    'Built /bibliography/index.html must exist');
  const html = fs.readFileSync(bibIndex, 'utf-8');
  assert.ok(html.includes('Bibliographie'),
    'Bibliography page must contain "Bibliographie"');

  // Check that at least some per-source pages were generated
  const bibDir = path.join(distDir, 'bibliography');
  const pages = fs.existsSync(bibDir)
    ? fs.readdirSync(bibDir, { recursive: true }).filter(f => f.endsWith('index.html'))
    : [];
  assert.ok(pages.length >= 10,
    `Must have at least 10 per-source bibliography pages (found ${pages.length})`);
  console.log(`✓ Test 3: Build output includes bibliography (${pages.length} pages)`);
} else {
  console.log('⚠ Test 3: Build output not found — skip (run `npm run build` first)');
}

// ── Test 4: No data files still have raw "source" field ──
for (const dataFile of dataFiles) {
  const filePath = path.join(dataDir, dataFile);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf-8');
  const rawSourceRegex = /^\s+"source"\s*:/m;
  assert.ok(!rawSourceRegex.test(content),
    `File ${dataFile} still has raw "source" field (should use sourceId)`);
}
console.log('✓ Test 4: No raw "source" fields remain in data files');

// ── Test 5: Source filenames match their CSL-JSON id ──
for (const file of sourceFiles) {
  const content = JSON.parse(fs.readFileSync(path.join(sourcesDir, file), 'utf-8'));
  const expectedFile = `${content.id}.json`;
  assert.equal(file, expectedFile,
    `Source file "${file}" should be named "${expectedFile}" (matching id field)`);
}
console.log('✓ Test 5: All source filenames match their CSL-JSON id');

console.log('\n🎉 All source validation tests passed!');
