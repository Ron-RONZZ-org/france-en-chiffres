#!/usr/bin/env node

/**
 * copy-media-assets.mjs
 *
 * Copies media binary files from src/content/media/ to public/media/
 * so they can be referenced by URL (/media/{id}.{ext}) in the build output.
 *
 * The JSON metadata files remain in src/content/media/ for the remark plugin.
 * This script is run as a prebuild step via `npm run build`.
 *
 * Why not base64 inline:
 *   Many media files are multi-MB (10–35 MB). Inlining them as base64 data URIs
 *   during build causes OOM (JavaScript heap exhaustion) because the entire AST
 *   stays in memory with multi-GB strings. URL references are zero-copy.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const SRC_MEDIA = resolve(PROJECT_ROOT, 'src/content/media');
const PUBLIC_MEDIA = resolve(PROJECT_ROOT, 'public/media');

const MEDIA_EXTS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif']);

if (!existsSync(SRC_MEDIA)) {
  console.warn('[copy-media-assets] src/content/media/ not found. Skipping.');
  process.exit(0);
}

if (!existsSync(PUBLIC_MEDIA)) {
  mkdirSync(PUBLIC_MEDIA, { recursive: true });
}

const files = readdirSync(SRC_MEDIA);
let copied = 0;

for (const file of files) {
  const ext = extname(file).toLowerCase();
  if (MEDIA_EXTS.has(ext)) {
    const src = join(SRC_MEDIA, file);
    const dest = join(PUBLIC_MEDIA, file);
    copyFileSync(src, dest);
    copied++;
  }
}

console.log(`[copy-media-assets] ✅ Copied ${copied} media asset(s) to public/media/`);
