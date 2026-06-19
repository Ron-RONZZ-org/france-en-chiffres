/**
 * fetch-waterways.js — Create French navigable waterways GeoJSON
 * Run:    node scripts/fetch-waterways.js
 *
 * Fetches navigable waterways from Overpass API using quadrant-based queries.
 * Results are accumulated in memory and saved atomically at the end.
 *
 * If a quadrant fails (504 timeout), it retries with smaller sub-quadrants.
 * Already-downloaded data is preserved in memory so partial progress is never lost.
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

// ── Quadrant definitions ──
// Large quadrants covering metropolitan France (split at 48°N and 2.5°E)
const MAIN_QUADRANTS = [
  { name: 'NW', bbox: '48.0,-5.1,51.5,2.5' },
  { name: 'NE', bbox: '48.0,2.5,51.5,8.5' },
  { name: 'SW', bbox: '41.3,-5.1,48.0,2.5' },
  { name: 'SE', bbox: '41.3,2.5,48.0,8.5' },
];

// Sub-quadrants (for retrying failed quadrants)
// NE split into 4 at 49.8°N and 5.5°E
const NE_SUB = [
  { name: 'NE-NW', bbox: '48.0,2.5,49.8,5.5' },
  { name: 'NE-NE', bbox: '48.0,5.5,49.8,8.5' },
  { name: 'NE-SW', bbox: '49.8,2.5,51.5,5.5' },
  { name: 'NE-SE', bbox: '49.8,5.5,51.5,8.5' },
];

// NE-SW split further into 4 at 50.65°N and 4.0°E
const NE_SW_SUB = [
  { name: 'NE-SW-a', bbox: '49.8,2.5,50.65,4.0' },
  { name: 'NE-SW-b', bbox: '49.8,4.0,50.65,5.5' },
  { name: 'NE-SW-c', bbox: '50.65,2.5,51.5,4.0' },
  { name: 'NE-SW-d', bbox: '50.65,4.0,51.5,5.5' },
];

// Tiny sub-sub for very dense areas (the Calais/Dunkirk region)
const NE_SW_C_SUB = [
  { name: 'NE-SW-c1', bbox: '50.65,2.5,51.07,3.25' },
  { name: 'NE-SW-c2', bbox: '50.65,3.25,51.07,4.0' },
  { name: 'NE-SW-c3', bbox: '51.07,2.5,51.5,3.25' },
  { name: 'NE-SW-c4', bbox: '51.07,3.25,51.5,4.0' },
];

// NE-NW split into 2 at 48.9°N (missing fallback — the 48-49.8°N band
// covering most of Grand Est: Vosges, Moselle, Meuse, Alsace, Marne)
const NE_NW_SUB = [
  { name: 'NE-NW-a', bbox: '48.0,2.5,48.9,5.5' },
  { name: 'NE-NW-b', bbox: '48.9,2.5,49.8,5.5' },
];

// NE-NE split into 2 at 48.9°N
const NE_NE_SUB = [
  { name: 'NE-NE-a', bbox: '48.0,5.5,48.9,8.5' },
  { name: 'NE-NE-b', bbox: '48.9,5.5,49.8,8.5' },
];

// SE split into 4 at 44.65°N and 5.5°E (missing retry — same bug as NE-NW/NE-NE)
const SE_SUB = [
  { name: 'SE-NW', bbox: '41.3,2.5,44.65,5.5' },
  { name: 'SE-NE', bbox: '41.3,5.5,44.65,8.5' },
  { name: 'SE-SW', bbox: '44.65,2.5,48.0,5.5' },
  { name: 'SE-SE', bbox: '44.65,5.5,48.0,8.5' },
];

// SW split into canals-only and rivers-only
const SW_SUB = [
  { name: 'SW-canals', bbox: '41.3,-5.1,48.0,2.5', filter: 'way["waterway"="canal"]' },
  { name: 'SW-rivers', bbox: '41.3,-5.1,48.0,2.5', filter: null },  // use full navigable query
];

function buildQuery(bbox, customFilter) {
  const queryBody = customFilter || `
    way["waterway"="canal"](${bbox});
    way["waterway"="river"]["boat"~"yes|permissive|motor"](${bbox});
    way["waterway"="river"]["motorboat"="yes"](${bbox});
    way["waterway"="river"]["ship"="yes"](${bbox});
    way["waterway"="river"]["navigable"="yes"](${bbox});
    way["waterway"="river"]["usage"="transportation"](${bbox});
  `;
  return `[out:json][timeout:120]; (${queryBody}); out geom;`;
}

async function queryQuadrant(name, bbox, customFilter) {
  const q = buildQuery(bbox, customFilter);
  const resp = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'france-en-chiffres/1.0 (educational project)',
    },
    body: new URLSearchParams({ data: q }),
    signal: AbortSignal.timeout(130_000),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => `HTTP ${resp.status}`);
    throw new Error(`HTTP ${resp.status}: ${text.substring(0, 100)}`);
  }
  const data = await resp.json();
  if (!data.elements || data.elements.length === 0) {
    throw new Error(`Empty response for ${name}`);
  }
  console.log(`  ✓ ${name}: ${data.elements.length} elements`);
  return data.elements;
}

async function tryQuadrant(name, bbox, customFilter, attempt = 1) {
  try {
    return await queryQuadrant(name, bbox, customFilter);
  } catch (err) {
    console.log(`  ✗ ${name} (attempt ${attempt}): ${err.message.substring(0, 60)}`);
    if (attempt < 3) {
      const delay = attempt * 5000; // 5s, then 10s backoff
      console.log(`    Retrying in ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
      return tryQuadrant(name, bbox, customFilter, attempt + 1);
    }
    return null;
  }
}

function elementsToGeoJSON(elements) {
  const features = [];
  // Use OSM way id as dedup key (more reliable than coordinate-based)
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

  // ── Cache check ──
  if (existsSync(OUTPUT)) {
    const stats = statSync(OUTPUT);
    if (stats.size > 1024) {
      const sizeKB = (stats.size / 1024).toFixed(0);
      console.log(`  ✓ Cached file: ${OUTPUT} (${sizeKB} KB)`);
      console.log('  Delete the file to re-fetch.\n');
      return;
    }
  }

  const allElements = [];

  // Phase 1: Try 4 main quadrants
  console.log('Phase 1 — 4 main quadrants:\n');
  for (const q of MAIN_QUADRANTS) {
    const elements = await tryQuadrant(q.name, q.bbox);
    if (elements) allElements.push(...elements);
    await new Promise(r => setTimeout(r, 2000));
  }

  // Phase 2: Retry failed quadrants with sub-quadrants
  // Check if NE (48.0,2.5,51.5,8.5) is missing data
  const neElements = allElements.filter(e => {
    if (!e.geometry) return false;
    const avgLat = e.geometry.reduce((s, p) => s + p.lat, 0) / e.geometry.length;
    const avgLon = e.geometry.reduce((s, p) => s + p.lon, 0) / e.geometry.length;
    return avgLat >= 48.0 && avgLon >= 2.5 && avgLon <= 8.5;
  });
  if (neElements.length < 1000) {
    console.log(`\nPhase 2a — NE quadrant sparse (${neElements.length} elements), retrying with sub-quadrants:\n`);
    for (const q of NE_SUB) {
      const elements = await tryQuadrant(q.name, q.bbox);
      if (elements) allElements.push(...elements);
      await new Promise(r => setTimeout(r, 2000));
    }

    // Phase 2b: If NE-SW still sparse, try its sub-quadrants
    const neSwElements = elementsInBBox(allElements, 49.8, 2.5, 51.5, 5.5);
    if (neSwElements < 500) {
      console.log(`\nPhase 2b — NE-SW sparse (${neSwElements} elements), trying smaller quadrants:\n`);
      for (const q of NE_SW_SUB) {
        const elements = await tryQuadrant(q.name, q.bbox);
        if (elements) allElements.push(...elements);
        await new Promise(r => setTimeout(r, 2000));
      }

      // Phase 2c: If NE-SW-c still sparse, try tiny sub-quadrants (Calais area)
      const neSwCElements = elementsInBBox(allElements, 50.65, 2.5, 51.5, 4.0);
      if (neSwCElements < 100) {
        console.log(`\nPhase 2c — NE-SW-c sparse (${neSwCElements} elements), trying tiny quadrants:\n`);
        for (const q of NE_SW_C_SUB) {
          const elements = await tryQuadrant(q.name, q.bbox);
          if (elements) allElements.push(...elements);
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    // Phase 2d: If NE-NW still sparse, try its sub-quadrants
    // (covers 48-49.8°N, 2.5-5.5°E — missing Grand Est waterways)
    const neNwElements = elementsInBBox(allElements, 48.0, 2.5, 49.8, 5.5);
    if (neNwElements < 200) {
      console.log(`\nPhase 2d — NE-NW sparse (${neNwElements} elements), trying smaller quadrants:\n`);
      for (const q of NE_NW_SUB) {
        const elements = await tryQuadrant(q.name, q.bbox);
        if (elements) allElements.push(...elements);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Phase 2e: If NE-NE still sparse, try its sub-quadrants
    // (covers 48-49.8°N, 5.5-8.5°E — missing Alsace/Lorraine waterways)
    const neNeElements = elementsInBBox(allElements, 48.0, 5.5, 49.8, 8.5);
    if (neNeElements < 200) {
      console.log(`\nPhase 2e — NE-NE sparse (${neNeElements} elements), trying smaller quadrants:\n`);
      for (const q of NE_NE_SUB) {
        const elements = await tryQuadrant(q.name, q.bbox);
        if (elements) allElements.push(...elements);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  // Phase 3: Retry SE if missing
  const seElements = elementsInBBox(allElements, 41.3, 2.5, 48.0, 8.5);
  if (seElements < 1000) {
    console.log(`\nPhase 3 — SE quadrant sparse (${seElements} elements), retrying with sub-quadrants:\n`);
    for (const q of SE_SUB) {
      const elements = await tryQuadrant(q.name, q.bbox);
      if (elements) allElements.push(...elements);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Phase 4: Retry SW if missing (try canals-only, then rivers)
  const swElements = elementsInBBox(allElements, 41.3, -5.1, 48.0, 2.5);
  if (swElements < 1000) {
    console.log(`\nPhase 4 — SW quadrant sparse (${swElements} elements), retrying with filtered queries:\n`);
    // Canals only (separate query works better)
    const swCanals = await tryQuadrant('SW-canals', '41.3,-5.1,48.0,2.5', 'way["waterway"="canal"]');
    if (swCanals) {
      allElements.push(...swCanals);
      await new Promise(r => setTimeout(r, 2000));
    }
    // Navigable rivers only
    const swRivers = await tryQuadrant('SW-rivers', '41.3,-5.1,48.0,2.5');
    if (swRivers) {
      allElements.push(...swRivers);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (allElements.length === 0) {
    console.log('\n✗ No data received.\n');
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

function elementsInBBox(elements, minLat, minLon, maxLat, maxLon) {
  return elements.filter(e => {
    if (!e.geometry || e.geometry.length === 0) return false;
    return e.geometry.some(p =>
      p.lat >= minLat && p.lat <= maxLat &&
      p.lon >= minLon && p.lon <= maxLon
    );
  }).length;
}

main();
