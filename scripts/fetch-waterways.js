/**
 * fetch-waterways.js — Create French navigable waterways GeoJSON
 * Run:    node scripts/fetch-waterways.js
 *
 * Fetches navigable waterways from Overpass API (canals + boat/navigable rivers).
 * Caches the result locally — if output file already exists, skips API call.
 *
 * License: ODbL — © les contributeurs d'OpenStreetMap
 * Source: https://www.openstreetmap.org/copyright
 */

import { writeFileSync, existsSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, '..', 'public', 'data', 'waterways.geojson');
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

async function fetchFromOverpass() {
  console.log('→ Querying Overpass API for navigable waterways (canals + navigable rivers)...');
  console.log('  This may take 60–90 seconds.\n');

  // Query canals and navigable rivers in metropolitan France
  const query = `
[out:json][timeout:90];
area["ISO3166-1"="FR"][admin_level=2];
(
  way["waterway"="canal"](area);
  way["waterway"="river"]["boat"="yes"](area);
  way["waterway"="river"]["navigable"="yes"](area);
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
  const seen = new Set();
  for (const el of elements) {
    if (el.type !== 'way' || !el.geometry) continue;
    if (seen.has(el.id)) continue;
    seen.add(el.id);

    const coords = el.geometry.map(p => [p.lon, p.lat]);
    const waterway = el.tags?.waterway || 'unknown';
    const name = el.tags?.name || '';
    const isCanal = waterway === 'canal';
    const boat = el.tags?.boat || el.tags?.navigable || '';

    features.push({
      type: 'Feature',
      properties: {
        waterway,
        name,
        boat,
        type: isCanal ? 'canal' : 'navigable_river',
      },
      geometry: { type: 'LineString', coordinates: coords },
    });
  }

  features.sort((a, b) => {
    if (a.properties.type === 'canal' && b.properties.type !== 'canal') return -1;
    if (a.properties.type !== 'canal' && b.properties.type === 'canal') return 1;
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
  console.log('=== France Navigable Waterways GeoJSON ===\n');

  // ── Cache check: skip API call if file already exists and is non-trivial ──
  if (existsSync(OUTPUT)) {
    const stats = statSync(OUTPUT);
    if (stats.size > 1024) {
      const sizeKB = (stats.size / 1024).toFixed(0);
      console.log(`  ✓ Cached file exists: ${OUTPUT} (${sizeKB} KB)`);
      console.log('  Skipping Overpass API call. Delete the file to re-fetch.\n');
      return;
    }
  }

  let geojson;

  try {
    const elements = await fetchFromOverpass();
    geojson = elementsToGeoJSON(elements);
    console.log(`  ✓ Received ${elements.length} elements from Overpass`);
  } catch (err) {
    console.log(`  ✗ Overpass API failed: ${err.message}\n`);
    console.log('  ── To generate manually ──\n');
    console.log('  Requires: osmium-tool, ogr2ogr (available via apt/osmosis/Docker)\n');
    console.log('  1. Download France OSM extract:');
    console.log('     wget https://download.geofabrik.de/europe/france-latest.osm.pbf\n');
    console.log('  2. Filter canals and navigable rivers:');
    console.log('     osmium tags-filter france-latest.osm.pbf \\');
    console.log('       w/waterway=canal,w/waterway=river \\');
    console.log('       -o france-waterways.osm.pbf\n');
    console.log('  3. Convert to GeoJSON:');
    console.log('     ogr2ogr -f GeoJSON -simplify 0.00005 waterways.geojson \\');
    console.log('       france-waterways.osm.pbf lines\n');
    console.log(`  4. Move to project: mv waterways.geojson ${OUTPUT}\n`);

    // Try a smaller sample (Île-de-France only)
    console.log('  Creating sample dataset (Île-de-France only) for testing...\n');
    const sampleQuery = `
[out:json][timeout:30];
area["name"="Île-de-France"][admin_level=4];
(
  way["waterway"="canal"](area);
  way["waterway"="river"]["boat"="yes"](area);
  way["waterway"="river"]["navigable"="yes"](area);
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
          console.log(`  ✓ Sample created with ${data.elements.length} waterways (Île-de-France)`);
        }
      }
    } catch (sampleErr) {
      console.log(`  ✗ Could not fetch sample data: ${sampleErr.message}`);
    }

    if (!geojson) {
      process.exit(1);
    }
  }

  const jsonStr = JSON.stringify(geojson);
  writeFileSync(OUTPUT, jsonStr);
  const sizeKB = (jsonStr.length / 1024).toFixed(0);
  const canalCount = geojson.features.filter(f => f.properties.waterway === 'canal').length;
  const riverCount = geojson.features.filter(f => f.properties.waterway === 'river').length;
  console.log(`\n  ✓ Saved: ${OUTPUT} (${sizeKB} KB, ${geojson.features.length} segments, ${canalCount} canals, ${riverCount} rivers)`);
}

main();
