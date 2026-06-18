/**
 * simplify-geojson.js — Reduce GeoJSON file size for the interactive map
 * Run: node scripts/simplify-geojson.js
 *
 * Strategy:
 * 1. Round coordinates to 4 decimal places (~11m precision — fine for department scale)
 * 2. Filter out duplicate consecutive coordinates
 * 3. Remove empty coordinate arrays
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = resolve(__dirname, '..', 'src', 'data', 'geo', 'departements.geojson');
const outputPath = resolve(__dirname, '..', 'src', 'data', 'geo', 'departements-simplified.geojson');
const publicPath = resolve(__dirname, '..', 'public', 'data', 'departements.geojson');

const raw = readFileSync(inputPath, 'utf-8');
const geo = JSON.parse(raw);

const ROUND = 3; // decimal places (~111m precision — adequate for department scale)

function roundCoord(v) {
  return Math.round(v * 10 ** ROUND) / 10 ** ROUND;
}

function simplifyCoords(coords) {
  if (typeof coords[0] === 'number') {
    // Single coordinate pair (Point)
    return [roundCoord(coords[0]), roundCoord(coords[1])];
  }
  if (Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
    // LinearRing: array of [x,y] pairs — remove consecutive duplicates
    if (coords.length < 3) return coords;
    const result = [];
    for (let i = 0; i < coords.length; i++) {
      const prev = result.length > 0 ? result[result.length - 1] : null;
      const cur = [roundCoord(coords[i][0]), roundCoord(coords[i][1])];
      if (!prev || prev[0] !== cur[0] || prev[1] !== cur[1]) {
        result.push(cur);
      }
    }
    // First and last must match for closed rings
    if (result.length >= 2) {
      const first = result[0];
      const last = result[result.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        result.push([...first]);
      }
    }
    return result;
  }
  // Nested array: recurse
  return coords.map(simplifyCoords);
}

for (const feature of geo.features) {
  if (feature.geometry) {
    feature.geometry.coordinates = simplifyCoords(feature.geometry.coordinates);
  }
}

const output = JSON.stringify(geo);
const inSize = raw.length;
const outSize = output.length;
const ratio = ((1 - outSize / inSize) * 100).toFixed(1);

writeFileSync(outputPath, output);
console.log(`Simplified: ${(inSize / 1024).toFixed(0)}KB → ${(outSize / 1024).toFixed(0)}KB (${ratio}% reduction)`);

// Also copy to public/data/ for web serving
const publicDir = resolve(__dirname, '..', 'public', 'data');
import { mkdirSync, existsSync } from 'fs';
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}
writeFileSync(publicPath, output);
console.log(`Copied to: public/data/departements.geojson (${(output.length / 1024).toFixed(0)}KB)`);
