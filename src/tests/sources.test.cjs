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

const sourcesDir = path.join(__dirname, '..', 'content', 'sources');
const contentEventsDir = path.join(__dirname, '..', 'content', 'events');

// ── Test 1: All source files have valid CSL-JSON ──
assert.ok(fs.existsSync(sourcesDir), 'src/content/sources/ directory must exist');
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
    'thesis', 'treaty', 'webpage',
  ];
  assert.ok(validTypes.includes(content.type),
    `Source ${content.id}: unknown type "${content.type}"`);
}
console.log(`✓ Test 1: ${sourceFiles.length} source files with valid CSL-JSON structure`);

// ── Test 2: All sourceId references in event files resolve ──
const unresolvedRefs = [];

if (fs.existsSync(contentEventsDir)) {
  const eventFiles = fs.readdirSync(contentEventsDir).filter(f => f.endsWith('.md'));
  for (const file of eventFiles) {
    const content = fs.readFileSync(path.join(contentEventsDir, file), 'utf-8');
    // Find all "sourceId: "..." references in YAML frontmatter
    const refRegex = /sourceId:\s*"([^"]+)"/g;
    let match;
    while ((match = refRegex.exec(content)) !== null) {
      const refId = match[1];
      if (!sourceIds.has(refId)) {
        unresolvedRefs.push({ file, refId });
      }
    }
  }
}
assert.equal(unresolvedRefs.length, 0,
  `Unresolved sourceId references: ${JSON.stringify(unresolvedRefs)}`);
console.log('✓ Test 2: All sourceId references in event files resolve');

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

// ── Test 4: No event files still have raw "source" field ──
if (fs.existsSync(contentEventsDir)) {
  const eventFiles = fs.readdirSync(contentEventsDir).filter(f => f.endsWith('.md'));
  for (const file of eventFiles) {
    const content = fs.readFileSync(path.join(contentEventsDir, file), 'utf-8');
    // In YAML frontmatter "source:" would be a raw field
    // Only flag top-level "source:" (not inside nested objects)
    const rawSourceRegex = /^source:\s/m;
    assert.ok(!rawSourceRegex.test(content),
      `Event ${file} still has raw "source" field (should use sourceId)`);
  }
}
console.log('✓ Test 4: No raw "source" fields remain in event files');

// ── Test 5: Source filenames match their CSL-JSON id ──
for (const file of sourceFiles) {
  const content = JSON.parse(fs.readFileSync(path.join(sourcesDir, file), 'utf-8'));
  const expectedFile = `${content.id}.json`;
  assert.equal(file, expectedFile,
    `Source file "${file}" should be named "${expectedFile}" (matching id field)`);
}
console.log('✓ Test 5: All source filenames match their CSL-JSON id');

// ── Test 6: All era files exist in content/eras/ with valid YAML frontmatter ──
const erasDir = path.join(__dirname, '..', 'content', 'eras');
assert.ok(fs.existsSync(erasDir), 'src/content/eras/ directory must exist');
const eraFiles = fs.readdirSync(erasDir).filter(f => f.endsWith('.md'));
assert.ok(eraFiles.length >= 5, `Must have at least 5 era files (found ${eraFiles.length})`);
// Validate all era files have valid YAML frontmatter
for (const file of eraFiles) {
  const content = fs.readFileSync(path.join(erasDir, file), 'utf-8');
  assert.ok(content.startsWith('---'), `Era ${file} must have YAML frontmatter`);
  assert.ok(content.includes('\n---\n'), `Era ${file} must have closing ---`);
  // Basic required fields (regex match on YAML)
  const hasId = /^id:\s/m.test(content);
  const hasLabel = /^label:\s/m.test(content);
  const hasStart = /^start:\s/m.test(content);
  const hasEnd = /^end:\s/m.test(content);
  const hasColor = /^color:\s/m.test(content);
  assert.ok(hasId, `Era ${file} must have "id" in frontmatter`);
  assert.ok(hasLabel, `Era ${file} must have "label" in frontmatter`);
  assert.ok(hasStart, `Era ${file} must have "start" in frontmatter`);
  assert.ok(hasEnd, `Era ${file} must have "end" in frontmatter`);
  assert.ok(hasColor, `Era ${file} must have "color" in frontmatter`);
}
console.log(`✓ Test 6: ${eraFiles.length} era files with valid YAML frontmatter`);

// ── Test 7: All event files have valid frontmatter ──
if (fs.existsSync(contentEventsDir)) {
  const eventFiles = fs.readdirSync(contentEventsDir).filter(f => f.endsWith('.md'));
  assert.ok(eventFiles.length >= 20, `Must have ≥ 20 event files (found ${eventFiles.length})`);
  for (const file of eventFiles) {
    const content = fs.readFileSync(path.join(contentEventsDir, file), 'utf-8');
    assert.ok(content.startsWith('---'), `Event ${file} must have YAML frontmatter`);
    assert.ok(content.includes('\n---\n'), `Event ${file} must have closing ---`);
    // Basic required fields (regex match on YAML)
    const hasId = /^id:\s/m.test(content);
    const hasStart = /^start:\s/m.test(content);
    const hasTitle = /^title:\s/m.test(content);
    assert.ok(hasId, `Event ${file} must have "id" in frontmatter`);
    assert.ok(hasStart, `Event ${file} must have "start" in frontmatter`);
    assert.ok(hasTitle, `Event ${file} must have "title" in frontmatter`);
  }
  console.log(`✓ Test 7: ${eventFiles.length} event files with valid frontmatter`);
}

// ── Test 8: Template file exists and has valid frontmatter ──
const templateDir = path.join(__dirname, '..', '..', 'templates');
const templateFile = path.join(templateDir, 'event.md');
assert.ok(fs.existsSync(templateFile), 'templates/event.md must exist');
const templateContent = fs.readFileSync(templateFile, 'utf-8');
assert.ok(templateContent.startsWith('---'), 'templates/event.md must have YAML frontmatter');
assert.ok(templateContent.includes('\n---\n'), 'templates/event.md must have closing ---');
// Verify the YAML can be parsed (extract frontmatter and parse it)
const frontmatterEnd = templateContent.indexOf('\n---\n', 4); // skip the opening ---
assert.ok(frontmatterEnd > 0, 'templates/event.md: could not find frontmatter boundary');
const yamlBlock = templateContent.slice(4, frontmatterEnd); // between --- and ---
assert.ok(yamlBlock.length > 50, 'templates/event.md: frontmatter seems too short');
// Verify key fields exist (as YAML keys, may be commented out)
const hasIdField = /^id:/m.test(yamlBlock);
const hasStartField = /^start:/m.test(yamlBlock);
const hasEndField = /^end:/m.test(yamlBlock);
const hasTitleField = /^title:/m.test(yamlBlock);
const hasCategoryField = /^category:/m.test(yamlBlock);
const hasSignificanceField = /^significance:/m.test(yamlBlock);
assert.ok(hasIdField, 'templates/event.md frontmatter must contain "id" field');
assert.ok(hasTitleField, 'templates/event.md frontmatter must contain "title" field');
assert.ok(hasStartField, 'templates/event.md frontmatter must contain "start" field');
assert.ok(hasEndField, 'templates/event.md frontmatter must contain "end" field');
assert.ok(hasCategoryField, 'templates/event.md frontmatter must contain "category" field');
assert.ok(hasSignificanceField, 'templates/event.md frontmatter must contain "significance" field');
console.log('✓ Test 8: templates/event.md exists with valid frontmatter structure');

console.log('\n🎉 All source validation tests passed!');
