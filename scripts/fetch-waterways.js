/**
 * fetch-waterways.js — Create French navigable waterways GeoJSON
 * Run:    node scripts/fetch-waterways.js
 *
 * Fetches navigable waterways from Overpass API (canals + navigable rivers).
 * Uses quadrant-based queries to avoid Overpass 504 timeouts on full France.
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

// Four quadrants covering metropolitan France (split at 48°N and 2.5°E)
const QUADRANTS = [
  { name: 'NW', bbox: '48.0,-5.1,51.5,2.5' },
  { name: 'NE', bbox: '48.0,2.5,51.5,8.5' },
  { name: 'SW', bbox: '41.3,-5.1,48.0,2.5' },
  { name: 'SE', bbox: '41.3,2.5,48.0,8.5' },
];

function buildQuery(bbox) {
  return `
[out:json][timeout:120];
(
  way["waterway"="canal"](${bbox});
  way["waterway"="river"]["boat"~"yes|permissive|motor"](${bbox});
  way["waterway"="river"]["motorboat"="yes"](${bbox});
  way["waterway"="river"]["ship"="yes"](${bbox});
  way["waterway"="river"]["navigable"="yes"](${bbox});
  way["waterway"="river"]["usage"="transportation"](${bbox});
);
out geom;
`;
}

async function queryQuadrant(quadrant) {
  console.log(`  Querying ${quadrant.name} (${quadrant.bbox})...`);
  const resp = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'france-en-chiffres/1.0 (educational project)',
    },
    body: new URLSearchParams({ data: buildQuery(quadrant.bbox) }),
    signal: AbortSignal.timeout(130_000),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => `HTTP ${resp.status}`);
    throw new Error(`HTTP ${resp.status}: ${text.substring(0, 100)}`);
  }

  const data = await resp.json();
  if (!data.elements || data.elements.length === 0) {
    throw new Error(`Empty response for ${quadrant.name}`);
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

    features.push({
      type: 'Feature',
      properties: {
        waterway,
        name,
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

  // ── Cache check: skip API call if file already exists ──
  if (existsSync(OUTPUT)) {
    const stats = statSync(OUTPUT);
    if (stats.size > 1024) {
      const sizeKB = (stats.size / 1024).toFixed(0);
      console.log(`  ✓ Cached file exists: ${OUTPUT} (${sizeKB} KB)`);
      console.log('  Skipping Overpass API calls. Delete the file to re-fetch.\n');
      return;
    }
  }

  console.log('→ Splitting France into 4 quadrants for Overpass queries...\n');

  const allElements = [];

  for (const quadrant of QUADRANTS) {
    try {
      const elements = await queryQuadrant(quadrant);
      allElements.push(...elements);
      console.log(`  ✓ ${quadrant.name}: ${elements.length} elements`);
    } catch (err) {
      console.log(`  ✗ ${quadrant.name}: ${err.message}`);
    }

    // Polite delay between queries to avoid overloading the API
    if (quadrant !== QUADRANTS[QUADRANTS.length - 1]) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (allElements.length === 0) {
    console.log('\n✗ No data received from any quadrant.\n');
    console.log('  ── To generate manually ──\n');
    console.log('  1. Download: wget https://download.geofabrik.de/europe/france-latest.osm.pbf');
    console.log('  2. osmium tags-filter france-latest.osm.pbf w/waterway=canal -o canals.osm.pbf');
    console.log('  3. ogr2ogr -f GeoJSON waterways.geojson canals.osm.pbf lines');
    console.log(`  4. mv waterways.geojson ${OUTPUT}\n`);
    process.exit(1);
  }

  const geojson = elementsToGeoJSON(allElements);

  const jsonStr = JSON.stringify(geojson);
  writeFileSync(OUTPUT, jsonStr);
  const sizeKB = (jsonStr.length / 1024).toFixed(0);
  const canalCount = geojson.features.filter(f => f.properties.waterway === 'canal').length;
  const riverCount = geojson.features.filter(f => f.properties.waterway === 'river').length;
  console.log(`\n  ✓ Saved: ${OUTPUT} (${sizeKB} KB, ${geojson.features.length} segments, ${canalCount} canals, ${riverCount} rivers)`);
}

main();
