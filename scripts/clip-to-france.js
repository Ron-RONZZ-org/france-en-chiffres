/**
 * clip-to-france.js — Remove GeoJSON features entirely outside metropolitan France
 *
 * Uses the 96 department boundaries from departements.geojson as the reference
 * polygon. Features whose coordinates all fall outside every department are dropped.
 * Features that cross the border are kept in full (for now — a future enhancement
 * could clip them at the boundary line).
 *
 * Usage:
 *   node scripts/clip-to-france.js <input.geojson> [output.geojson]
 *
 *   If output is omitted, the input file is overwritten.
 *
 * License: ODbL — © les contributeurs d'OpenStreetMap
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DEPTS = resolve(__dirname, '..', 'public', 'data', 'departements.geojson');

// ── Point-in-polygon: ray casting algorithm ──────────────────────────────

function pointInRing(px, py, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(px, py, geometry) {
  if (geometry.type === 'Polygon') {
    const outer = geometry.coordinates[0];
    if (!pointInRing(px, py, outer)) return false;
    // Check holes (inner rings): if inside a hole, it's outside the polygon
    for (let h = 1; h < geometry.coordinates.length; h++) {
      if (pointInRing(px, py, geometry.coordinates[h])) return false;
    }
    return true;
  }
  if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      if (pointInPolygon(px, py, { type: 'Polygon', coordinates: polygon })) return true;
    }
    return false;
  }
  return false;
}

// ── France boundary index ────────────────────────────────────────────────

function buildFranceIndex(departmentsPath) {
  const raw = JSON.parse(readFileSync(departmentsPath, 'utf-8'));
  const features = raw.features || raw;
  if (!features.length) throw new Error('No features in departments file');

  const index = [];
  for (const f of features) {
    const geom = f.geometry;
    if (!geom) continue;

    // Compute bounding box for fast pre-filter
    // Iterate ALL polygons in a MultiPolygon (not just the first —
    // Finistère's first polygon is a tiny island, giving a wrong bbox)
    const rings = geom.type === 'Polygon'
      ? [geom.coordinates[0]]
      : geom.coordinates.map(poly => poly[0]);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const ring of rings) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    index.push({ bbox: [minX, minY, maxX, maxY], geometry: geom });
  }

  console.log(`  ✓ Loaded ${index.length} departments as France boundary`);

  // Overall France bounding box for a quick first-pass rejection
  const franceBbox = index.reduce(
    (acc, d) => [
      Math.min(acc[0], d.bbox[0]),
      Math.min(acc[1], d.bbox[1]),
      Math.max(acc[2], d.bbox[2]),
      Math.max(acc[3], d.bbox[3]),
    ],
    [Infinity, Infinity, -Infinity, -Infinity],
  );

  return { index, franceBbox };
}

function isInFrance(lon, lat, franceIndex) {
  const [minX, minY, maxX, maxY] = franceIndex.franceBbox;
  // Quick bbox rejection
  if (lon < minX || lon > maxX || lat < minY || lat > maxY) return false;

  // Check against each department
  for (const dept of franceIndex.index) {
    const [dMinX, dMinY, dMaxX, dMaxY] = dept.bbox;
    if (lon >= dMinX && lon <= dMaxX && lat >= dMinY && lat <= dMaxY) {
      if (pointInPolygon(lon, lat, dept.geometry)) return true;
    }
  }
  return false;
}

// ── Main clip function ───────────────────────────────────────────────────

function clipToFrance(inputPath, outputPath, departmentsPath = DEFAULT_DEPTS) {
  if (!existsSync(inputPath)) {
    console.error(`✗ Input not found: ${inputPath}`);
    process.exit(1);
  }

  console.log(`\n  Input:  ${inputPath}`);
  console.log(`  Output: ${outputPath}`);

  // Build France boundary index
  const franceIndex = buildFranceIndex(departmentsPath);

  // Load input
  const data = JSON.parse(readFileSync(inputPath, 'utf-8'));
  const totalFeatures = data.features.length;
  console.log(`  Features before: ${totalFeatures}`);

  // Process each feature
  const kept = [];
  let dropped = 0;
  let crossing = 0;

  for (const feature of data.features) {
    const coords = feature.geometry?.coordinates;
    if (!coords || !feature.geometry) {
      // Keep features without geometry (metadata markers, etc.)
      kept.push(feature);
      continue;
    }

    let anyInside = false;
    let anyOutside = false;

    // Flatten coordinates (handles both LineString and MultiLineString)
    const flatCoords = feature.geometry.type === 'MultiLineString'
      ? coords.flat()
      : coords;

    for (const coord of flatCoords) {
      const [lon, lat] = coord;
      if (isInFrance(lon, lat, franceIndex)) {
        anyInside = true;
      } else {
        anyOutside = true;
      }
      // Early exit: if we've seen both, no need to check more
      if (anyInside && anyOutside) break;
    }

    if (anyInside) {
      kept.push(feature);
      if (anyOutside) crossing++;
    } else {
      dropped++;
    }
  }

  // Build output
  const output = {
    ...data,
    features: kept,
  };

  // Add metadata
  output._clip = {
    total_before: totalFeatures,
    kept: kept.length,
    dropped,
    crossing_border: crossing,
    method: 'point-in-polygon (96 departments)',
    date: new Date().toISOString().split('T')[0],
  };

  // Write
  const jsonStr = JSON.stringify(output);
  writeFileSync(outputPath, jsonStr);

  const sizeKB = (jsonStr.length / 1024).toFixed(0);
  const reduction = totalFeatures > 0 ? ((dropped / totalFeatures) * 100).toFixed(1) : '0.0';

  console.log(`  Features after:  ${kept.length}`);
  console.log(`  Dropped:         ${dropped} (${reduction}%)`);
  console.log(`  Border-crossing: ${crossing}`);
  console.log(`  Size:            ${sizeKB} KB`);
  console.log(`  ✓ Saved to ${outputPath}`);
}

// ── CLI ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length < 1 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
  clip-to-france.js — Remove features entirely outside metropolitan France

  Usage:
    node scripts/clip-to-france.js <input.geojson> [output.geojson]

  If output is omitted, the input file is overwritten.
  Uses public/data/departements.geojson as the reference boundary.

  Examples:
    node scripts/clip-to-france.js public/data/waterways.geojson
    node scripts/clip-to-france.js public/data/roads.geojson
`);
  process.exit(0);
}

const inputPath = resolve(process.cwd(), args[0]);
const outputPath = args[1] ? resolve(process.cwd(), args[1]) : inputPath;

clipToFrance(inputPath, outputPath);
