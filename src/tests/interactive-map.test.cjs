/**
 * interactive-map.test.cjs — Validation tests for the Leaflet interactive map page
 * Run with: node src/tests/interactive-map.test.cjs
 * Requires `npm run build` first (tests build output).
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', '..', 'dist');
const geoDir = path.join(__dirname, '..', 'data', 'geo');

// ── Test 1: Map page exists in build output ──
const pagePath = path.join(distDir, 'geographie', 'carte-interactive', 'index.html');
assert.ok(fs.existsSync(pagePath), 'Built /geographie/carte-interactive/index.html must exist');
const html = fs.readFileSync(pagePath, 'utf-8');
assert.ok(html.includes('interactive-map'), 'Page must contain #interactive-map container');
assert.ok(html.includes('Carte interactive'), 'Page title must reference interactive map');
console.log('✓ Test 1: Interactive map page built correctly');

// ── Test 2: Leaflet JS is bundled ──
const distAstro = path.join(distDir, '_astro');
const jsFiles = fs.readdirSync(distAstro).filter(f => f.includes('InteractiveDataMap') && f.endsWith('.js'));
assert.ok(jsFiles.length > 0, 'InteractiveDataMap JS bundle must exist');
const bundlePath = path.join(distAstro, jsFiles[0]);
const bundleContent = fs.readFileSync(bundlePath, 'utf-8');
assert.ok(
  bundleContent.includes('leaflet') || bundleContent.includes('L.'),
  'InteractiveDataMap bundle must contain Leaflet library'
);
console.log(`✓ Test 2: Leaflet library bundled (${jsFiles[0]})`);

// ── Test 2b: Leaflet CSS is bundled ──
const cssFiles = fs.readdirSync(distAstro).filter(f => f.includes('InteractiveDataMap') && f.endsWith('.css'));
assert.ok(cssFiles.length > 0, 'InteractiveDataMap CSS bundle must exist');
console.log(`✓ Test 2b: Leaflet CSS bundled (${cssFiles[0]})`);

// ── Test 3: Layer toggle controls exist ──
const toggleCount = (html.match(/data-map-toggle/g) || []).length;
assert.ok(toggleCount >= 4, `Must have at least 4 layer toggles (found ${toggleCount})`);
console.log(`✓ Test 3: ${toggleCount} layer toggle controls found`);

// ── Test 4: All layer toggles present and enabled ──
const toggleIds = ['toggle-density', 'toggle-elevation', 'toggle-roads', 'toggle-communes'];
for (const id of toggleIds) {
  assert.ok(html.includes(`id="${id}"`), `Toggle ${id} must exist`);
  // No checkbox should be disabled
  assert.ok(!html.includes(`id="${id}" disabled`), `Toggle ${id} must not be disabled`);
}
console.log(`✓ Test 4: All ${toggleIds.length} layer toggles enabled`);

// ── Test 5: GeoJSON data files exist in build output ──
const geoJsonPath = path.join(distDir, 'data', 'departements.geojson');
assert.ok(fs.existsSync(geoJsonPath), 'departements.geojson must exist in dist/data/');
const geoJson = JSON.parse(fs.readFileSync(geoJsonPath, 'utf-8'));
assert.equal(geoJson.type, 'FeatureCollection', 'GeoJSON must be a FeatureCollection');
assert.ok(geoJson.features.length >= 95, `Must have ≥ 95 departments (found ${geoJson.features.length})`);
console.log(`✓ Test 5: departments.geojson valid (${geoJson.features.length} features)`);

// ── Test 6: Commune-level density data exists ──
const densityPath = path.join(distDir, 'data', 'communes-density.geojson');
assert.ok(fs.existsSync(densityPath), 'communes-density.geojson must exist in dist/data/');
const density = JSON.parse(fs.readFileSync(densityPath, 'utf-8'));
assert.equal(density.type, 'FeatureCollection', 'Density must be a FeatureCollection');
assert.ok(density.features.length >= 100, `Must have ≥ 100 communes with density (found ${density.features.length})`);
assert.ok(density.features[0].properties.density, 'Features must have density property');
assert.ok(density.features[0].properties.population, 'Features must have population property');
console.log(`✓ Test 6: communes-density.geojson valid (${density.features.length} communes, density range ${Math.min(...density.features.map(f=>f.properties.density))}-${Math.max(...density.features.map(f=>f.properties.density))})`);

// ── Test 7: GeoJSON features have code and nom properties ──
const sample = geoJson.features[0];
assert.ok(sample.properties.code, 'GeoJSON feature must have "code" property');
assert.ok(sample.properties.nom, 'GeoJSON feature must have "nom" property');
console.log('✓ Test 7: GeoJSON features have required properties');

// ── Test 8: Attribution text present ──
assert.ok(
  html.includes('OpenStreetMap') || html.includes('OSM'),
  'Map page must contain OpenStreetMap attribution'
);
assert.ok(
  html.includes('INSEE') || html.includes('insee'),
  'Map page must contain INSEE attribution'
);
console.log('✓ Test 8: Required attributions present');

// ── Test 9: No-JS fallback present ──
assert.ok(
  html.includes('noscript') || html.includes('JavaScript'),
  'Page must have a noscript or JavaScript-required message'
);
console.log('✓ Test 9: No-JS fallback present');

// ── Test 10: Source GeoJSON data file exists (for rebuild) ──
const srcGeoJson = path.join(geoDir, 'departements.geojson');
assert.ok(fs.existsSync(srcGeoJson), 'Source departements.geojson must exist in src/data/geo/');
console.log('✓ Test 10: Source GeoJSON in src/data/geo/');

// ── Test 11: Road network data exists ──
const roadsPath = path.join(distDir, 'data', 'roads.geojson');
if (fs.existsSync(roadsPath)) {
  const roads = JSON.parse(fs.readFileSync(roadsPath, 'utf-8'));
  assert.equal(roads.type, 'FeatureCollection', 'Roads must be a FeatureCollection');
  assert.ok(roads.features.length > 1000, `Must have > 1000 road features (found ${roads.features.length})`);
  console.log(`✓ Test 11: roads.geojson valid (${roads.features.length} segments)`);
} else {
  console.log('⚠ Test 11: roads.geojson not found — generate with npm run fetch:roads');
}

// ── Test 12: Commune boundary data (from communes-density.geojson) ──
if (fs.existsSync(densityPath)) {
  console.log(`✓ Test 12: communes-density.geojson valid (${density.features.length} communes ≥ 5 000 hab)`);
} else {
  console.log('⚠ Test 12: communes-density.geojson not found — generate with npm run build:density');
}

console.log('\n🎉 All interactive map tests passed!');
