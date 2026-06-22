/**
 * build-commune-lod.js — Generate Level-of-Detail GeoJSON for commune layers
 * Run: node scripts/build-commune-lod.js
 *
 * Reads simplified commune density data, dissolves by department and region,
 * outputs LOD-specific GeoJSON files for the interactive map.
 *
 * Outputs:
 *   public/data/communes-lod-regions.geojson      — 13–18 features (zoom 5–7)
 *   public/data/communes-lod-departements.geojson  — ~96 features (zoom 8–9)
 *
 * At zoom 10–11, the existing density-simple.geojson is used (simplified geometry).
 * At zoom 12+, the existing communes-density.geojson is used (full detail).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import union from '@turf/union';
import area from '@turf/area';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT = resolve(__dirname, '..', 'public', 'data', 'density-simple.geojson');
const ALT_INPUT = resolve(__dirname, '..', 'public', 'data', 'communes-density.geojson');
const OUTPUT_DIR = resolve(__dirname, '..', 'public', 'data');

// ── Department → Region mapping (post-2016 administrative reform) ──
const DEPT_TO_REGION = {
  '01': 'Auvergne-Rhône-Alpes', '03': 'Auvergne-Rhône-Alpes', '07': 'Auvergne-Rhône-Alpes',
  '15': 'Auvergne-Rhône-Alpes', '26': 'Auvergne-Rhône-Alpes', '38': 'Auvergne-Rhône-Alpes',
  '42': 'Auvergne-Rhône-Alpes', '43': 'Auvergne-Rhône-Alpes', '63': 'Auvergne-Rhône-Alpes',
  '69': 'Auvergne-Rhône-Alpes', '73': 'Auvergne-Rhône-Alpes', '74': 'Auvergne-Rhône-Alpes',
  '21': 'Bourgogne-Franche-Comté', '25': 'Bourgogne-Franche-Comté',
  '39': 'Bourgogne-Franche-Comté', '58': 'Bourgogne-Franche-Comté',
  '70': 'Bourgogne-Franche-Comté', '71': 'Bourgogne-Franche-Comté',
  '89': 'Bourgogne-Franche-Comté', '90': 'Bourgogne-Franche-Comté',
  '22': 'Bretagne', '29': 'Bretagne', '35': 'Bretagne', '56': 'Bretagne',
  '18': 'Centre-Val de Loire', '28': 'Centre-Val de Loire',
  '36': 'Centre-Val de Loire', '37': 'Centre-Val de Loire',
  '41': 'Centre-Val de Loire', '45': 'Centre-Val de Loire',
  '2A': 'Corse', '2B': 'Corse',
  '08': 'Grand Est', '10': 'Grand Est', '51': 'Grand Est', '52': 'Grand Est',
  '54': 'Grand Est', '55': 'Grand Est', '57': 'Grand Est', '67': 'Grand Est',
  '68': 'Grand Est', '88': 'Grand Est',
  '02': 'Hauts-de-France', '59': 'Hauts-de-France', '60': 'Hauts-de-France',
  '62': 'Hauts-de-France', '80': 'Hauts-de-France',
  '75': 'Île-de-France', '77': 'Île-de-France', '78': 'Île-de-France',
  '91': 'Île-de-France', '92': 'Île-de-France', '93': 'Île-de-France',
  '94': 'Île-de-France', '95': 'Île-de-France',
  '14': 'Normandie', '27': 'Normandie', '50': 'Normandie', '61': 'Normandie', '76': 'Normandie',
  '16': 'Nouvelle-Aquitaine', '17': 'Nouvelle-Aquitaine', '19': 'Nouvelle-Aquitaine',
  '23': 'Nouvelle-Aquitaine', '24': 'Nouvelle-Aquitaine', '33': 'Nouvelle-Aquitaine',
  '40': 'Nouvelle-Aquitaine', '47': 'Nouvelle-Aquitaine', '64': 'Nouvelle-Aquitaine',
  '79': 'Nouvelle-Aquitaine', '86': 'Nouvelle-Aquitaine', '87': 'Nouvelle-Aquitaine',
  '09': 'Occitanie', '11': 'Occitanie', '12': 'Occitanie', '30': 'Occitanie',
  '31': 'Occitanie', '32': 'Occitanie', '34': 'Occitanie', '46': 'Occitanie',
  '48': 'Occitanie', '65': 'Occitanie', '66': 'Occitanie', '81': 'Occitanie', '82': 'Occitanie',
  '44': 'Pays de la Loire', '49': 'Pays de la Loire', '53': 'Pays de la Loire',
  '72': 'Pays de la Loire', '85': 'Pays de la Loire',
  '04': "Provence-Alpes-Côte d'Azur", '05': "Provence-Alpes-Côte d'Azur",
  '06': "Provence-Alpes-Côte d'Azur", '13': "Provence-Alpes-Côte d'Azur",
  '83': "Provence-Alpes-Côte d'Azur", '84': "Provence-Alpes-Côte d'Azur",
};

// DOM-TOM single-department regions
const DOM_REGIONS = {
  '971': 'Guadeloupe',
  '972': 'Martinique',
  '973': 'Guyane',
  '974': 'La Réunion',
  '976': 'Mayotte',
};

// ── Helpers ──

/** Extract department code from 5-digit INSEE commune code */
function getDeptCode(code) {
  if (!code) return null;
  // DOM-TOM: 3-digit prefix
  if (code.startsWith('97') || code.startsWith('98')) return code.substring(0, 3);
  // Metropolitan France: 2-digit prefix (01–95, 2A, 2B)
  return code.substring(0, 2);
}

function getRegionName(deptCode) {
  return DEPT_TO_REGION[deptCode] || DOM_REGIONS[deptCode] || null;
}

/** Compute area in km² from GeoJSON geometry */
function featureAreaKm2(feature) {
  return area(feature) / 1_000_000;
}

/**
 * Union an array of GeoJSON features into a single feature.
 * Features are unioned sequentially, largest-area first for stability.
 */
function dissolveFeatures(features, name, code, level) {
  if (features.length === 0) return null;
  if (features.length === 1) {
    // Single feature — still aggregate properties with correct code/name
    const f = features[0];
    const pop = f.properties.population || 0;
    const den = f.properties.density || 0;
    const areaKm2 = f.properties.area_km2 || featureAreaKm2(f);
    const communeCount = f.properties.commune_count || 1;
    return {
      type: 'Feature',
      properties: {
        code,
        nom: name,
        population: pop,
        density: den,
        max_density: den,
        commune_count: communeCount,
        level,
        area_km2: Math.round(areaKm2),
      },
      geometry: f.geometry,
    };
  }

  // Sort by area descending — larger base polygon is more stable for union
  const sorted = [...features].sort((a, b) => featureAreaKm2(b) - featureAreaKm2(a));

  let accumulated = sorted[0];
  let unioned = 1;
  let failed = 0;

  for (let i = 1; i < sorted.length; i++) {
    try {
      // Attempt union: both inputs and output are Feature<Polygon|MultiPolygon>
      const result = union(accumulated, sorted[i]);
      if (result) {
        accumulated = result;
        unioned++;
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
      // If union fails, just keep the accumulated — the result is approximate
      // but covers most of the area
    }
  }

  // Compute aggregated properties
  // When dissolving already-dissolved features (e.g. departments → regions),
  // use pre-computed commune_count and area_km2 from the input features.
  // When dissolving raw commune features, compute from geometry and count each.
  let totalPop = 0;
  let totalAreaKm2 = 0;
  let maxDensity = 0;
  let communeCount = 0;
  let hasSubCounts = false; // true if input features have pre-computed commune counts

  for (const f of features) {
    const pop = f.properties.population || 0;
    const den = f.properties.density || 0;
    totalPop += pop;
    if (f.properties.area_km2) {
      totalAreaKm2 += f.properties.area_km2;
    } else {
      totalAreaKm2 += featureAreaKm2(f);
    }
    if (den > maxDensity) maxDensity = den;
    if (f.properties.commune_count) {
      communeCount += f.properties.commune_count;
      hasSubCounts = true;
    } else {
      communeCount++;
    }
  }

  // For density, prefer computing from summed population / summed area
  // rather than using the potentially imprecise dissolved geometry area
  const avgDensity = totalAreaKm2 > 0 ? Math.round(totalPop / totalAreaKm2) : 0;

  // Ensure the accumulated feature has proper geometry
  if (!accumulated || !accumulated.geometry) {
    return null;
  }

  return {
    type: 'Feature',
    properties: {
      code,
      nom: name,
      population: totalPop,
      density: avgDensity,
      max_density: maxDensity,
      commune_count: communeCount,
      level,
      area_km2: Math.round(totalAreaKm2),
    },
    geometry: accumulated.geometry,
  };
}

// ── Main ──

async function main() {
  console.log('=== Commune LOD Generation ===\n');

  // Load data — prefer simplified, fallback to full
  const inputPath = existsSync(INPUT) ? INPUT : ALT_INPUT;
  console.log(`Input: ${inputPath}`);

  const raw = readFileSync(inputPath, 'utf-8');
  const inSize = raw.length;
  const data = JSON.parse(raw);
  console.log(`  ${data.features.length} features (${(inSize / 1024 / 1024).toFixed(1)} MB)\n`);

  // ── Step 1: Group by department ──
  console.log('Step 1: Grouping by department...');
  const deptGroups = new Map(); // deptCode -> features[]

  for (const feature of data.features) {
    const communeCode = feature.properties.code;
    const deptCode = getDeptCode(communeCode);
    if (!deptCode) continue;

    if (!deptGroups.has(deptCode)) deptGroups.set(deptCode, []);
    deptGroups.get(deptCode).push(feature);
  }

  console.log(`  ${deptGroups.size} departments found\n`);

  // ── Step 2: Dissolve to department level ──
  console.log('Step 2: Dissolving to department level...');
  const deptFeatures = [];

  // Department name mapping (by first commune in each group)
  const deptNameMap = {
    '01': 'Ain', '02': 'Aisne', '03': 'Allier', '04': 'Alpes-de-Haute-Provence',
    '05': 'Hautes-Alpes', '06': 'Alpes-Maritimes', '07': 'Ardèche', '08': 'Ardennes',
    '09': 'Ariège', '10': 'Aube', '11': 'Aude', '12': 'Aveyron',
    '13': 'Bouches-du-Rhône', '14': 'Calvados', '15': 'Cantal', '16': 'Charente',
    '17': 'Charente-Maritime', '18': 'Cher', '19': 'Corrèze', '21': "Côte-d'Or",
    '22': "Côtes-d'Armor", '23': 'Creuse', '24': 'Dordogne', '25': 'Doubs',
    '26': 'Drôme', '27': 'Eure', '28': 'Eure-et-Loir', '29': 'Finistère',
    '2A': 'Corse-du-Sud', '2B': 'Haute-Corse',
    '30': 'Gard', '31': 'Haute-Garonne', '32': 'Gers', '33': 'Gironde',
    '34': 'Hérault', '35': 'Ille-et-Vilaine', '36': 'Indre', '37': 'Indre-et-Loire',
    '38': 'Isère', '39': 'Jura', '40': 'Landes', '41': 'Loir-et-Cher',
    '42': 'Loire', '43': 'Haute-Loire', '44': 'Loire-Atlantique', '45': 'Loiret',
    '46': 'Lot', '47': 'Lot-et-Garonne', '48': 'Lozère', '49': 'Maine-et-Loire',
    '50': 'Manche', '51': 'Marne', '52': 'Haute-Marne', '53': 'Mayenne',
    '54': 'Meurthe-et-Moselle', '55': 'Meuse', '56': 'Morbihan', '57': 'Moselle',
    '58': 'Nièvre', '59': 'Nord', '60': 'Oise', '61': 'Orne',
    '62': 'Pas-de-Calais', '63': 'Puy-de-Dôme', '64': 'Pyrénées-Atlantiques',
    '65': 'Hautes-Pyrénées', '66': 'Pyrénées-Orientales', '67': 'Bas-Rhin',
    '68': 'Haut-Rhin', '69': 'Rhône', '70': 'Haute-Saône', '71': 'Saône-et-Loire',
    '72': 'Sarthe', '73': 'Savoie', '74': 'Haute-Savoie', '75': 'Paris',
    '76': 'Seine-Maritime', '77': 'Seine-et-Marne', '78': 'Yvelines',
    '79': 'Deux-Sèvres', '80': 'Somme', '81': 'Tarn', '82': 'Tarn-et-Garonne',
    '83': 'Var', '84': 'Vaucluse', '85': 'Vendée', '86': 'Vienne',
    '87': 'Haute-Vienne', '88': 'Vosges', '89': 'Yonne', '90': 'Territoire de Belfort',
    '91': 'Essonne', '92': 'Hauts-de-Seine', '93': 'Seine-Saint-Denis',
    '94': 'Val-de-Marne', '95': "Val-d'Oise",
  };

  for (const [deptCode, features] of deptGroups) {
    const deptName = deptNameMap[deptCode] || `Département ${deptCode}`;
    console.log(`  Dissolving ${deptCode} (${deptName}) — ${features.length} communes...`);
    const dissolved = dissolveFeatures(features, deptName, deptCode, 'department');
    if (dissolved) {
      deptFeatures.push(dissolved);
    }
  }

  console.log(`  ✓ ${deptFeatures.length} department features created\n`);

  // ── Step 2b: Sort department features by code ──
  deptFeatures.sort((a, b) => {
    const ca = a.properties.code;
    const cb = b.properties.code;
    // Sort numeric codes numerically, alpha codes (2A, 2B) by char
    if (/^\d+$/.test(ca) && /^\d+$/.test(cb)) {
      return parseInt(ca) - parseInt(cb);
    }
    return ca.localeCompare(cb);
  });

  // ── Write department-level output ──
  const deptOutput = {
    type: 'FeatureCollection',
    source: 'INSEE — via geo.api.gouv.fr; boundaries: gregoiredavid/france-geojson (MIT)',
    license: 'Open Licence 2.0',
    generated: new Date().toISOString().split('T')[0],
    level: 'department',
    description: 'Communes dissoutes par département',
    features: deptFeatures,
  };

  const deptPath = resolve(OUTPUT_DIR, 'communes-lod-departements.geojson');
  const deptStr = JSON.stringify(deptOutput);
  writeFileSync(deptPath, deptStr);
  console.log(`  ✓ Saved: communes-lod-departements.geojson (${(deptStr.length / 1024).toFixed(0)} KB, ${deptFeatures.length} features)\n`);

  // ── Step 3: Group departments by region and dissolve ──
  console.log('Step 3: Dissolving to region level...');
  const regionGroups = new Map(); // regionName -> deptFeatures[]

  for (const feature of deptFeatures) {
    const deptCode = feature.properties.code;
    const regionName = getRegionName(deptCode);
    if (!regionName) {
      console.warn(`  ⚠ No region mapping for department ${deptCode}`);
      continue;
    }

    if (!regionGroups.has(regionName)) regionGroups.set(regionName, []);
    regionGroups.get(regionName).push(feature);
  }

  console.log(`  ${regionGroups.size} regions found\n`);

  const regionFeatures = [];

  for (const [regionName, features] of regionGroups) {
    const regionSlug = regionName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    console.log(`  Dissolving ${regionName} — ${features.length} departments...`);
    const dissolved = dissolveFeatures(features, regionName, regionSlug, 'region');
    if (dissolved) {
      regionFeatures.push(dissolved);
    }
  }

  // Sort by name
  regionFeatures.sort((a, b) => a.properties.nom.localeCompare(b.properties.nom));

  // ── Write region-level output ──
  const regionOutput = {
    type: 'FeatureCollection',
    source: 'INSEE — via geo.api.gouv.fr; boundaries: gregoiredavid/france-geojson (MIT)',
    license: 'Open Licence 2.0',
    generated: new Date().toISOString().split('T')[0],
    level: 'region',
    description: 'Communes dissoutes par région',
    features: regionFeatures,
  };

  const regionPath = resolve(OUTPUT_DIR, 'communes-lod-regions.geojson');
  const regionStr = JSON.stringify(regionOutput);
  writeFileSync(regionPath, regionStr);
  console.log(`  ✓ Saved: communes-lod-regions.geojson (${(regionStr.length / 1024).toFixed(0)} KB, ${regionFeatures.length} features)\n`);

  // ── Summary ──
  console.log('=== LOD Generation Complete ===');
  console.log(`  communes-lod-regions.geojson:       ${regionFeatures.length} features (zoom 5-7)`);
  console.log(`  communes-lod-departements.geojson:   ${deptFeatures.length} features (zoom 8-9)`);
  console.log(`  density-simple.geojson (existing):   ~35k features simplified (zoom 10-11)`);
  console.log(`  communes-density.geojson (existing): ~35k features full detail (zoom 12+)`);
}

main().catch(err => {
  console.error(`\n✗ Error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
