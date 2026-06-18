/**
 * france-map.test.js — Validation tests for France map data and component
 * Run with: node --test src/tests/france-map.test.js
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// ── Test 1: Data file exists and has valid structure ──
const dataPath = path.join(__dirname, '..', 'data', 'france-map-data.json');
assert.ok(fs.existsSync(dataPath), 'france-map-data.json must exist');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
assert.ok(data.france, 'Data must have france key');
assert.ok(data.france.path, 'France path must exist');
assert.ok(data.france.path.length > 1000, 'France path must be > 1000 chars');
assert.ok(data.france.bbox, 'France bbox must exist');
assert.ok(data.france.viewBox, 'France viewBox must exist');
console.log('✓ Test 1: Data file structure valid');

// ── Test 2: DOM-COM territories present ──
assert.ok(Array.isArray(data.dom), 'DOM must be an array');
assert.equal(data.dom.length, 5, 'Must have 5 DOM territories');
const expectedIds = ['Guadeloupe', 'Martinique', 'Guyane', 'Réunion', 'Mayotte'];
for (const id of expectedIds) {
  const t = data.dom.find(d => d.id === id);
  assert.ok(t, `Territory ${id} must exist`);
  assert.ok(t.path, `Territory ${id} must have path`);
  assert.ok(t.path.length > 100, `Territory ${id} path must be > 100 chars`);
  assert.ok(t.viewBox, `Territory ${id} must have viewBox`);
}
console.log('✓ Test 2: All 5 DOM-COM territories present and valid');

// ── Test 3: France SVG source asset exists ──
const svgPath = path.join(__dirname, '..', '..', 'public', 'France_departements.svg');
assert.ok(fs.existsSync(svgPath), 'France_departements.svg must exist in public/');
const svgContent = fs.readFileSync(svgPath, 'utf-8');
assert.ok(svgContent.includes('Terres_françaises'), 'Source SVG must contain Terres_françaises');
assert.ok(svgContent.includes('Encarts_DOM-COM'), 'Source SVG must contain DOM-COM insets');
assert.ok(svgContent.includes('Départements_Métropolitains'), 'Source SVG must contain departments');
console.log('✓ Test 3: Source SVG asset in public/ is valid');

// ── Test 3b: Department data file exists ──
const deptDataPath = path.join(__dirname, '..', 'data', 'france-departments.json');
assert.ok(fs.existsSync(deptDataPath), 'france-departments.json must exist');
const deptData = JSON.parse(fs.readFileSync(deptDataPath, 'utf-8'));
assert.ok(Array.isArray(deptData.departments), 'Departments field must be an array');
assert.equal(deptData.departments.length, 96, 'Must have 96 metropolitan departments');
const sampleDepts = ['01', '75', '2A', '2B', '88'];
for (const num of sampleDepts) {
  const d = deptData.departments.find(d => d.num === num);
  assert.ok(d, `Department ${num} must exist`);
  assert.ok(d.name, `Department ${num} must have a name`);
  assert.ok(d.path.length > 100, `Department ${num} path must be > 100 chars`);
}
console.log(`✓ Test 3b: Department data file valid (${deptData.departments.length} depts)`);

// ── Test 4: Build output exists ──
const distPath = path.join(__dirname, '..', '..', 'dist', 'index.html');
assert.ok(fs.existsSync(distPath), 'Built index.html must exist');
const html = fs.readFileSync(distPath, 'utf-8');
assert.ok(html.includes('france-map'), 'Built HTML must contain france-map class');
assert.ok(html.includes('dom-insets'), 'Built HTML must contain dom-insets class');
assert.ok(html.includes('Guadeloupe'), 'Built HTML must contain Guadeloupe');
assert.ok(html.includes('Martinique'), 'Built HTML must contain Martinique');
assert.ok(html.includes('Guyane'), 'Built HTML must contain Guyane');
assert.ok(html.includes('La Réunion'), 'Built HTML must contain La Réunion');
assert.ok(html.includes('Mayotte'), 'Built HTML must contain Mayotte');
console.log('✓ Test 4: Build output contains all expected elements');

// ── Test 5: ViewBox dimensions are reasonable ──
const vb = data.france.viewBox;
assert.ok(vb.width > 1000 && vb.width < 3000, 'France viewBox width should be 1000-3000');
assert.ok(vb.height > 1000 && vb.height < 3000, 'France viewBox height should be 1000-3000');
assert.ok(vb.x >= 0, 'France viewBox x should be >= 0');
assert.ok(vb.y >= 0, 'France viewBox y should be >= 0');
console.log('✓ Test 5: ViewBox dimensions reasonable');

// ── Test 6: InteractiveFranceMap component is under 500 lines ──
const componentPath = path.join(__dirname, '..', '..', 'src', 'components', 'InteractiveFranceMap.astro');
assert.ok(fs.existsSync(componentPath), 'InteractiveFranceMap.astro must exist');
const componentLines = fs.readFileSync(componentPath, 'utf-8').split('\n').length;
assert.ok(componentLines <= 500, `Component must be ≤ 500 lines (currently ${componentLines})`);
console.log(`✓ Test 6: Component at ${componentLines} lines (≤ 500)`);

// ── Test 7: Geography sub-page exists ──
const geoPagePath = path.join(__dirname, '..', '..', 'dist', 'geographie', 'departements-francais', 'index.html');
assert.ok(fs.existsSync(geoPagePath), 'Geography sub-page must exist');
const geoHtml = fs.readFileSync(geoPagePath, 'utf-8');
assert.ok(geoHtml.includes('department--geography'), 'Geography page must have interactive map');
assert.ok(geoHtml.includes('data-preview-name'), 'Geography page must have Tippy tooltip data attributes');
console.log('✓ Test 7: Geography sub-page built correctly');

console.log('\n🎉 All tests passed!');
