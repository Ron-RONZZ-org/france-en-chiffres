/**
 * generate-all-departments.mjs — Generate 96 department .md files
 * Run: node scripts/generate-all-departments.mjs
 *
 * Reads GeoJSON, regions, density data, and areas to pre-fill each
 * department file. Will NOT overwrite existing files if they contain
 * custom editorial content beyond the auto-generated frontmatter.
 *
 * Safe to re-run: preserves AUTO-GENERATED markers between markers.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUTPUT_DIR = resolve(ROOT, 'src', 'content', 'departements');
const TEMPLATE = resolve(ROOT, 'templates', 'department-template.md');

const DEPTS_GEO = resolve(ROOT, 'src', 'data', 'geo', 'departements.geojson');
const REGIONS = resolve(ROOT, 'src', 'data', 'france-regions.json');
const DENSITY = resolve(ROOT, 'src', 'data', 'population-density.json');
const AREAS = resolve(ROOT, 'src', 'data', 'department-areas.json');

const deptGeo = JSON.parse(readFileSync(DEPTS_GEO, 'utf-8'));
const regions = JSON.parse(readFileSync(REGIONS, 'utf-8'));
const density = JSON.parse(readFileSync(DENSITY, 'utf-8'));
const areas = JSON.parse(readFileSync(AREAS, 'utf-8'));

const densityMap = new Map(density.departments.map(d => [d.code, d.density]));
const template = readFileSync(TEMPLATE, 'utf-8');

mkdirSync(OUTPUT_DIR, { recursive: true });

let created = 0;
let skipped = 0;

for (const f of deptGeo.features) {
  const code = f.properties.code;
  const nom = f.properties.nom;
  const region = regions[code] || '';
  const deptDensity = densityMap.get(code) || 0;
  const area = areas[code] || 0;
  const population = Math.round(deptDensity * area);

  const filename = resolve(OUTPUT_DIR, `${code}.md`);

  if (existsSync(filename)) {
    // Check if file has auto-generated marker
    const existing = readFileSync(filename, 'utf-8');
    if (existing.includes('# AUTO-GENERATED')) {
      // Replace auto-generated section only
      const startMarker = '# AUTO-GENERATED';
      const endMarker = '# END AUTO-GENERATED';
      const startIdx = existing.indexOf(startMarker);
      const endIdx = existing.indexOf(endMarker);
      if (startIdx >= 0 && endIdx > startIdx) {
        const autoSection = generateFrontmatter(code, nom, region, population, deptDensity);
        const newContent = existing.slice(0, startIdx) + autoSection + existing.slice(endIdx + endMarker.length);
        writeFileSync(filename, newContent);
        created++;
        continue;
      }
    }
    skipped++;
    continue;
  }

  const content = template
    .replace(/^code:\s*$/m, `code: "${code}"`)
    .replace(/^nom:\s*$/m, `nom: "${nom}"`)
    .replace(/^region:\s*$/m, `region: "${region}"`)
    .replace(/^prefecture:\s*$/m, 'prefecture: ""')
    .replace(/^mediaIds:\s*\[\]\s*$/m, 'mediaIds: []')
    .replace(/^sourceIds:\s*\[\]\s*$/m, 'sourceIds: []');

  writeFileSync(filename, content);
  created++;
}

console.log(`Departments: ${created} created, ${skipped} skipped (already exist with content)`);

function generateFrontmatter(code, nom, region, population, density) {
  return `# AUTO-GENERATED
code: "${code}"
nom: "${nom}"
region: "${region}"
population: ${population}
density: ${density}
# END AUTO-GENERATED`;
}
