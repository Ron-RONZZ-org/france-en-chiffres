/**
 * citations.test.cjs — Validation tests for inline citation system.
 * Run with: node src/tests/citations.test.cjs
 *
 * Tests the `[source: id]` inline citation syntax:
 * - Unit test: regex extraction from body text
 * - Integration test: build output contains <sup class="citation"> links
 * - Integration test: sources list appears in footer
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// The same regex used by the rehype plugin and the page component
const CITATION_RE = /\[source:\s+([\w-]+)\]/g;

// ── Helper: extract source IDs from body text ──
function extractSourceIds(body) {
  return [...body.matchAll(CITATION_RE)].map((m) => m[1]);
}

// ── Helper: extract frontmatter sourceId ──
function extractFrontmatterSourceId(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/sourceId:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

// ── Test 1: Regex extraction works on plain text ──
{
  const ids = extractSourceIds(
    'Some text [source: bnf] and more [source: societe-voltaire] end.',
  );
  assert.deepEqual(ids, ['bnf', 'societe-voltaire']);
}
console.log('✓ Test 1: Regex extracts multiple source IDs from text');

// ── Test 2: Regex handles no citations ──
{
  const ids = extractSourceIds('Plain text without any citations.');
  assert.deepEqual(ids, []);
}
console.log('✓ Test 2: Regex returns empty array for text without citations');

// ── Test 3: Regex handles kebab-case IDs ──
{
  const ids = extractSourceIds(
    '[source: hominides-lezignan] [source: musee-archeologie-nationale] [source: tautavel-musee]',
  );
  assert.deepEqual(ids, ['hominides-lezignan', 'musee-archeologie-nationale', 'tautavel-musee']);
}
console.log('✓ Test 3: Regex handles kebab-case source IDs');

// ── Test 4: Regex handles citation at start and end of text ──
{
  const ids = extractSourceIds('[source: bnf] at the start.');
  assert.deepEqual(ids, ['bnf']);

  const ids2 = extractSourceIds('At the end [source: bnf]');
  assert.deepEqual(ids2, ['bnf']);
}
console.log('✓ Test 4: Regex handles citations at start/end of text');

// ── Test 5: Plural sourceIds in the same line ──
{
  const ids = extractSourceIds('[source: bnf][source: insee-2024]');
  assert.deepEqual(ids, ['bnf', 'insee-2024']);
}
console.log('✓ Test 5: Regex handles adjacent citations');

// ── Test 6: Event with inline citations has valid source references ──
const eventsDir = path.join(__dirname, '..', 'content', 'events');
const sourcesDir = path.join(__dirname, '..', 'content', 'sources');
const sourceFiles = fs.readdirSync(sourcesDir).filter((f) => f.endsWith('.json'));
const sourceIds = new Set(
  sourceFiles.map((f) => JSON.parse(fs.readFileSync(path.join(sourcesDir, f), 'utf-8')).id),
);

// Check all events for inline citations
if (fs.existsSync(eventsDir)) {
  const eventFiles = fs.readdirSync(eventsDir).filter((f) => f.endsWith('.md'));
  const unresolvedInline = [];

  for (const file of eventFiles) {
    const content = fs.readFileSync(path.join(eventsDir, file), 'utf-8');
    // Extract citations only from the body (after closing frontmatter ---)
    const bodyStart = content.indexOf('\n---\n', 4);
    if (bodyStart === -1) continue;
    const body = content.slice(bodyStart + 5); // skip the second --- and newline

    const inlineIds = extractSourceIds(body);
    for (const id of inlineIds) {
      if (!sourceIds.has(id)) {
        unresolvedInline.push({ file, id });
      }
    }
  }

  assert.equal(
    unresolvedInline.length,
    0,
    `Unresolved inline source references: ${JSON.stringify(unresolvedInline)}`,
  );
}
console.log('✓ Test 6: All inline [source: id] references in events resolve to valid CSL-JSON files');

// ── Test 7: Build output contains citation markers (run after build) ──
const distDir = path.join(__dirname, '..', '..', 'dist');
if (fs.existsSync(distDir)) {
  // Check the encyclopedie page (has inline citations)
  const eventPage = path.join(distDir, 'evenements', 'encyclopedie', 'index.html');
  assert.ok(fs.existsSync(eventPage), 'Built /evenements/encyclopedie/index.html must exist');
  const html = fs.readFileSync(eventPage, 'utf-8');

  // Should have <sup class="citation"> elements
  assert.ok(
    html.includes('<sup class="citation">'),
    'Event page must contain <sup class="citation"> for inline citations',
  );

  // Should link to the bibliography
  assert.ok(
    html.includes('/bibliographie/bnf'),
    'Event page must link to /bibliographie/bnf',
  );
  assert.ok(
    html.includes('/bibliographie/societe-voltaire'),
    'Event page must link to /bibliographie/societe-voltaire',
  );

  // Should have the sources footer
  assert.ok(
    html.includes('Sources'),
    'Event page footer must contain "Sources" heading',
  );

  // Should have an ordered list
  assert.ok(
    html.includes('<ol'),
    'Event page footer must contain an ordered source list',
  );

  console.log('✓ Test 7: Build output contains citation superscripts and source list');
} else {
  console.log('⚠ Test 7: Build output not found — skip (run `npm run build` first)');
}

console.log('\n🎉 All inline citation tests passed!');
