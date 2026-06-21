/**
 * simplify-line-layers.js — Build-time optimization for line GeoJSON layers
 * Run:    node scripts/simplify-line-layers.js
 *
 * For each configured layer (waterways, roads):
 *  1. Merges features that share the same name into a single MultiLineString,
 *     dramatically reducing the number of Leaflet objects the client must create.
 *  2. Computes the real-world length of each feature (Haversine) and assigns a
 *     `minZoom` property so the client can progressively filter by zoom level.
 *  3. Runs @turf/simplify (Ramer-Douglas-Peucker) on each feature to reduce
 *     coordinate count while preserving shape.
 *
 *  Tolerance: 0.0005° (~50 m at mid-latitudes) — good balance for zoom 5–12 views.
 *
 *  For unnamed features (short connector segments): each stays as an individual
 *  feature. Their length is typically very short so they naturally get a high
 *  minZoom (only visible at city-level zoom).
 */

import { simplify } from '@turf/simplify';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'public', 'data');

// ── Haversine helpers (no dependency needed) ──

const R = 6_371_000; // Earth radius in metres

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine distance between two [lon, lat] points in metres.
 */
function haversineDist(a, b) {
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Total length of a LineString coordinate array in metres.
 */
function lineLength(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineDist(coords[i - 1], coords[i]);
  }
  return total;
}

/**
 * Total length of any geometry (LineString or MultiLineString).
 */
function geometryLength(geom) {
  if (!geom) return 0;
  if (geom.type === 'LineString') return lineLength(geom.coordinates);
  if (geom.type === 'MultiLineString') {
    return geom.coordinates.reduce((sum, line) => sum + lineLength(line), 0);
  }
  return 0;
}

// ── minZoom thresholds (generous — show as much as possible) ──
// Thresholds tuned so the maximum number of features show without slowdown.
// At zoom 6 (default France view): all features >3 km rendered.
// At zoom 7: all features >1 km.  At zoom 9+: all features.
function lengthToMinZoom(lengthKm) {
  if (lengthKm > 20) return 5;   // major rivers, entire canals
  if (lengthKm > 5)  return 6;   // medium waterways, visible at country view
  if (lengthKm > 2)  return 7;   // smaller tributaries, regional view
  if (lengthKm > 1)  return 8;   // local canals
  if (lengthKm > 0.3) return 9;  // short segments, department-level
  return 10;                      // tiny connectors, city-level
}

// ── Layer configuration ──

const WATERWAY_TOLERANCE = 0.0005;   // ~50 m — sufficient for zoom 5-12
const ROAD_TOLERANCE = 0.0003;       // ~30 m — roads need more precision

const LAYERS = [
  {
    file: 'waterways.geojson',
    tolerance: WATERWAY_TOLERANCE,
    // Waterways: merge segments that share the same name + waterway type
    mergeKey: (f) => {
      const name = (f.properties.name || '').trim();
      const wtype = f.properties.waterway || '';
      // Only merge named features; unnamed stay as individual segments
      return name ? `${name}::${wtype}` : null;
    },
    // Add metadata to each feature
    extraProps: (f, lengthKm) => ({
      ...f.properties,
      lengthKm: Math.round(lengthKm * 10) / 10,
    }),
  },
  // Roads layer omitted: road segments are logical sections, merging would not
  // help. Performance is already acceptable. If needed in future, add:
  // { file: 'roads.geojson', tolerance: ROAD_TOLERANCE, mergeKey: null, ... }
];

// ── Processing ──

function processLayer(config) {
  const filepath = resolve(DATA_DIR, config.file);
  const { mergeKey, tolerance, extraProps } = config;

  if (!existsSync(filepath)) {
    console.log(`  ✗ ${config.file} not found — skipping`);
    return;
  }

  const raw = JSON.parse(readFileSync(filepath, 'utf-8'));
  const originalSize = (JSON.stringify(raw).length / 1024 / 1024).toFixed(1);
  const featureCount = raw.features.length;

  console.log(`\n=== ${config.file} ===`);
  console.log(`  Input: ${featureCount} features, ${originalSize} MB`);

  // ── Step 1: Merge features by name ──
  let mergedFeatures;

  if (mergeKey) {
    const groups = new Map();
    for (const f of raw.features) {
      const key = mergeKey(f);
      if (key) {
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(f);
      } else {
        // Unnamed features remain individual
        groups.set(`__unnamed__${groups.size}__`, [f]);
      }
    }

    mergedFeatures = [];
    let mergedCount = 0;
    let unnamedCount = 0;

    for (const [key, group] of groups) {
      if (group.length === 1) {
        // Single segment — keep as-is
        const f = group[0];
        const lenKm = geometryLength(f.geometry) / 1000;
        f.properties = extraProps(f, lenKm);
        f.properties.minZoom = lengthToMinZoom(lenKm);
        mergedFeatures.push(f);
        if (key.startsWith('__unnamed__')) unnamedCount++;
        continue;
      }

      // Multiple segments with same name: merge into MultiLineString
      const coords = group.map((f) => f.geometry.coordinates);
      const totalLenKm = group.reduce(
        (sum, f) => sum + geometryLength(f.geometry),
        0,
      ) / 1000;

      const merged = {
        type: 'Feature',
        properties: extraProps(
          {
            properties: {
              ...group[0].properties,
              name: group[0].properties.name || '',
            },
          },
          totalLenKm,
        ),
        geometry: {
          type: 'MultiLineString',
          coordinates: coords,
        },
      };
      merged.properties.minZoom = lengthToMinZoom(totalLenKm);
      merged.properties._mergedSegments = group.length;
      mergedFeatures.push(merged);
      mergedCount++;
    }

    console.log(`  Merged ${mergedCount} named waterways into single features`);
    console.log(`  (${unnamedCount} unnamed features kept as-is)`);
    console.log(`  Total after merge: ${mergedFeatures.length} features`);
  } else {
    // No merge — just process each feature individually (roads)
    mergedFeatures = raw.features.map((f) => {
      const lenKm = geometryLength(f.geometry) / 1000;
      f.properties = extraProps(f, lenKm);
      f.properties.minZoom = lengthToMinZoom(lenKm);
      return f;
    });
  }

  // ── Step 2: Simplify coordinates ──
  let simplifiedCount = 0;
  const simplified = {
    ...raw,
    features: mergedFeatures.map((feature) => {
      const geom = feature.geometry;
      if (!geom) return feature;

      if (geom.type === 'LineString' && geom.coordinates.length > 4) {
        try {
          const result = simplify(feature, { tolerance, highQuality: true });
          simplifiedCount++;
          return result;
        } catch {
          return feature;
        }
      }

      if (geom.type === 'MultiLineString') {
        // Turf simplify handles MultiLineString via @turf/meta
        try {
          const result = simplify(feature, { tolerance, highQuality: true });
          simplifiedCount++;
          return result;
        } catch {
          return feature;
        }
      }

      return feature;
    }),
  };

  // ── Step 3: Sort features by minZoom (so zoom filter works efficiently) ──
  simplified.features.sort(
    (a, b) => (a.properties.minZoom || 10) - (b.properties.minZoom || 10),
  );

  // ── Step 4: Write output ──
  const output = JSON.stringify(simplified);
  writeFileSync(filepath, output);
  const newSizeMB = (output.length / 1024 / 1024).toFixed(1);
  const reduction = (
    (1 - output.length / JSON.stringify(raw).length) *
    100
  ).toFixed(0);

  // Stats
  const withZoom = simplified.features.filter(
    (f) => (f.properties.minZoom || 10) <= 6,
  );
  console.log(`  Simplified: ${simplifiedCount} features`);
  console.log(`  Size: ${originalSize} MB → ${newSizeMB} MB (${reduction}% reduction)`);
  console.log(`  Features visible at zoom 6 (default): ${withZoom.length}`);
  console.log(`  Length range: ${Math.min(...simplified.features.map(f => f.properties.lengthKm || 0)).toFixed(1)} – ${Math.max(...simplified.features.map(f => f.properties.lengthKm || 0)).toFixed(1)} km`);
}

// ── Main ──

console.log('=== Simplify + merge line layers ===\n');

for (const layer of LAYERS) {
  processLayer(layer);
}

console.log('\n✓ Done');
