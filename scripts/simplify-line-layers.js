/**
 * simplify-line-layers.js — Simplify GeoJSON line feature coordinates
 * Run:    node scripts/simplify-line-layers.js
 *
 * Uses @turf/simplify (Ramer-Douglas-Peucker) to reduce the number of
 * coordinate points in line geometry while preserving overall shape.
 *
 * This significantly reduces file size and improves Leaflet render speed
 * for large line datasets (roads, waterways).
 *
 * Tolerance: 0.0005° (~50 m at mid-latitudes) — good balance for zoom 6-12 views.
 */

import { simplify } from '@turf/simplify';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'public', 'data');

const LAYERS = [
  { file: 'waterways.geojson', tolerance: 0.0005 },
  { file: 'roads.geojson',      tolerance: 0.0003 },
];

for (const layer of LAYERS) {
  const filepath = resolve(DATA_DIR, layer.file);

  if (!existsSync(filepath)) {
    console.log(`✗ ${layer.file} not found — skipping`);
    continue;
  }

  const original = JSON.parse(readFileSync(filepath, 'utf-8'));
  const originalSize = (JSON.stringify(original).length / 1024 / 1024).toFixed(1);
  const featureCount = original.features.length;

  console.log(`\n=== ${layer.file} ===`);
  console.log(`  Features: ${featureCount}`);
  console.log(`  Size: ${originalSize} MB`);

  // Simplify each feature
  let simplifiedCount = 0;
  const simplified = {
    ...original,
    features: original.features.map((feature) => {
      if (feature.geometry?.type === 'LineString' && feature.geometry.coordinates.length > 4) {
        try {
          const result = simplify(feature, {
            tolerance: layer.tolerance,
            highQuality: true,
          });
          simplifiedCount++;
          return result;
        } catch {
          return feature; // keep original if simplification fails
        }
      }
      return feature;
    }),
  };

  const output = JSON.stringify(simplified);
  writeFileSync(filepath, output);
  const newSizeMB = (output.length / 1024 / 1024).toFixed(1);
  const reduction = ((1 - output.length / JSON.stringify(original).length) * 100).toFixed(0);

  console.log(`  Simplified: ${simplifiedCount} / ${featureCount} features`);
  console.log(`  New size: ${newSizeMB} MB (${reduction}% reduction)`);
}

console.log('\n✓ Done');
