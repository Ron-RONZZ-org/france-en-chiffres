/**
 * simplify-density.js — Aggressively simplify the commune density GeoJSON
 * Run: node scripts/simplify-density.js
 *
 * The full communes-density.geojson is 45 MB (13 MB gzipped). Loading this
 * on every density toggle is the primary cause of the "page slowing down"
 * warning in Firefox.
 *
 * This script simplifies polygon geometry using Douglas-Peucker at 0.02°
 * tolerance (~2 km at this latitude). This dramatically reduces vertex count
 * while preserving commune boundaries recognizable at the national scale.
 *
 * Output: public/data/density-simple.geojson
 * Expected: 45 MB → ~2-3 MB raw, ~300-500 KB gzipped
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import simplify from '@turf/simplify';
import { coordEach } from '@turf/meta';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT = resolve(__dirname, '..', 'public', 'data', 'communes-density.geojson');
const OUTPUT = resolve(__dirname, '..', 'public', 'data', 'density-simple.geojson');

console.log('=== Simplifying Commune Density GeoJSON ===\n');

const raw = readFileSync(INPUT, 'utf-8');
const inSize = raw.length;
console.log(`Input: ${(inSize / 1024 / 1024).toFixed(1)} MB`);

const geo = JSON.parse(raw);

// Simplify each feature with Douglas-Peucker at 0.02° tolerance
// This removes ~90% of vertices while keeping shapes recognizable
console.log(`Simplifying ${geo.features.length} features...`);

const options = { tolerance: 0.008, highQuality: true };
let totalBefore = 0;
let totalAfter = 0;

for (const feature of geo.features) {
  coordEach(feature, () => { totalBefore++; });
  const simplified = simplify(feature, options);
  feature.geometry = simplified.geometry;
  coordEach(feature, () => { totalAfter++; });
}

const outStr = JSON.stringify(geo);
const outSize = outStr.length;
const pct = ((1 - outSize / inSize) * 100).toFixed(1);
const vtxPct = ((1 - totalAfter / totalBefore) * 100).toFixed(1);

writeFileSync(OUTPUT, outStr);
console.log(`\nOutput: ${(outSize / 1024 / 1024).toFixed(1)} MB (${pct}% reduction)`);
console.log(`Vertices: ${totalBefore.toLocaleString()} → ${totalAfter.toLocaleString()} (${vtxPct}% reduction)`);
console.log(`\nSaved: ${OUTPUT}`);
