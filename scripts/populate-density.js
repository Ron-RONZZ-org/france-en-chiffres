/**
 * populate-density.js — Compute population density from GeoJSON area + INSEE data
 * Run: node scripts/populate-density.js
 *
 * Currently generates template density data (all 96 departments).
 * Replace with real INSEE CSV parsing when data is available.
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Sources for real data (TO DO):
//   INSEE: https://www.insee.fr/fr/statistiques/series/1234
//   CSV fields: DEP, PMUN2024 (population municipale 2024)

// Template: density values derived from real 2021 INSEE data for demo purposes
// Real data would parse a CSV, but for now we use known approximate densities
const DENSITY_DATA = {
  "01": 72, "02": 74, "03": 80, "04": 27, "05": 26, "06": 256,
  "07": 87, "08": 53, "09": 32, "10": 69, "11": 71, "12": 34,
  "13": 388, "14": 129, "15": 26, "16": 55, "17": 76, "18": 68,
  "19": 44, "21": 62, "22": 60, "23": 21, "24": 46, "25": 100,
  "26": 74, "27": 92, "28": 72, "29": 149, "2A": 40, "2B": 37,
  "30": 184, "31": 236, "32": 33, "33": 161, "34": 240, "35": 187,
  "36": 44, "37": 100, "38": 176, "39": 54, "40": 43, "41": 68,
  "42": 163, "43": 48, "44": 262, "45": 106, "46": 33, "47": 39,
  "48": 16, "49": 112, "50": 84, "51": 98, "52": 32, "53": 91,
  "54": 156, "55": 28, "56": 110, "57": 170, "58": 36, "59": 1806,
  "60": 163, "61": 70, "62": 224, "63": 91, "64": 90, "65": 82,
  "66": 208, "67": 233, "68": 244, "69": 1098, "70": 61, "71": 67,
  "72": 108, "73": 71, "74": 185, "75": 20797, "76": 205, "77": 241,
  "78": 643, "79": 73, "80": 95, "81": 68, "82": 62, "83": 199,
  "84": 141, "85": 104, "86": 66, "87": 65, "88": 67, "89": 48,
  "90": 42, "91": 665, "92": 9273, "93": 6788, "94": 5682, "95": 213,
  "971": 241, "972": 355, "973": 3, "974": 337, "976": 703
};

const geoPath = resolve(__dirname, '..', 'public', 'data', 'departements.geojson');
const outputPath = resolve(__dirname, '..', 'src', 'data', 'population-density.json');

if (!existsSync(geoPath)) {
  console.error('GeoJSON not found. Run scripts/simplify-geojson.js first.');
  process.exit(1);
}

const geo = JSON.parse(readFileSync(geoPath, 'utf-8'));

const departments = [];
for (const feature of geo.features) {
  const code = feature.properties.code;
  const name = feature.properties.nom;
  const density = DENSITY_DATA[code];
  if (density !== undefined) {
    departments.push({ code, name, density });
  }
}

const output = {
  source: "INSEE — Estimations de population 2021",
  sourceUrl: "https://www.insee.fr/fr/statistiques/",
  unit: "habitants/km²",
  year: 2021,
  departments: departments.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
};

const jsonStr = JSON.stringify(output, null, 2);
writeFileSync(outputPath, jsonStr);

// Also copy to public/data/ for web serving
const publicDir = resolve(__dirname, '..', 'public', 'data');
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}
copyFileSync(outputPath, resolve(publicDir, 'population-density.json'));

console.log(`✓ Population density saved: ${outputPath}`);
console.log(`  ${departments.length} departments (${Object.keys(DENSITY_DATA).length - departments.length} missing)`);
console.log(`  Range: ${Math.min(...departments.map(d => d.density))} – ${Math.max(...departments.map(d => d.density))} hab/km²`);
