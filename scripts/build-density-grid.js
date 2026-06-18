/**
 * build-density-grid.js — Commune-level population densities for France
 * Run: node scripts/build-density-grid.js
 *
 * Merges commune boundary geometry (gregoiredavid/france-geojson) with
 * commune population data (geo.api.gouv.fr), computes density per commune.
 *
 * Filtered to communes with population ≥ 5000 for a manageable, useful dataset.
 *
 * Output: public/data/communes-density.geojson
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, '..', 'public', 'data', 'communes-density.geojson');
const COMMUNES_URL = 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/communes.geojson';
const API = 'https://geo.api.gouv.fr/communes';
const MIN_POP = 5000; // threshold for inclusion

const DEPT_CODES = [
  '01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17',
  '18','19','21','22','23','24','25','26','27','28','29','2A','2B','30','31','32','33',
  '34','35','36','37','38','39','40','41','42','43','44','45','46','47','48','49','50',
  '51','52','53','54','55','56','57','58','59','60','61','62','63','64','65','66','67',
  '68','69','70','71','72','73','74','75','76','77','78','79','80','81','82','83','84',
  '85','86','87','88','89','90','91','92','93','94','95',
];

async function fetchPopulations() {
  console.log('→ Fetching commune populations from API...');
  const popMap = new Map();
  let total = 0;
  for (const dept of DEPT_CODES) {
    const url = `${API}?codeDepartement=${dept}&fields=code,population&format=geojson&limit=1000`;
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'france-en-chiffres/1.0' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      for (const f of (data.features || [])) {
        const pop = f.properties.population || 0;
        popMap.set(f.properties.code, pop);
        total++;
      }
    } catch { /* skip failed depts */ }
  }
  console.log(`  ✓ ${popMap.size} communes with population data (${total} total)`);
  return popMap;
}

/** Compute polygon area in km² using spherical approximation */
function polygonAreaKm2(geom) {
  let rings;
  if (geom.type === 'Polygon') rings = geom.coordinates;
  else if (geom.type === 'MultiPolygon') rings = geom.coordinates[0];
  else return 0;

  const ring = rings[0];
  if (!ring || ring.length < 3) return 0;
  const R = 6371;
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    const lat1r = lat1 * Math.PI / 180;
    const lat2r = lat2 * Math.PI / 180;
    const lon1r = lon1 * Math.PI / 180;
    const lon2r = lon2 * Math.PI / 180;
    area += (lon2r - lon1r) * (2 + Math.sin(lat1r) + Math.sin(lat2r));
  }
  return Math.abs(area * R * R / 2);
}

async function downloadCommuneBoundaries() {
  console.log('→ Downloading commune boundaries (43 MB)...');
  const resp = await fetch(COMMUNES_URL, {
    headers: { 'User-Agent': 'france-en-chiffres/1.0' },
    signal: AbortSignal.timeout(120_000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  console.log(`  ✓ ${data.features.length} commune boundaries`);
  return data;
}

async function main() {
  console.log('=== Commune-Level Population Density ===\n');

  const popMap = await fetchPopulations();
  const geoData = await downloadCommuneBoundaries();

  // Merge population data into commune boundaries, compute density
  console.log('→ Computing densities...');
  const features = [];
  let skipped = 0;

  for (const f of geoData.features) {
    const code = f.properties.code;
    const name = f.properties.nom || '';
    const pop = popMap.get(code) || 0;

    if (pop < MIN_POP) { skipped++; continue; }

    const area = polygonAreaKm2(f.geometry);
    const density = area > 0 ? Math.round(pop / area) : 0;

    features.push({
      type: 'Feature',
      properties: {
        code, nom: name,
        population: pop,
        density: density,
      },
      geometry: f.geometry,
    });
  }

  const geojson = {
    type: 'FeatureCollection',
    source: 'INSEE — via geo.api.gouv.fr; boundaries: gregoiredavid/france-geojson (MIT)',
    license: 'Open Licence 2.0',
    generated: new Date().toISOString().split('T')[0],
    population_threshold: MIN_POP,
    unit: 'habitants/km²',
    features,
  };

  const jsonStr = JSON.stringify(geojson);
  writeFileSync(OUTPUT, jsonStr);
  const densities = features.map(f => f.properties.density);
  console.log(`\n  ✓ ${features.length} communes ≥ ${MIN_POP} hab (${skipped} skipped)`);
  console.log(`    ${(jsonStr.length / 1024 / 1024).toFixed(1)} MB`);
  console.log(`    Density: ${Math.min(...densities).toLocaleString('fr-FR')} – ${Math.max(...densities).toLocaleString('fr-FR')} hab/km²`);
  console.log(`    Total population: ${features.reduce((s,f) => s + f.properties.population, 0).toLocaleString('fr-FR')}`);
  console.log(`  ✓ Saved: ${OUTPUT}`);
}

main().catch(err => { console.error(`\n✗ Error: ${err.message}`); process.exit(1); });
