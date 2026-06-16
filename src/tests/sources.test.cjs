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
  const hasTitle = /^title:\s/m.test(content);
  const hasStart = /^start:\s/m.test(content);
  const hasEnd = /^end:\s/m.test(content);
  const hasColor = /^color:\s/m.test(content);
  assert.ok(hasId, `Era ${file} must have "id" in frontmatter`);
  assert.ok(hasTitle, `Era ${file} must have "title" in frontmatter`);
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

// ── Test 8: Template files exist and have valid frontmatter ──
const templateDir = path.join(__dirname, '..', '..', 'templates');

// 8a: event-template.md
const eventTemplateFile = path.join(templateDir, 'event-template.md');
assert.ok(fs.existsSync(eventTemplateFile), 'templates/event-template.md must exist');
const eventTmpl = fs.readFileSync(eventTemplateFile, 'utf-8');
assert.ok(eventTmpl.startsWith('---'), 'templates/event-template.md must have YAML frontmatter');
assert.ok(eventTmpl.includes('\n---\n'), 'templates/event-template.md must have closing ---');
const evFrontmatter = eventTmpl.slice(4, eventTmpl.indexOf('\n---\n', 4));
assert.ok(/^id:/m.test(evFrontmatter), 'templates/event-template.md must contain "id"');
assert.ok(/^title:/m.test(evFrontmatter), 'templates/event-template.md must contain "title"');
assert.ok(/^start:/m.test(evFrontmatter), 'templates/event-template.md must contain "start"');
assert.ok(/^end:/m.test(evFrontmatter), 'templates/event-template.md must contain "end"');

// 8b: era-template.md
const eraTemplateFile = path.join(templateDir, 'era-template.md');
assert.ok(fs.existsSync(eraTemplateFile), 'templates/era-template.md must exist');
const eraTmpl = fs.readFileSync(eraTemplateFile, 'utf-8');
assert.ok(eraTmpl.startsWith('---'), 'templates/era-template.md must have YAML frontmatter');
assert.ok(eraTmpl.includes('\n---\n'), 'templates/era-template.md must have closing ---');
const erFrontmatter = eraTmpl.slice(4, eraTmpl.indexOf('\n---\n', 4));
assert.ok(/^id:/m.test(erFrontmatter), 'templates/era-template.md must contain "id"');
assert.ok(/^title:/m.test(erFrontmatter), 'templates/era-template.md must contain "title"');
assert.ok(/^color:/m.test(erFrontmatter), 'templates/era-template.md must contain "color"');
assert.ok(/^start:/m.test(erFrontmatter), 'templates/era-template.md must contain "start"');
assert.ok(/^end:/m.test(erFrontmatter), 'templates/era-template.md must contain "end"');

// 8c: event-example.md
const eventExampleFile = path.join(templateDir, 'event-example.md');
assert.ok(fs.existsSync(eventExampleFile), 'templates/event-example.md must exist');

// 8d: era-example.md
const eraExampleFile = path.join(templateDir, 'era-example.md');
assert.ok(fs.existsSync(eraExampleFile), 'templates/era-example.md must exist');

console.log('✓ Test 8: template files exist with valid frontmatter structure');

// ── Helper: extract numeric frontmatter field value ──
function getFrontmatterNumber(yamlBlock, field) {
  const regex = new RegExp(`^${field}:\\s*(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)`, 'm');
  const match = regex.exec(yamlBlock);
  return match ? Number(match[1]) : NaN;
}

// ── Helper: reimplementation of autoInferYearDisplay for testing ──
function formatFrenchNumber(n) {
  const abs = Math.abs(n);
  const parts = [];
  let s = abs.toString();
  while (s.length > 3) {
    parts.unshift(s.slice(-3));
    s = s.slice(0, -3);
  }
  if (s.length > 0) parts.unshift(s);
  return parts.join(' ');
}

function autoInferYearDisplay(start, end) {
  if (start === end) {
    if (start < 0) return `${formatFrenchNumber(start)} av. J.-C.`;
    return formatFrenchNumber(start);
  }
  if (start < 0 && end < 0) {
    return `${formatFrenchNumber(start)} à ${formatFrenchNumber(end)} av. J.-C.`;
  }
  if (start < 0 && end >= 0) {
    return `${formatFrenchNumber(start)} av. J.-C. à ${formatFrenchNumber(end)}`;
  }
  return `${formatFrenchNumber(start)} à ${formatFrenchNumber(end)}`;
}

// ── Test 9: All event files have end >= start ──
const allEventFiles = fs.existsSync(contentEventsDir)
  ? fs.readdirSync(contentEventsDir).filter(f => f.endsWith('.md'))
  : [];
if (allEventFiles.length > 0) {
  for (const file of allEventFiles) {
    const content = fs.readFileSync(path.join(contentEventsDir, file), 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(match, `Event ${file}: could not parse YAML frontmatter`);
    const yamlBlock = match[1];
    const start = getFrontmatterNumber(yamlBlock, 'start');
    const end = getFrontmatterNumber(yamlBlock, 'end');
    assert.ok(!isNaN(start), `Event ${file}: start is not a valid number`);
    assert.ok(!isNaN(end), `Event ${file}: end is not a valid number`);
    assert.ok(end >= start, `Event ${file}: end (${end}) < start (${start})`);
  }
}
console.log(`✓ Test 9: ${allEventFiles.length} event files — all end >= start`);

// ── Test 10: autoInferYearDisplay produces expected strings ──
const inferenceCases = [
  // [start, end, expected]
  [1789, 1789, '1 789'],
  [987, 987, '987'],
  [-450000, -450000, '450 000 av. J.-C.'],
  [-52, -52, '52 av. J.-C.'],
  [1914, 1918, '1 914 à 1 918'],
  [-17000, -15000, '17 000 à 15 000 av. J.-C.'],
  [-450000, -400000, '450 000 à 400 000 av. J.-C.'],
  [-50, 50, '50 av. J.-C. à 50'],
  [0, 0, '0'],
  [-1, -1, '1 av. J.-C.'],
  [-1500000, -1200000, '1 500 000 à 1 200 000 av. J.-C.'],
];

for (const [start, end, expected] of inferenceCases) {
  const result = autoInferYearDisplay(start, end);
  assert.equal(result, expected,
    `autoInferYearDisplay(${start}, ${end}) = "${result}", expected "${expected}"`);
}
console.log(`✓ Test 10: ${inferenceCases.length} auto-inference cases all pass`);

console.log('\n🎉 All source validation tests passed!');
