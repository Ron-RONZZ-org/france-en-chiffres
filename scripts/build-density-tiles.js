/**
 * build-density-tiles.js — Generate pre-sliced vector tile JSON files
 * Run: node scripts/build-density-tiles.js
 *
 * At build time, slices the commune density GeoJSON into per-tile JSON files
 * using geojson-vt. Each tile file contains only the features intersecting
 * that tile, with coordinates in tile space [0, 4096).
 *
 * This eliminates runtime geojson-vt indexing (350ms) and the 9.4MB GeoJSON
 * download — the browser fetches only the ~5KB tiles visible in the viewport.
 *
 * Output:
 *   public/data/tiles/{z}/{x}/{y}.json  (pre-sliced vector tiles)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, statSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import geojsonvt from 'geojson-vt';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'public', 'data');
const TILES_DIR = resolve(DATA_DIR, 'tiles');

// Zoom range: all supported zoom levels. Pre-sliced tiles at build time
// eliminate runtime geojson-vt indexing (350ms) and the 9.4MB download.
// The browser fetches only the ~5 tiles visible in the viewport (~4KB each).
const MIN_ZOOM = 5;
const MAX_ZOOM = 12;

function main() {
  console.log('=== Density Pre-Sliced Vector Tiles ===\n');

  const inputPath = resolve(DATA_DIR, 'density-simple.geojson');
  const raw = readFileSync(inputPath, 'utf-8');
  console.log(`Input: ${(raw.length / 1024 / 1024).toFixed(1)} MB`);

  const geo = JSON.parse(raw);
  console.log(`Features: ${geo.features.length.toLocaleString()}\n`);

  // Build geojson-vt index (at build time — this is the expensive 350ms step)
  const t0 = Date.now();
  const index = geojsonvt(geo, {
    maxZoom: MAX_ZOOM,
    buffer: 64,
    tolerance: 3,
    extent: 4096,
    lineMetrics: false,
    promoteId: 'code',
  });
  console.log(`geojson-vt index built in ${Date.now() - t0}ms\n`);

  let totalTiles = 0;
  let totalFeatures = 0;

  // Clear existing tiles
  if (existsSync(TILES_DIR)) {
    rmSync(TILES_DIR, { recursive: true, force: true });
  }

  for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
    const t1 = Date.now();
    let zTileCount = 0;
    let zFeatureCount = 0;
    const n = Math.pow(2, z);

    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        const tile = index.getTile(z, x, y);
        if (!tile || !tile.features || tile.features.length === 0) continue;

        const dir = resolve(TILES_DIR, String(z), String(x));
        mkdirSync(dir, { recursive: true });

        writeFileSync(
          resolve(dir, `${y}.json`),
          JSON.stringify({ features: tile.features })
        );

        zTileCount++;
        zFeatureCount += tile.features.length;
      }
    }

    totalTiles += zTileCount;
    totalFeatures += zFeatureCount;
    console.log(
      `  z${z}: ${String(zTileCount).padStart(4)} tiles, ` +
      `${zFeatureCount.toLocaleString().padStart(7)} features ` +
      `(${Date.now() - t1}ms)`
    );
  }

  // Calculate total disk size
  let totalSize = 0;
  (function walkDir(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) walkDir(fullPath);
      else if (entry.name.endsWith('.json')) totalSize += statSync(fullPath).size;
    }
  })(TILES_DIR);

  console.log(`\n✓ ${totalTiles.toLocaleString()} tiles, ${totalFeatures.toLocaleString()} feature refs`);
  console.log(`  Disk: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Avg per tile: ${(totalSize / totalTiles / 1024).toFixed(0)} KB`);
  console.log(`  Output: ${TILES_DIR}`);
}

main();
