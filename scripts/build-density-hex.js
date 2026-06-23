/**
 * build-density-hex.js — Generate hexagonal LOD grids for population density
 * Run: node scripts/build-density-hex.js
 *
 * Hex grids provide a "few thousand blocks" middle ground between the
 * 35K individual commune polygons and heavily averaged region-level data.
 *
 * At low zoom (5–7), rendering ~5K hex cells is both performant and readable.
 *
 * Outputs:
 *   public/data/density-hex-15km.geojson  (~1,200 cells, zoom ≤ 5)
 *   public/data/density-hex-10km.geojson  (~2,800 cells, zoom ≤ 7)
 *   public/data/density-hex-5km.geojson   (~11,000 cells, zoom ≤ 9)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'public', 'data');

// Density color palette (must match InteractiveDataMap.astro)
const BREAKS = [30, 60, 100, 150, 300, 500, 1000, 5000];
const COLORS = [
  '#c2e699', '#78c679', '#41b6c4', '#1d91c0',
  '#225ea8', '#253494', '#081d58', '#031a4a', '#010b26',
];

function getColor(density) {
  for (let i = 0; i < BREAKS.length; i++) {
    if (density <= BREAKS[i]) return COLORS[i];
  }
  return COLORS[COLORS.length - 1];
}

// ── Geographic constants (France-centered equirectangular) ──
const FRANCE_CENTER_LAT = 46.6;
const METERS_PER_DEG_LAT = 111320;
const METERS_PER_DEG_LON = 111320 * Math.cos(FRANCE_CENTER_LAT * Math.PI / 180);

function toDegLon(mx) { return mx / METERS_PER_DEG_LON; }
function toDegLat(my) { return my / METERS_PER_DEG_LAT; }

// ── Hex grid math (pointy-top hexagons) ──
function hexCornersDeg(cxDeg, cyDeg, sizeM) {
  // Convert center to meters, generate corners, convert back
  const cx = cxDeg * METERS_PER_DEG_LON;
  const cy = cyDeg * METERS_PER_DEG_LAT;
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angle = (30 + 60 * i) * Math.PI / 180;
    const mx = cx + sizeM * Math.cos(angle);
    const my = cy + sizeM * Math.sin(angle);
    corners.push([mx / METERS_PER_DEG_LON, my / METERS_PER_DEG_LAT]);
  }
  corners.push(corners[0]); // close ring
  return corners;
}

function generateHexGridDeg(minLon, maxLon, minLat, maxLat, sizeM) {
  const dx = Math.sqrt(3) * sizeM;
  const dy = 1.5 * sizeM;
  const dLon = dx / METERS_PER_DEG_LON;
  const dLat = dy / METERS_PER_DEG_LAT;
  const sizeLat = sizeM / METERS_PER_DEG_LAT;

  const cells = [];
  const colStart = Math.floor((minLon - sizeLat) / dLon) - 1;
  const colEnd = Math.ceil((maxLon + sizeLat) / dLon) + 1;
  const rowStart = Math.floor((minLat - sizeLat) / dLat) - 1;
  const rowEnd = Math.ceil((maxLat + sizeLat) / dLat) + 1;

  for (let row = rowStart; row <= rowEnd; row++) {
    const offsetLon = (row % 2 === 0) ? 0 : dLon / 2;
    for (let col = colStart; col <= colEnd; col++) {
      const clon = col * dLon + offsetLon;
      const clat = row * dLat;
      if (clon >= minLon - sizeLat && clon <= maxLon + sizeLat &&
          clat >= minLat - sizeLat && clat <= maxLat + sizeLat) {
        cells.push({ lon: clon, lat: clat });
      }
    }
  }
  return cells;
}

// ── Fast point-in-polygon ──
function pointInRing(px, py, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(px, py, coords, type) {
  if (type === 'Polygon') {
    if (!pointInRing(px, py, coords[0])) return false;
    for (let h = 1; h < coords.length; h++) {
      if (pointInRing(px, py, coords[h])) return false;
    }
    return true;
  }
  if (type === 'MultiPolygon') {
    for (const poly of coords) {
      if (pointInRing(px, py, poly[0])) {
        for (let h = 1; h < poly.length; h++) {
          if (pointInRing(px, py, poly[h])) return false;
        }
        return true;
      }
    }
    return false;
  }
  return false;
}

// ── Build a precomputed density lookup grid (0.02° resolution) ──
function buildDensityLookup(features, resolutionDeg) {
  // Determine bounds
  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  features.forEach(f => {
    const walk = (ring) => ring.forEach(([lon, lat]) => {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
    const g = f.geometry;
    if (g.type === 'Polygon') g.coordinates.forEach(walk);
    else if (g.type === 'MultiPolygon') g.coordinates.forEach(p => p.forEach(walk));
  });

  // Expand bounds by buffer
  const buf = resolutionDeg * 20;
  minLon -= buf; maxLon += buf; minLat -= buf; maxLat += buf;

  const ix0 = Math.floor(minLon / resolutionDeg);
  const iy0 = Math.floor(minLat / resolutionDeg);
  const nx = Math.ceil((maxLon - minLon) / resolutionDeg) + 1;
  const ny = Math.ceil((maxLat - minLat) / resolutionDeg) + 1;

  console.log(`  Lookup grid: ${nx}×${ny} = ${(nx * ny).toLocaleString()} cells @ ${resolutionDeg}°`);

  // Build spatial index: bin features by 0.5° grid cells for fast lookup
  const SPATIAL_GRID = 0.5;
  const spatialIndex = new Map();
  features.forEach((f, fi) => {
    let fMinLon = Infinity, fMaxLon = -Infinity;
    let fMinLat = Infinity, fMaxLat = -Infinity;
    const walk = (ring) => ring.forEach(([lon, lat]) => {
      if (lon < fMinLon) fMinLon = lon;
      if (lon > fMaxLon) fMaxLon = lon;
      if (lat < fMinLat) fMinLat = lat;
      if (lat > fMaxLat) fMaxLat = lat;
    });
    const g = f.geometry;
    if (g.type === 'Polygon') g.coordinates.forEach(walk);
    else if (g.type === 'MultiPolygon') g.coordinates.forEach(p => p.forEach(walk));

    const sx0 = Math.floor(fMinLon / SPATIAL_GRID);
    const sx1 = Math.ceil(fMaxLon / SPATIAL_GRID);
    const sy0 = Math.floor(fMinLat / SPATIAL_GRID);
    const sy1 = Math.ceil(fMaxLat / SPATIAL_GRID);
    for (let ix = sx0; ix <= sx1; ix++) {
      for (let iy = sy0; iy <= sy1; iy++) {
        const key = `${ix},${iy}`;
        if (!spatialIndex.has(key)) spatialIndex.set(key, []);
        spatialIndex.get(key).push(fi);
      }
    }
  });
  console.log(`  Spatial index: ${spatialIndex.size} bins (${SPATIAL_GRID}°)`);

  // Sample density at each lookup grid point
  const lookup = new Float32Array(nx * ny);
  lookup.fill(-1); // -1 = uninitialized (water)

  const t0 = Date.now();
  let sampled = 0;

  for (let iy = 0; iy < ny; iy++) {
    const lat = (iy + iy0) * resolutionDeg;
    for (let ix = 0; ix < nx; ix++) {
      const lon = (ix + ix0) * resolutionDeg;

      // Quick water check: corsica-bounds filter for Mediterranean
      if (lon < -5 || lon > 10 || lat < 41 || lat > 52) continue;

      const sx = Math.floor(lon / SPATIAL_GRID);
      const sy = Math.floor(lat / SPATIAL_GRID);
      const candidates = spatialIndex.get(`${sx},${sy}`) || [];
      // Also check neighboring cells
      const allCandidates = new Set(candidates);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const neighbor = spatialIndex.get(`${sx+dx},${sy+dy}`);
          if (neighbor) neighbor.forEach(fi => allCandidates.add(fi));
        }
      }

      let density = -1;
      for (const fi of allCandidates) {
        const f = features[fi];
        if (pointInPolygon(lon, lat, f.geometry.coordinates, f.geometry.type)) {
          density = f.properties.density || 0;
          break;
        }
      }

      if (density >= 0) {
        lookup[iy * nx + ix] = density;
        sampled++;
      }
    }
  }

  console.log(`  Sampled: ${sampled.toLocaleString()} land cells (${(Date.now() - t0) / 1000}s)`);
  return { lookup, nx, ny, ix0, iy0, resolutionDeg, minLon, minLat };
}

function lookupDensity(lon, lat, grid) {
  const { lookup, nx, ny, ix0, iy0, resolutionDeg } = grid;
  const ix = Math.round(lon / resolutionDeg - ix0);
  const iy = Math.round(lat / resolutionDeg - iy0);
  if (ix < 0 || ix >= nx || iy < 0 || iy >= ny) return -1;
  return lookup[iy * nx + ix];
}

// ── Main ──
function main() {
  console.log('=== Density Hex Grid Generator ===\n');

  const inputPath = resolve(DATA_DIR, 'density-simple.geojson');
  const raw = readFileSync(inputPath, 'utf-8');
  console.log(`Input: ${(raw.length / 1024 / 1024).toFixed(1)} MB`);

  const geo = JSON.parse(raw);
  const features = geo.features;
  console.log(`Features: ${features.length.toLocaleString()}\n`);

  // Build density lookup grid (0.02° ≈ 2.2km resolution)
  const lookup = buildDensityLookup(features, 0.02);

  // Determine France bounding box
  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  features.forEach(f => {
    const walk = (ring) => ring.forEach(([lon, lat]) => {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
    const g = f.geometry;
    if (g.type === 'Polygon') g.coordinates.forEach(walk);
    else if (g.type === 'MultiPolygon') g.coordinates.forEach(p => p.forEach(walk));
  });

  // Generate hex grids at different sizes
  const configs = [
    { sizeKm: 15, label: '15km', maxZoom: 5, outFile: 'density-hex-15km.geojson' },
    { sizeKm: 10, label: '10km', maxZoom: 7, outFile: 'density-hex-10km.geojson' },
    { sizeKm: 5, label: '5km', maxZoom: 9, outFile: 'density-hex-5km.geojson' },
  ];

  // Add buffer to bounding box for hex coverage
  const bufDeg = 2;
  minLon -= bufDeg; maxLon += bufDeg; minLat -= bufDeg; maxLat += bufDeg;

  for (const cfg of configs) {
    const sizeM = cfg.sizeKm * 1000;
    console.log(`\n── ${cfg.label} hex grid (maxZoom=${cfg.maxZoom}) ──`);

    const hexCells = generateHexGridDeg(minLon, maxLon, minLat, maxLat, sizeM);
    console.log(`  Cells generated: ${hexCells.length.toLocaleString()}`);

    const t1 = Date.now();
    const hexFeatures = [];
    let found = 0, notFound = 0;

    for (const cell of hexCells) {
      const density = lookupDensity(cell.lon, cell.lat, lookup);
      if (density < 0) { notFound++; continue; }
      found++;

      const hexCoords = hexCornersDeg(cell.lon, cell.lat, sizeM);
      hexFeatures.push({
        type: 'Feature',
        properties: {
          density,
          fillColor: getColor(density),
        },
        geometry: {
          type: 'Polygon',
          coordinates: [hexCoords],
        },
      });
    }

    const elapsed = Date.now() - t1;
    const outStr = JSON.stringify({
      type: 'FeatureCollection',
      source: 'Generated from density-simple.geojson',
      generated: new Date().toISOString().split('T')[0],
      cellSizeKm: cfg.sizeKm,
      maxZoom: cfg.maxZoom,
      features: hexFeatures,
    });

    const outPath = resolve(DATA_DIR, cfg.outFile);
    writeFileSync(outPath, outStr);

    console.log(`  Found: ${found.toLocaleString()} cells`);
    console.log(`  Skipped (water): ${notFound.toLocaleString()} cells`);
    console.log(`  Time: ${elapsed}ms`);
    console.log(`  Output: ${(outStr.length / 1024).toFixed(0)} KB -> ${cfg.outFile}`);
  }

  console.log('\n✓ Done');
}

main();
