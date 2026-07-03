/**
 * search-pixabay.mjs — CLI search for Pixabay images with disk-backed 24h cache
 *
 * Usage:
 *   node scripts/search-pixabay.mjs "yellow flowers"
 *   node scripts/search-pixabay.mjs "french countryside" --per-page 10 --orientation horizontal
 *
 * Options:
 *   --per-page <n>     Results per page (3-200, default 20)
 *   --image-type       all|photo|illustration|vector (default: photo)
 *   --orientation      all|horizontal|vertical
 *   --category         Filter by category (backgrounds, people, nature, ...)
 *   --min-width        Minimum image width
 *   --min-height       Minimum image height
 *   --colors           Comma-separated color filter
 *   --order            popular|latest
 *   --safesearch       true|false (default: true)
 *   --json             Output raw JSON instead of formatted table
 *   --no-cache         Bypass cache and force-fetch from API
 *
 * Environment:
 *   PIXABAY_API_KEY env var, or .dev file in project root.
 *
 * Rate limit: 100 req / 60s. Results are cached for 24h.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Config ──

const CACHE_DIR = resolve(ROOT, 'src/data/pixabay-cache');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEV_FILE = resolve(ROOT, '.dev');

// ── API key ──

function getApiKey() {
  if (process.env.PIXABAY_API_KEY) return process.env.PIXABAY_API_KEY;
  if (existsSync(DEV_FILE)) {
    const content = readFileSync(DEV_FILE, 'utf-8');
    const match = content.match(/PIXABAY_API_KEY\s*=\s*"([^"]+)"/);
    if (match) return match[1];
  }
  console.error('❌ PIXABAY_API_KEY not found. Set it in .dev or as env var.');
  process.exit(1);
}

// ── Cache ──

function cacheKey(query, params) {
  const canonical = JSON.stringify({ q: query, ...params });
  return createHash('md5').update(canonical).digest('hex');
}

function cacheGet(key) {
  const file = resolve(CACHE_DIR, `${key}.json`);
  if (!existsSync(file)) return null;
  try {
    const data = JSON.parse(readFileSync(file, 'utf-8'));
    const age = Date.now() - data.cachedAt;
    if (age < CACHE_TTL_MS) return data.results;
    // expired — remove stale file
    try { writeFileSync(file, ''); } catch { /* ignore */ }
  } catch { /* corrupt cache */ }
  return null;
}

function cacheSet(key, results) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const file = resolve(CACHE_DIR, `${key}.json`);
  writeFileSync(file, JSON.stringify({ cachedAt: Date.now(), results }), 'utf-8');
}

// ── API call ──

async function searchPixabay(query, opts = {}) {
  const key = getApiKey();
  const params = new URLSearchParams({ key, q: query });

  if (opts.imageType) params.set('image_type', opts.imageType);
  if (opts.orientation) params.set('orientation', opts.orientation);
  if (opts.category) params.set('category', opts.category);
  if (opts.minWidth) params.set('min_width', String(opts.minWidth));
  if (opts.minHeight) params.set('min_height', String(opts.minHeight));
  if (opts.colors) params.set('colors', opts.colors);
  if (opts.order) params.set('order', opts.order);
  if (opts.safesearch !== undefined) params.set('safesearch', opts.safesearch ? 'true' : 'false');
  params.set('per_page', String(opts.perPage || 20));

  const url = `https://pixabay.com/api/?${params.toString()}`;
  const resp = await fetch(url);

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status} from Pixabay: ${text}`);
  }

  return resp.json();
}

// ── Output formatter ──

function formatResults(data) {
  const hits = data.hits || [];
  if (hits.length === 0) return 'Aucun résultat.';

  const lines = [];
  lines.push(`Total: ${data.total} hits (${data.totalHits} accessible via API, showing ${hits.length})\n`);

  for (const hit of hits) {
    lines.push(`  ID:        ${hit.id}`);
    lines.push(`  Tags:      ${hit.tags || ''}`);
    lines.push(`  Dimensions: ${hit.imageWidth}×${hit.imageHeight}px (${(hit.imageSize / 1024 / 1024).toFixed(1)} MB)`);
    lines.push(`  URL:       ${hit.largeImageURL || hit.webformatURL}`);
    lines.push(`  Source:    ${hit.pageURL}`);
    lines.push(`  Creator:   ${hit.user} (user #${hit.user_id})`);
    lines.push('');
  }

  return lines.join('\n');
}

// ── CLI entrypoint ──

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: node scripts/search-pixabay.mjs <query> [options]

Search Pixabay for CC0-licensed images. Results cached for 24h.

Options:
  --per-page <n>     Results per page (3-200, default 20)
  --image-type       all|photo|illustration|vector (default: photo)
  --orientation      all|horizontal|vertical
  --category         Filter by category
  --min-width        Minimum image width
  --min-height       Minimum image height
  --colors           Comma-separated color filter
  --order            popular|latest
  --safesearch       true|false (default: true)
  --json             Output raw JSON
  --no-cache         Skip the 24h cache
  --help             Show this help
`);
    process.exit(0);
  }

  const query = args[0];
  const opts = { imageType: 'photo', safesearch: true, perPage: 20 };
  let useCache = true;
  let jsonOutput = false;

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--per-page':    opts.perPage = parseInt(args[++i], 10); break;
      case '--image-type':  opts.imageType = args[++i]; break;
      case '--orientation': opts.orientation = args[++i]; break;
      case '--category':    opts.category = args[++i]; break;
      case '--min-width':   opts.minWidth = parseInt(args[++i], 10); break;
      case '--min-height':  opts.minHeight = parseInt(args[++i], 10); break;
      case '--colors':      opts.colors = args[++i]; break;
      case '--order':       opts.order = args[++i]; break;
      case '--safesearch':  opts.safesearch = args[++i] !== 'false'; break;
      case '--json':        jsonOutput = true; break;
      case '--no-cache':    useCache = false; break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  return { query, opts, useCache, jsonOutput };
}

async function main() {
  const { query, opts, useCache, jsonOutput } = parseArgs();
  const ckey = cacheKey(query, opts);

  // Check cache
  if (useCache) {
    const cached = cacheGet(ckey);
    if (cached) {
      if (jsonOutput) {
        console.log(JSON.stringify(cached, null, 2));
      } else {
        console.log(formatResults(cached));
      }
      return;
    }
  }

  // Fetch from API
  console.error('  Fetching from Pixabay API...');
  let data;
  try {
    data = await searchPixabay(query, opts);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  // Cache it
  cacheSet(ckey, data);

  // Output
  if (jsonOutput) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(formatResults(data));
  }
}

main();
