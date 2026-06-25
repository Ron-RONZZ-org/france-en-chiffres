/**
 * fetch-world-data.js — Build-time pipeline for world map data
 *
 * Downloads Natural Earth 110m country boundaries, fetches UNDP HDI/IHDI
 * and World Bank population data, merges everything into a single GeoJSON,
 * and auto-generates country .md files for the Content Collection.
 *
 * Usage: node scripts/fetch-world-data.js
 *
 * Data sources:
 *   - Natural Earth 110m admin 0 countries (public domain)
 *   - UNDP Human Development Report (CC-BY)
 *   - World Bank API (CC-BY 4.0)
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Output paths ──
const GEO_OUT = resolve(ROOT, 'src/data/geo/world-countries.json');
const GEO_OUT_PUBLIC = resolve(ROOT, 'public/data/geo/world-countries.json');
const COUNTRIES_DIR = resolve(ROOT, 'src/content/countries');

// ── URLs ──
// Natural Earth 110m admin 0 countries
const NE_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

// UNDP HDR composite indices (CSV)
const UNDP_URL = 'https://hdr.undp.org/sites/default/files/2023-24_HDR/HDR23-24_Composite_indices_complete_time_series.csv';

// World Bank population latest
const WB_POP_URL = 'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=500&date=2023';

// ── Helpers ──

async function fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${url}`);
  return resp.json();
}

async function fetchText(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${url}`);
  return resp.text();
}

import { area } from '@turf/area';

function simplifyTolerance(feature) {
  // Lightweight simplification — remove tiny island geometries
  // We rely on Natural Earth 110m being already simplified
  return feature;
}

// ── Step 1: Fetch Natural Earth GeoJSON ──

async function fetchCountriesGeoJSON() {
  console.log('  Downloading Natural Earth 110m countries...');
  const data = await fetchJson(NE_URL);
  console.log(`  ✓ ${data.features.length} country features`);
  return data;
}

// ── Step 2: Parse UNDP CSV for HDI and IHDI ──

function parseUNDPCSV(csv) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  // Find relevant columns
  const isoCol = headers.findIndex(h => h === 'iso3');
  const countryCol = headers.findIndex(h => h === 'country');
  const hdiCol = headers.findIndex(h => h === 'hdi_2022' || h === 'hdi_2021');
  const ihdiCol = headers.findIndex(h => h === 'ihdi_2022' || h === 'ihdi_2021');
  const giniCol = headers.findIndex(h => h === 'gini_2021' || h === 'gini_2015');

  if (isoCol === -1) {
    console.warn('  ⚠ Could not find iso3 column in UNDP CSV, trying alternatives');
  }

  // Parse data rows
  const data = {};
  for (let i = 1; i < lines.length; i++) {
    // Simple CSV parser (handles quoted fields)
    const row = parseCSVLine(lines[i]);
    const iso = (row[isoCol] || '').trim().replace(/^"|"$/g, '');
    if (!iso || iso === '') continue;

    const hdiVal = hdiCol >= 0 ? parseFloat(row[hdiCol]) : null;
    const ihdiVal = ihdiCol >= 0 ? parseFloat(row[ihdiCol]) : null;

    data[iso] = {
      hdi: !isNaN(hdiVal) ? hdiVal : undefined,
      ihdi: !isNaN(ihdiVal) ? ihdiVal : undefined,
    };
  }
  return data;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

async function fetchUNDPData() {
  console.log('  Downloading UNDP HDR data...');
  try {
    const csv = await fetchText(UNDP_URL);
    const parsed = parseUNDPCSV(csv);
    const count = Object.keys(parsed).length;
    console.log(`  ✓ UNDP data for ${count} countries`);
    return parsed;
  } catch (err) {
    console.warn(`  ⚠ Failed to fetch UNDP data: ${err.message}`);
    console.warn('  → Continuing without HDI data');
    return {};
  }
}

// ── Step 3: Fetch World Bank population ──

async function fetchWorldBankPop() {
  console.log('  Downloading World Bank population data...');
  try {
    const data = await fetchJson(WB_POP_URL);
    const records = data[1] || [];
    const popMap = {};
    for (const rec of records) {
      const iso = rec.countryiso3code;
      if (iso && rec.value != null) {
        popMap[iso] = rec.value;
      }
    }
    console.log(`  ✓ Population data for ${Object.keys(popMap).length} countries`);
    return popMap;
  } catch (err) {
    console.warn(`  ⚠ Failed to fetch World Bank data: ${err.message}`);
    console.warn('  → Using Natural Earth population estimates instead');
    return {};
  }
}

// ── Step 4: Country name mapping (ISO → French name) ──
// Natural Earth includes NAME_FR field, but we provide a fallback
// for countries where it may be missing.

const FRENCH_NAMES_FALLBACK = {
  'FRA': 'France',
  'DEU': 'Allemagne',
  'GBR': 'Royaume-Uni',
  'ITA': 'Italie',
  'ESP': 'Espagne',
  'PRT': 'Portugal',
  'BEL': 'Belgique',
  'CHE': 'Suisse',
  'NLD': 'Pays-Bas',
  'LUX': 'Luxembourg',
  'AUT': 'Autriche',
  'POL': 'Pologne',
  'CZE': 'Tchéquie',
  'SVK': 'Slovaquie',
  'HUN': 'Hongrie',
  'ROU': 'Roumanie',
  'BGR': 'Bulgarie',
  'GRC': 'Grèce',
  'DNK': 'Danemark',
  'SWE': 'Suède',
  'NOR': 'Norvège',
  'FIN': 'Finlande',
  'IRL': 'Irlande',
  'MNE': 'Monténégro',
  'SRB': 'Serbie',
  'HRV': 'Croatie',
  'BIH': 'Bosnie-Herzégovine',
  'ALB': 'Albanie',
  'MKD': 'Macédoine du Nord',
  'USA': 'États-Unis',
  'CAN': 'Canada',
  'MEX': 'Mexique',
  'BRA': 'Brésil',
  'ARG': 'Argentine',
  'CHL': 'Chili',
  'COL': 'Colombie',
  'PER': 'Pérou',
  'JPN': 'Japon',
  'CHN': 'Chine',
  'IND': 'Inde',
  'RUS': 'Russie',
  'ZAF': 'Afrique du Sud',
  'EGY': 'Égypte',
  'NGA': 'Nigeria',
  'MAR': 'Maroc',
  'DZA': 'Algérie',
  'TUN': 'Tunisie',
  'SEN': 'Sénégal',
  'CIV': 'Côte d\'Ivoire',
  'MLI': 'Mali',
  'CMR': 'Cameroun',
  'TCD': 'Tchad',
  'NER': 'Niger',
  'BFA': 'Burkina Faso',
  'COD': 'République démocratique du Congo',
  'COG': 'République du Congo',
  'GAB': 'Gabon',
  'MDG': 'Madagascar',
  'MUS': 'Maurice',
  'VNM': 'Viêt Nam',
  'LAO': 'Laos',
  'KHM': 'Cambodge',
  'THA': 'Thaïlande',
  'IDN': 'Indonésie',
  'PHL': 'Philippines',
  'KOR': 'Corée du Sud',
  'PRK': 'Corée du Nord',
  'TUR': 'Turquie',
  'SAU': 'Arabie saoudite',
  'IRN': 'Iran',
  'IRQ': 'Irak',
  'ISR': 'Israël',
  'SYR': 'Syrie',
  'LBN': 'Liban',
  'JOR': 'Jordanie',
  'ARE': 'Émirats arabes unis',
  'AUS': 'Australie',
  'NZL': 'Nouvelle-Zélande',
  'UKR': 'Ukraine',
  'BLR': 'Biélorussie',
  'LTU': 'Lituanie',
  'LVA': 'Lettonie',
  'EST': 'Estonie',
  'ISL': 'Islande',
  'SVN': 'Slovénie',
  'CYP': 'Chypre',
  'MLT': 'Malte',
  'TWN': 'Taïwan',
  'ARE': 'Émirats arabes unis',
  'QAT': 'Qatar',
  'KWT': 'Koweït',
  'OMN': 'Oman',
  'BHR': 'Bahreïn',
  'VEN': 'Venezuela',
  'CUB': 'Cuba',
  'PAK': 'Pakistan',
  'BGD': 'Bangladesh',
  'MMR': 'Birmanie',
  'NPL': 'Népal',
  'LKA': 'Sri Lanka',
  'MYS': 'Malaisie',
  'SGP': 'Singapour',
  'ETH': 'Éthiopie',
  'KEN': 'Kenya',
  'TZA': 'Tanzanie',
  'UGA': 'Ouganda',
  'RWA': 'Rwanda',
  'AGO': 'Angola',
  'MOZ': 'Mozambique',
  'ZWE': 'Zimbabwe',
  'ZMB': 'Zambie',
  'MWI': 'Malawi',
  'GHA': 'Ghana',
  'LBR': 'Liberia',
  'SLE': 'Sierra Leone',
  'GIN': 'Guinée',
  'BEN': 'Bénin',
  'TGO': 'Togo',
  'CAF': 'République centrafricaine',
  'SSD': 'Soudan du Sud',
  'SDN': 'Soudan',
  'ERI': 'Érythrée',
  'DJI': 'Djibouti',
  'SOM': 'Somalie',
  'MRT': 'Mauritanie',
  'GMB': 'Gambie',
  'GNB': 'Guinée-Bissau',
  'GNQ': 'Guinée équatoriale',
  'STP': 'Sao Tomé-et-Principe',
  'CPV': 'Cap-Vert',
  'COM': 'Comores',
  'SYC': 'Seychelles',
  'BWA': 'Botswana',
  'NAM': 'Namibie',
  'LSO': 'Lesotho',
  'SWZ': 'Eswatini',
  'PSE': 'Palestine',
  'YEM': 'Yémen',
  'AFG': 'Afghanistan',
  'MNG': 'Mongolie',
  'BTN': 'Bhoutan',
  'MDV': 'Maldives',
  'FJI': 'Fidji',
  'PNG': 'Papouasie-Nouvelle-Guinée',
  'SLB': 'Îles Salomon',
  'VUT': 'Vanuatu',
  'WSM': 'Samoa',
  'TON': 'Tonga',
  'PLW': 'Palaos',
  'FSM': 'Micronésie',
  'MHL': 'Îles Marshall',
  'KIR': 'Kiribati',
  'TUV': 'Tuvalu',
  'NRU': 'Nauru',
  'GLP': 'Guadeloupe',
  'MTQ': 'Martinique',
  'GUF': 'Guyane française',
  'REU': 'La Réunion',
  'MYT': 'Mayotte',
};

function getFrenchName(props) {
  return props.NAME_FR || props.name_fr || FRENCH_NAMES_FALLBACK[props.ADM0_A3] || FRENCH_NAMES_FALLBACK[props.ISO_A3] || props.ADMIN || props.NAME || '';
}

// Native language field mapping: ISO code → Natural Earth NAME_XX field
// Extracts the country name in its own language/script
const NATIVE_NAME_FIELDS = {
  'JPN': 'NAME_JA', 'KOR': 'NAME_KO', 'PRK': 'NAME_KO',
  'CHN': 'NAME_ZH', 'TWN': 'NAME_ZH', 'HKG': 'NAME_ZH',
  'RUS': 'NAME_RU', 'UKR': 'NAME_UK', 'BLR': 'NAME_RU',
  'GRC': 'NAME_EL', 'CYP': 'NAME_EL',
  'ARE': 'NAME_AR', 'SAU': 'NAME_AR', 'IRN': 'NAME_FA', 'IRQ': 'NAME_AR',
  'ISR': 'NAME_HE', 'SYR': 'NAME_AR', 'LBN': 'NAME_AR', 'JOR': 'NAME_AR',
  'EGY': 'NAME_AR', 'DZA': 'NAME_AR', 'MAR': 'NAME_AR', 'TUN': 'NAME_AR',
  'IND': 'NAME_HI', 'NPL': 'NAME_HI', 'MMR': 'NAME_MY',
  'THA': 'NAME_TH', 'LAO': 'NAME_LO', 'KHM': 'NAME_KM',
  'VNM': 'NAME_VI',
  'TUR': 'NAME_TR',
  'BGD': 'NAME_BN',
  'PAK': 'NAME_UR', 'AFG': 'NAME_FA',
  'MNG': 'NAME_MN',
};

function getNativeName(props) {
  const iso = props.ADM0_A3 || props.ISO_A3 || '';
  const field = NATIVE_NAME_FIELDS[iso];
  if (field && props[field]) return props[field];
  return '';
}

// ── Step 5: Merge all data ──

function normalizeContinent(name) {
  if (!name) return '';
  const map = {
    'africa': 'africa',
    'europe': 'europe',
    'asia': 'asia',
    'oceania': 'oceania',
    'australia': 'oceania',
    'north america': 'americas',
    'south america': 'americas',
    'americas': 'americas',
    'antarctica': 'antarctica',
    'seven seas (open ocean)': 'oceania',
  };
  const key = name.toLowerCase().trim();
  return map[key] || key;
}

async function mergeData(countries, undpData, wbPop) {
  let mergedCount = 0;
  let missingFr = 0;

  const features = [];
  for (const feature of countries.features) {
    const props = feature.properties || {};
    // Prefer ADM0_A3 (administrative country code) over ISO_A3
    // because ISO_A3 may be "-99" for countries like France whose
    // sovereignty spans non-contiguous territories.
    const iso = props.ADM0_A3 || props.ISO_A3 || props.SU_A3 || '';
    const ud = undpData[iso] || {};
    const pop = wbPop[iso] || props.POP_EST || 0;

    const nomFr = getFrenchName(props);
    if (!nomFr) missingFr++;

    // Compute area from geometry using @turf/area
    let areaKm2 = 0;
    try {
      areaKm2 = Math.round(area(feature) / 1_000_000);
    } catch {
      // Fallback: area not critical
    }

    // Build clean properties
    const cleanProps = {
      iso_a3: iso,
      name_en: props.ADMIN || props.NAME || '',
      name_fr: nomFr,
      native_name: getNativeName(props),
      continent: normalizeContinent(props.CONTINENT),
      region_un: props.REGION_UN || '',
      subregion: props.SUBREGION || '',
      population: Math.round(pop),
      area_km2: areaKm2,
      hdi: ud.hdi !== undefined ? Math.round(ud.hdi * 1000) / 1000 : undefined,
      ihdi: ud.ihdi !== undefined ? Math.round(ud.ihdi * 1000) / 1000 : undefined,
      density: areaKm2 > 0 ? Math.round(pop / areaKm2) : undefined,
    };

    // Remove undefined values
    for (const key of Object.keys(cleanProps)) {
      if (cleanProps[key] === undefined) delete cleanProps[key];
    }

    mergedCount++;
    features.push({
      type: 'Feature',
      geometry: feature.geometry,
      properties: cleanProps,
    });
  }

  if (missingFr > 0) {
    console.warn(`  ⚠ ${missingFr} countries missing French name (check FRENCH_NAMES_FALLBACK)`);
  }

  return { type: 'FeatureCollection', features };
}

// ── Step 6: Generate country .md files ──

function mdTemplate(data) {
  const iso = data.iso_a3;
  const nom = data.name_fr;
  const sourceIds = ['world-bank', 'undp-hdr', 'natural-earth'];
  const sourceStr = sourceIds.map((s) => `"${s}"`).join(', ');

  const frontmatter = [
    '---',
    `code: "${iso}"`,
    `nom: "${(nom || '').replace(/"/g, '\\"')}"`,
    `nomEn: "${(data.name_en || '').replace(/"/g, '\\"')}"`,
    data.native_name ? `nativeName: "${data.native_name.replace(/"/g, '\\"')}"` : '',
    data.continent ? `continent: "${data.continent.toLowerCase()}"` : '',
    data.population ? `population: ${data.population}` : '',
    data.area_km2 ? `area: ${data.area_km2}` : '',
    data.density ? `density: ${data.density}` : '',
    data.hdi !== undefined ? `hdi: ${data.hdi}` : '',
    data.ihdi !== undefined ? `ihdi: ${data.ihdi}` : '',
    sourceStr ? `sourceIds: [${sourceStr}]` : '',
    '---',
    '',
    `Page en cours de rédaction. Les informations sur ${nom || 'ce pays'} seront bientôt disponibles.`,
    '',
  ];

  return frontmatter.filter((l) => l !== '').join('\n');
}

function generateCountryFiles(countries) {
  if (!existsSync(COUNTRIES_DIR)) {
    mkdirSync(COUNTRIES_DIR, { recursive: true });
  }

  let generated = 0;
  for (const feature of countries.features) {
    const props = feature.properties;
    if (!props.iso_a3) continue;

    // Skip some overseas territories that are part of France
    const skipCodes = ['GLP', 'MTQ', 'GUF', 'REU', 'MYT', 'NCL', 'PYF', 'WLF', 'ATF'];
    if (skipCodes.includes(props.iso_a3)) continue;

    const content = mdTemplate(props);
    const filename = `${props.iso_a3.toLowerCase()}.md`;
    const filepath = resolve(COUNTRIES_DIR, filename);

    if (!existsSync(filepath)) {
      writeFileSync(filepath, content, 'utf-8');
      generated++;
    }
  }
  console.log(`  ✓ Generated ${generated} new country files (${countries.features.length - generated} already existed)`);
}

// ── Step 7: Write merged GeoJSON ──

function writeGeoJSON(data) {
  // Strip geometryless features
  data.features = data.features.filter((f) => f.geometry && f.geometry.type);

  // Write to src/data/geo/ for build-time import
  const srcDir = dirname(GEO_OUT);
  if (!existsSync(srcDir)) mkdirSync(srcDir, { recursive: true });
  writeFileSync(GEO_OUT, JSON.stringify(data), 'utf-8');

  // Write to public/data/geo/ for client-side fetch
  const pubDir = dirname(GEO_OUT_PUBLIC);
  if (!existsSync(pubDir)) mkdirSync(pubDir, { recursive: true });
  writeFileSync(GEO_OUT_PUBLIC, JSON.stringify(data), 'utf-8');

  console.log(`  ✓ Wrote ${data.features.length} features to src/data/geo/world-countries.json + public/data/geo/world-countries.json`);
}

// ── Main ──

async function main() {
  console.log('\n🌍 Fetching world data...\n');

  try {
    const countries = await fetchCountriesGeoJSON();
    const undpData = await fetchUNDPData();
    const wbPop = await fetchWorldBankPop();

    console.log('\n  Merging data...');
    const merged = await mergeData(countries, undpData, wbPop);

    writeGeoJSON(merged);

    console.log('\n  Generating country content files...');
    generateCountryFiles(merged);

    console.log('\n✅ World data pipeline complete.\n');
  } catch (err) {
    console.error('\n❌ Pipeline failed:', err.message);
    process.exit(1);
  }
}

main();
