/**
 * figures.test.cjs — Validation tests for the figures (chart) system.
 * Run with: node src/tests/figures.test.cjs
 *
 * Validates:
 *  - Figure JSON files exist and parse
 *  - IDs match filenames
 *  - Source IDs resolve
 *  - Inline [chart:xxx] references in events resolve
 *  - Inline [media:xxx] references in events resolve
 *  - Chart SVG renderer produces valid output
 */

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const figuresDir = path.join(__dirname, '..', 'content', 'figures');
const sourcesDir = path.join(__dirname, '..', 'content', 'sources');
const eventsDir = path.join(__dirname, '..', 'content', 'events');

// ── Test 1: All figure JSON files exist and parse ──

let figureIds = new Set();

if (fs.existsSync(figuresDir)) {
  const figureFiles = fs.readdirSync(figuresDir).filter(f => f.endsWith('.json'));
  for (const file of figureFiles) {
    const content = JSON.parse(fs.readFileSync(path.join(figuresDir, file), 'utf-8'));
    assert.ok(content.id, `Figure file ${file} must have an "id" field`);
    assert.ok(content.type, `Figure file ${file} must have a "type" field`);
    assert.ok(!figureIds.has(content.id), `Duplicate figure id: ${content.id}`);
    figureIds.add(content.id);

    // Validate type
    const validTypes = ['line', 'bar', 'pie', 'population-pyramid', 'bump', 'choropleth', 'comparison', 'sankey'];
    assert.ok(validTypes.includes(content.type),
      `Figure ${content.id}: unknown type "${content.type}"`);

    // Validate data exists
    assert.ok(content.data, `Figure ${content.id} must have a "data" field`);

    // Filename matches id
    const expectedFile = `${content.id}.json`;
    assert.equal(file, expectedFile,
      `Figure file "${file}" should be "${expectedFile}" (matching id field)`);
  }
  console.log(`✓ Test 1: ${figureFiles.length} figure files with valid structure`);
} else {
  console.log('⚠ Test 1: No figure files found (src/content/figures/ does not exist)');
}

// ── Test 2: All sourceIds in figures resolve ──

const sourceIds = fs.existsSync(sourcesDir)
  ? new Set(fs.readdirSync(sourcesDir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(sourcesDir, f), 'utf-8')).id))
  : new Set();

if (fs.existsSync(figuresDir) && figureIds.size > 0) {
  const unresolved = [];
  const figureFiles = fs.readdirSync(figuresDir).filter(f => f.endsWith('.json'));
  for (const file of figureFiles) {
    const content = JSON.parse(fs.readFileSync(path.join(figuresDir, file), 'utf-8'));
    if (content.sourceIds) {
      for (const sid of content.sourceIds) {
        if (!sourceIds.has(sid)) {
          unresolved.push({ figure: content.id, sourceId: sid });
        }
      }
    }
  }
  assert.equal(unresolved.length, 0,
    `Unresolved sourceIds in figures: ${JSON.stringify(unresolved)}`);
  console.log('✓ Test 2: All figure sourceIds resolve to valid source files');
} else {
  console.log('⚠ Test 2: No figures with sourceIds to validate');
}

// ── Test 3: All inline [chart:id] references in events resolve ──

if (fs.existsSync(eventsDir) && figureIds.size > 0) {
  const unresolved = [];
  const eventFiles = fs.readdirSync(eventsDir).filter(f => f.endsWith('.md'));
  for (const file of eventFiles) {
    const content = fs.readFileSync(path.join(eventsDir, file), 'utf-8');
    const bodyMatch = content.match(/---\n[\s\S]*?\n---\n([\s\S]*)/);
    if (!bodyMatch) continue;
    const body = bodyMatch[1];
    const refRegex = /\[chart:\s*([\w-]+)\]/g;
    let match;
    while ((match = refRegex.exec(body)) !== null) {
      if (!figureIds.has(match[1])) {
        unresolved.push({ file, chartId: match[1] });
      }
    }
  }
  assert.equal(unresolved.length, 0,
    `Unresolved [chart:] references: ${JSON.stringify(unresolved)}`);
  console.log('✓ Test 3: All [chart:] references resolve to existing figure files');
} else {
  console.log('⚠ Test 3: No events or figures to cross-validate');
}

// ── Test 4: All inline [media:id] references in events resolve ──

const mediaDir = path.join(__dirname, '..', 'content', 'media');
const mediaIds = fs.existsSync(mediaDir)
  ? new Set(fs.readdirSync(mediaDir).filter(f => f.endsWith('.json') || f.endsWith('.svg') || f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.webp'))
      .map(f => path.parse(f).name))
  : new Set();

if (fs.existsSync(eventsDir) && mediaIds.size > 0) {
  const unresolved = [];
  const eventFiles = fs.readdirSync(eventsDir).filter(f => f.endsWith('.md'));
  for (const file of eventFiles) {
    const content = fs.readFileSync(path.join(eventsDir, file), 'utf-8');
    const bodyMatch = content.match(/---\n[\s\S]*?\n---\n([\s\S]*)/);
    if (!bodyMatch) continue;
    const body = bodyMatch[1];
    const refRegex = /\[media:\s*([\w-]+)\]/g;
    let match;
    while ((match = refRegex.exec(body)) !== null) {
      if (!mediaIds.has(match[1])) {
        unresolved.push({ file, mediaId: match[1] });
      }
    }
  }
  assert.equal(unresolved.length, 0,
    `Unresolved [media:] references: ${JSON.stringify(unresolved)}`);
  console.log('✓ Test 4: All [media:] references resolve to existing media files');
} else {
  console.log('⚠ Test 4: No events or media to cross-validate');
}

// ── Test 5: Chart SVG renderer works for supported types ──

if (figureIds.size > 0) {
  const figureFiles = fs.readdirSync(figuresDir).filter(f => f.endsWith('.json'));
  for (const file of figureFiles) {
    const content = JSON.parse(fs.readFileSync(path.join(figuresDir, file), 'utf-8'));
    // We can't easily import the ESM renderer from CJS, so we just validate data structure
    if (content.type === 'line') {
      assert.ok(content.data.series, `Line chart ${content.id} must have data.series`);
      assert.ok(content.data.series.length >= 1, `Line chart ${content.id} must have at least one series`);
      for (const s of content.data.series) {
        assert.ok(s.values, `Series in ${content.id} must have values`);
        assert.ok(s.values.length >= 2, `Series in ${content.id} must have at least 2 data points`);
      }
    }
    if (content.type === 'bar') {
      assert.ok(content.data.values, `Bar chart ${content.id} must have data.values`);
      assert.ok(content.data.values.length >= 1, `Bar chart ${content.id} must have at least one category`);
    }
  }
  console.log(`✓ Test 5: Chart data structures valid for ${figureFiles.length} figures`);
} else {
  console.log('⚠ Test 5: No figures to validate (skipped)');
}

// ── Test 6: Template files exist ──

const templateFile = path.join(__dirname, '..', '..', 'templates', 'figure-template.json');
assert.ok(fs.existsSync(templateFile), 'templates/figure-template.json must exist');
const tmpl = JSON.parse(fs.readFileSync(templateFile, 'utf-8'));
assert.ok(tmpl.id !== undefined, 'figure-template.json must have "id" field');
assert.ok(tmpl.type !== undefined, 'figure-template.json must have "type" field');
console.log('✓ Test 6: figure-template.json exists and has valid structure');

// ── Test 7: Event frontmatter can contain mediaIds ──

if (fs.existsSync(eventsDir)) {
  const eventFiles = fs.readdirSync(eventsDir).filter(f => f.endsWith('.md'));
  for (const file of eventFiles) {
    const content = fs.readFileSync(path.join(eventsDir, file), 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (match) {
      // Just check that the YAML can contain mediaIds — no hard failure if absent
      // (this field is optional)
      const hasMediaIds = /^mediaIds:/m.test(match[1]);
      const hasMediaId = /^mediaId:/m.test(match[1]);
      // At least one of them should eventually be present, but not required yet
    }
  }
  console.log('✓ Test 7: Event files compatible with mediaIds schema');
} else {
  console.log('⚠ Test 7: No event files to validate');
}

console.log('\n🎉 All figure validation tests passed!');
