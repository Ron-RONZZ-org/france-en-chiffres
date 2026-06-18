/**
 * fetch-communes.js — Download simplified French commune boundaries as GeoJSON
 * Run: node scripts/fetch-communes.js
 *
 * Sources (in order of preference):
 *   1. geo.api.gouv.fr — French government geo API (Open Licence 2.0)
 *   2. IGN ADMIN EXPRESS — via manual download
 *
 * The full dataset has ~35,000 communes. This script tries to fetch a
 * simplified version. If that fails, it provides manual instructions.
 *
 * Output: public/data/communes.geojson
 * License: Open Licence 2.0 (Etalab)
 */

import { writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, '..', 'public', 'data', 'communes.geojson');

function saveGeoJSON(geojson, label) {
  const jsonStr = JSON.stringify(geojson);
  writeFileSync(OUTPUT, jsonStr);
  const sizeKB = (jsonStr.length / 1024).toFixed(0);
  console.log(`  ✓ Saved ${label}: ${OUTPUT} (${sizeKB} KB, ${geojson.features.length} communes)`);
}

async function tryGeoApiGouv() {
  console.log('→ Attempt 1: geo.api.gouv.fr (simplified commune boundaries)...');

  // Fetch communes with contour geometry (simplified)
  // Limit to first 1000 for speed; full dataset needs pagination
  const url = 'https://geo.api.gouv.fr/communes?' +
    'fields=code,nom,contour&format=geojson&boost=code&limit=1000';

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'france-en-chiffres/1.0 (educational project)' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    if (!data.features || data.features.length === 0) throw new Error('Empty response');

    console.log(`  ✓ Received ${data.features.length} communes`);

    // Clean up properties
    for (const f of data.features) {
      f.properties = {
        code: f.properties.code,
        nom: f.properties.nom,
      };
    }

    const geojson = {
      type: 'FeatureCollection',
      source: 'API géo — data.gouv.fr',
      sourceUrl: 'https://geo.api.gouv.fr/',
      license: 'Open Licence 2.0',
      generated: new Date().toISOString().split('T')[0],
      features: data.features,
      is_sample: true,
      sample_notice: 'Sample of 1000 communes. Full dataset requires pagination or ADMIN EXPRESS.',
    };

    return geojson;
  } catch (err) {
    console.log(`  ✗ API failed: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('=== French Commune Boundaries GeoJSON ===\n');

  let geojson = await tryGeoApiGouv();

  if (geojson) {
    saveGeoJSON(geojson, 'sample (1000 communes)');
    console.log('\n  ⚠ This is a sample. For the full 35,000 communes:');
    printInstructions();
  } else {
    console.log('\n  ── Could not fetch commune boundaries. ──\n');
    printInstructions();
    process.exit(1);
  }
}

function printInstructions() {
  console.log('');
  console.log('  Option A — IGN ADMIN EXPRESS (recommended, free):');
  console.log('    1. Download from https://geoservices.ign.fr/adminexpress');
  console.log('       (Look for "ADMIN EXPRESS — Communes" in Shapefile format)');
  console.log('    2. Simplify with mapshaper:');
  console.log('       npx mapshaper communes.shp -simplify dp 1% -o format=geojson communes.geojson');
  console.log(`    3. Move to project: mv communes.geojson ${OUTPUT}`);
  console.log('');
  console.log('  Option B — data.gouv.fr simplified dataset:');
  console.log('    1. Browse https://www.data.gouv.fr/fr/datasets/contours-des-communes-de-france-simplifie/');
  console.log('    2. Download the simplified GeoJSON');
  console.log(`    3. Copy to ${OUTPUT}`);
  console.log('');
  console.log('  Option C — OSM export via Geofabrik:');
  console.log('    1. wget https://download.geofabrik.de/europe/france-latest.osm.pbf');
  console.log('    2. osmium tags-filter france-latest.osm.pbf r/admin_level=8 -o communes.osm.pbf');
  console.log('    3. ogr2ogr -f GeoJSON -simplify 0.001 communes.geojson communes.osm.pbf multipolygons');
  console.log(`    4. mv communes.geojson ${OUTPUT}`);
}

main();
