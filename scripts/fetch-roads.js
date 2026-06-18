/**
 * fetch-roads.js — Create French major road network GeoJSON
 * Run: node scripts/fetch-roads.js
 *
 * Tries to fetch motorways and trunk roads for France from Overpass API.
 * If Overpass times out (large query), creates a sample file with clear
 * instructions for generating the full dataset.
 *
 * For production use, Option B (osmium + ogr2ogr) is recommended.
 *
 * License: ODbL — © les contributeurs d'OpenStreetMap
 * Source: https://www.openstreetmap.org/copyright
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, '..', 'public', 'data', 'roads.geojson');
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

async function fetchFromOverpass() {
  console.log('→ Attempting Overpass API query (motorways + trunk roads)...');
  console.log('  This may take 60–90 seconds.');

  // Query motorways only (smaller set) with full geometry
  const query = `
[out:json][timeout:90];
(
  way["highway"="motorway"](41.3,-5.1,51.5,8.5);
  way["highway"="trunk"](41.3,-5.1,51.5,8.5);
);
out geom;
`;

  const resp = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'france-en-chiffres/1.0 (educational project)',
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(100_000),
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();

  if (!data.elements || data.elements.length === 0) {
    throw new Error('Empty response — query may have timed out on the server');
  }

  return data.elements;
}

function elementsToGeoJSON(elements) {
  const features = [];
  for (const el of elements) {
    if (el.type !== 'way' || !el.geometry) continue;
    const coords = el.geometry.map(p => [p.lon, p.lat]);
    features.push({
      type: 'Feature',
      properties: {
        highway: el.tags?.highway || 'unknown',
        name: el.tags?.name || '',
        ref: el.tags?.ref || '',
      },
      geometry: { type: 'LineString', coordinates: coords },
    });
  }

  features.sort((a, b) => {
    if (a.properties.highway === 'motorway' && b.properties.highway !== 'motorway') return -1;
    if (a.properties.highway !== 'motorway' && b.properties.highway === 'motorway') return 1;
    return 0;
  });

  return {
    type: 'FeatureCollection',
    source: 'OpenStreetMap — © les contributeurs d\'OpenStreetMap',
    sourceUrl: 'https://www.openstreetmap.org/copyright',
    license: 'ODbL',
    generated: new Date().toISOString().split('T')[0],
    features,
  };
}

async function main() {
  console.log('=== France Road Network GeoJSON ===\n');

  let geojson;

  try {
    const elements = await fetchFromOverpass();
    geojson = elementsToGeoJSON(elements);
    console.log(`  ✓ Received ${elements.length} elements from Overpass`);
  } catch (err) {
    console.log(`  ✗ Overpass API failed: ${err.message}\n`);
    console.log('  Creating instructions file instead.\n');
    console.log('  ── To generate roads.geojson for production ──\n');
    console.log('  Requires: osmium-tool, ogr2ogr (available via apt/osmosis/Docker)');
    console.log('');
    console.log('  1. Download France OSM extract (~400 MB):');
    console.log('     wget https://download.geofabrik.de/europe/france-latest.osm.pbf');
    console.log('');
    console.log('  2. Filter motorways and trunk roads:');
    console.log('     osmium tags-filter france-latest.osm.pbf \\');
    console.log('       w/highway=motorway,w/highway=trunk \\');
    console.log('       -o france-major-roads.osm.pbf');
    console.log('');
    console.log('  3. Convert and simplify to GeoJSON:');
    console.log('     ogr2ogr -f GeoJSON -simplify 0.00005 roads.geojson \\');
    console.log('       france-major-roads.osm.pbf lines');
    console.log('');
    console.log(`  4. Move to project: mv roads.geojson ${OUTPUT}`);

    // Create a minimal sample for testing (Île-de-France motorways)
    console.log('\n  Creating sample dataset (Île-de-France only) for testing...\n');

    // Download just Paris-region data
    const sampleQuery = `
[out:json][timeout:30];
(
  way["highway"="motorway"](48.5,1.8,49.2,3.0);
  way["highway"="trunk"](48.5,1.8,49.2,3.0);
);
out geom;
`;
    try {
      const resp = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'france-en-chiffres/1.0 (educational project)',
        },
        body: new URLSearchParams({ data: sampleQuery }),
        signal: AbortSignal.timeout(30_000),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.elements && data.elements.length > 0) {
          geojson = elementsToGeoJSON(data.elements);
          geojson.is_sample = true;
          geojson.sample_notice = 'This is a sample (Île-de-France only). Replace with full France dataset.';
          console.log(`  ✓ Sample created with ${data.elements.length} road segments (Île-de-France)`);
        }
      }
    } catch {
      console.log('  ✗ Could not fetch sample data either.');
    }

    if (!geojson) {
      process.exit(1);
    }
  }

  const jsonStr = JSON.stringify(geojson);
  writeFileSync(OUTPUT, jsonStr);
  const sizeKB = (jsonStr.length / 1024).toFixed(0);
  const mCount = geojson.features.filter(f => f.properties.highway === 'motorway').length;
  const tCount = geojson.features.filter(f => f.properties.highway === 'trunk').length;
  console.log(`\n  ✓ Saved: ${OUTPUT} (${sizeKB} KB, ${geojson.features.length} segments, ${mCount} motorways, ${tCount} trunks)`);
}

main();
