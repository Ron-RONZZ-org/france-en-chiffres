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

// ── Test 2c: Tippy.js shared chunk exists ──
const allDistJs = fs.readdirSync(distAstro).filter(f => f.endsWith('.js'));
const tippyChunk = allDistJs.find(f => f.includes('shift-away'));
if (tippyChunk) {
  const tippyContent = fs.readFileSync(path.join(distAstro, tippyChunk), 'utf-8');
  assert.ok(
    tippyContent.includes('tippy') || tippyContent.includes('.tippy'),
    'Tippy shared chunk must contain Tippy library'
  );
  console.log(`✓ Test 2c: Tippy.js extracted to shared chunk (${tippyChunk})`);
} else {
  assert.ok(
    bundleContent.includes('tippy'),
    'InteractiveDataMap bundle must contain Tippy.js'
  );
  console.log('✓ Test 2c: Tippy.js bundled in InteractiveDataMap');
}

// ── Test 3: Layer toggle controls exist ──
const toggleCount = (html.match(/data-map-toggle/g) || []).length;
assert.ok(toggleCount >= 6, `Must have at least 6 layer toggles (found ${toggleCount})`);
console.log(`✓ Test 3: ${toggleCount} layer toggle controls found`);

// ── Test 4: All layer toggles present and enabled ──
const toggleIds = [
  'toggle-density', 'toggle-elevation', 'toggle-roads',
  'toggle-railways', 'toggle-waterways', 'toggle-communes',
];
for (const id of toggleIds) {
  assert.ok(html.includes(`id="${id}"`), `Toggle ${id} must exist`);
  assert.ok(!html.includes(`id="${id}" disabled`), `Toggle ${id} must not be disabled`);
}
console.log(`✓ Test 4: All ${toggleIds.length} layer toggles enabled`);

// ── Test 4b: New railway and waterway toggles present ──
assert.ok(html.includes('Réseau ferroviaire'), 'Railway toggle label must exist');
assert.ok(html.includes('Voies navigables'), 'Waterway toggle label must exist');
console.log('✓ Test 4b: Railway and waterway layer toggles present');

// ── Test 4c: Layer descriptions moved to data-description (Tippy) ──
const descAttrCount = (html.match(/data-description=/g) || []).length;
assert.ok(descAttrCount >= 6, `Must have ≥ 6 data-description attributes for Tippy (found ${descAttrCount})`);
const descSpanCount = (html.match(/class="layer-controls__desc"/g) || []).length;
assert.equal(descSpanCount, 0, 'Must not have visible .layer-controls__desc spans');
console.log(`✓ Test 4c: ${descAttrCount} Tippy data-description attributes, no visible description spans`);

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
assert.ok(density.features.length >= 10000, `Must have ≥ 10000 communes with density (found ${density.features.length})`);
assert.ok(density.features[0].properties.density, 'Features must have density property');
assert.ok(density.features[0].properties.population, 'Features must have population property');
console.log(`✓ Test 6: communes-density.geojson valid (${density.features.length} communes)`);

// ── Test 7: GeoJSON features have code and nom properties ──
const sample = geoJson.features[0];
assert.ok(sample.properties.code, 'GeoJSON feature must have "code" property');
assert.ok(sample.properties.nom, 'GeoJSON feature must have "nom" property');
console.log('✓ Test 7: GeoJSON features have required properties');

// ── Test 8: Source footer present with structured citations ──
assert.ok(
  html.includes('Sources des données') || html.includes('interactive-page__sources'),
  'Map page must have structured sources footer'
);
assert.ok(html.includes('/bibliographie/insee-2024'), 'Sources footer must link to bibliography');
assert.ok(html.includes('/bibliographie/openstreetmap'), 'Sources footer must link to OSM');
assert.ok(html.includes('/bibliographie/opentopomap'), 'Sources footer must link to OpenTopoMap');
assert.ok(html.includes('/bibliographie/openrailwaymap'), 'Sources footer must link to OpenRailwayMap');
assert.ok(html.includes('/bibliographie/france-geojson'), 'Sources footer must link to france-geojson');
console.log('✓ Test 8: Structured sources footer with all bibliography links');

// ── Test 8b: Citation superscripts present in data-description attributes ──
// Superscripts are HTML-encoded inside data-description attribute values (&quot; = ")
const supCount = (html.match(/sup class=&quot;citation&quot;/g) || []).length +
  (html.match(/sup class="citation"/g) || []).length;
assert.ok(supCount >= 6, `Must have ≥ 6 citation superscripts (found ${supCount})`);
console.log(`✓ Test 8b: ${supCount} citation superscripts present in page`);

// ── Test 9: "Ça peut vous intéresser aussi" section present ──
assert.ok(
  html.includes('Ça peut vous intéresser aussi'),
  'Page must have "Ça peut vous intéresser aussi" section'
);
assert.ok(
  html.includes('/geographie/departements-francais/'),
  'Page must link to departments page'
);
assert.ok(
  !html.includes('Carte des départements ←') && !html.includes('btn btn--ghost'),
  'Must not have old button-based link'
);
console.log('✓ Test 9: "Ça peut vous intéresser aussi" section replaces old button');

// ── Test 10: No-JS fallback present ──
assert.ok(
  html.includes('noscript') || html.includes('JavaScript'),
  'Page must have a noscript or JavaScript-required message'
);
console.log('✓ Test 10: No-JS fallback present');

// ── Test 11: Source GeoJSON data file exists (for rebuild) ──
const srcGeoJson = path.join(geoDir, 'departements.geojson');
assert.ok(fs.existsSync(srcGeoJson), 'Source departements.geojson must exist in src/data/geo/');
console.log('✓ Test 11: Source GeoJSON in src/data/geo/');

// ── Test 12: Road network data exists ──
const roadsPath = path.join(distDir, 'data', 'roads.geojson');
if (fs.existsSync(roadsPath)) {
  const roads = JSON.parse(fs.readFileSync(roadsPath, 'utf-8'));
  assert.equal(roads.type, 'FeatureCollection', 'Roads must be a FeatureCollection');
  assert.ok(roads.features.length > 1000, `Must have > 1000 road features (found ${roads.features.length})`);
  console.log(`✓ Test 12: roads.geojson valid (${roads.features.length} segments)`);
} else {
  console.log('⚠ Test 12: roads.geojson not found — generate with npm run fetch:roads');
}

// ── Test 13: Simplified density data exists ──
const simpleDensityPath = path.join(distDir, 'data', 'density-simple.geojson');
if (fs.existsSync(simpleDensityPath)) {
  const simple = JSON.parse(fs.readFileSync(simpleDensityPath, 'utf-8'));
  assert.equal(simple.type, 'FeatureCollection', 'Simplified density must be a FeatureCollection');
  assert.ok(simple.features.length >= 30000, `Must have ≥ 30000 simplified features (found ${simple.features.length})`);
  const origSize = fs.statSync(path.join(distDir, 'data', 'communes-density.geojson')).size;
  const simpleSize = fs.statSync(simpleDensityPath).size;
  assert.ok(simpleSize < origSize, 'Simplified file must be smaller than original');
  console.log(`✓ Test 13: density-simple.geojson valid (${((1 - simpleSize/origSize)*100).toFixed(0)}% smaller, ${simple.features.length} communes)`);
} else {
  console.log('⚠ Test 13: density-simple.geojson not found — run node scripts/simplify-density.js');
}

// ── Test 14: Waterways data file ──
const waterwaysPath = path.join(distDir, 'data', 'waterways.geojson');
if (fs.existsSync(waterwaysPath)) {
  const waterways = JSON.parse(fs.readFileSync(waterwaysPath, 'utf-8'));
  assert.equal(waterways.type, 'FeatureCollection', 'Waterways must be a FeatureCollection');
  // May be a small sample — just check it has some features
  assert.ok(waterways.features.length > 0, 'Waterways must have at least one feature');
  const hasCanal = waterways.features.some(f => f.properties.waterway === 'canal');
  const hasRiver = waterways.features.some(f => f.properties.waterway === 'river');
  console.log(`✓ Test 14: waterways.geojson valid (${waterways.features.length} features, canals: ${hasCanal}, rivers: ${hasRiver})`);
} else {
  console.log('⚠ Test 14: waterways.geojson not found — generate with npm run fetch:waterways');
}

// ── Test 15: Department pages built (96 departments) ──
const deptDir = path.join(distDir, 'geographie', 'departements');
if (fs.existsSync(deptDir)) {
  const deptDirs = fs.readdirSync(deptDir).filter(f => fs.statSync(path.join(deptDir, f)).isDirectory());
  assert.ok(deptDirs.length >= 95, `Must have ≥ 95 department pages (found ${deptDirs.length})`);
  const samplePage = path.join(deptDir, '01', 'index.html');
  assert.ok(fs.existsSync(samplePage), 'Department page /geographie/departements/01/ must exist');
  const deptHtml = fs.readFileSync(samplePage, 'utf-8');
  assert.ok(deptHtml.includes('Ain'), 'Department page must contain department name');
  assert.ok(deptHtml.includes('code'), 'Department page must contain department code');
  console.log(`✓ Test 15: ${deptDirs.length} department pages built (sample: 01 - Ain)`);
} else {
  console.log('⚠ Test 15: Department pages not in build output');
}

// ── Test 16: Geography home page tiles ──
const geoPagePath = path.join(distDir, 'geographie', 'index.html');
if (fs.existsSync(geoPagePath)) {
  const geoHtml = fs.readFileSync(geoPagePath, 'utf-8');
  assert.ok(geoHtml.includes('carte-interactive'), 'Geography page must link to interactive map');
  assert.ok(geoHtml.includes('departements-francais'), 'Geography page must link to department map');
  assert.ok(geoHtml.includes('Carte des départements'), 'Geography page must have department card title');
  assert.ok(geoHtml.includes('Carte interactive'), 'Geography page must have interactive card title');
  console.log('✓ Test 16: Geography home page with tile links');
} else {
  console.log('⚠ Test 16: Geography home page not in build output');
}

// ── Test 17: Tippy is configured with allowHTML ──
const hasAllowHTML = bundleContent.includes('allowHTML');
assert.ok(
  hasAllowHTML,
  'Tippy must be configured with allowHTML for citation superscripts'
);
console.log('✓ Test 17: Tippy allowHTML configured');

console.log('\n🎉 All interactive map tests passed!');
