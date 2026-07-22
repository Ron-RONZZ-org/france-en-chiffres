#!/usr/bin/env node

/**
 * optimize-media.mjs
 *
 * Pre-build step: optimizes all media files (raster images) from
 * src/content/media/ into public/media/ with:
 *   - Resizing (max 2000px wide)
 *   - JPEG compression (quality 85)
 *   - WebP conversion (quality 80)
 * SVGs are copied as-is.
 *
 * Also generates a manifest (public/media/.optimized-manifest.json) with
 * the optimized dimensions so that metadata consumers (MediaFigure.astro,
 * media.ts, etc.) can use accurate width/height for layout.
 *
 * Replaces the old copy-media-assets.mjs which copied originals verbatim.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const SRC_MEDIA = resolve(PROJECT_ROOT, 'src/content/media');
const PUBLIC_MEDIA = resolve(PROJECT_ROOT, 'public/media');

const RASTER_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif']);
const VECTOR_EXTS = new Set(['.svg']);
const ALL_EXTS = new Set([...RASTER_EXTS, ...VECTOR_EXTS]);

const MAX_WIDTH = 2000;
const JPEG_QUALITY = 85;
const WEBP_QUALITY = 80;

/**
 * Determine the output dimensions while preserving aspect ratio.
 */
function computeDimensions(originalWidth, originalHeight, maxWidth) {
  if (originalWidth <= maxWidth) {
    return { width: originalWidth, height: originalHeight };
  }
  const ratio = maxWidth / originalWidth;
  return {
    width: Math.round(maxWidth),
    height: Math.round(originalHeight * ratio),
  };
}

async function optimizeRaster(srcPath, id, ext) {
  let metadata;
  try {
    metadata = await sharp(srcPath, { failOn: 'none' }).metadata();
  } catch (err) {
    // Can't even read metadata — skip optimization
    throw new Error(`Cannot read metadata: ${err.message}`);
  }
  const { width: origW, height: origH } = metadata;
  const dims = computeDimensions(origW || 2000, origH || 2000, MAX_WIDTH);

  // --- Optimized JPEG (handle truncated files with failOn: 'none') ---
  const jpgPath = join(PUBLIC_MEDIA, `${id}.jpg`);
  await sharp(srcPath, { failOn: 'none' })
    .resize(dims.width, dims.height, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(jpgPath);

  // --- WebP ---
  const webpPath = join(PUBLIC_MEDIA, `${id}.webp`);
  await sharp(srcPath, { failOn: 'none' })
    .resize(dims.width, dims.height, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(webpPath);

  return { width: dims.width, height: dims.height };
}

async function main() {
  if (!existsSync(SRC_MEDIA)) {
    console.warn('[optimize-media] src/content/media/ not found. Skipping.');
    process.exit(0);
  }

  if (!existsSync(PUBLIC_MEDIA)) {
    mkdirSync(PUBLIC_MEDIA, { recursive: true });
  }

  const files = readdirSync(SRC_MEDIA);
  let optimized = 0;
  let copied = 0;
  const manifest = {};

  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (!ALL_EXTS.has(ext)) continue;

    const id = file.slice(0, -ext.length);
    const srcPath = join(SRC_MEDIA, file);

    if (VECTOR_EXTS.has(ext)) {
      // SVG — copy as-is
      const dest = join(PUBLIC_MEDIA, file);
      copyFileSync(srcPath, dest);
      copied++;
      console.log(`[optimize-media] ✓ ${file} (copied as-is)`);
      continue;
    }

    // Raster image — optimize
    try {
      const dims = await optimizeRaster(srcPath, id, ext);
      manifest[id] = { width: dims.width, height: dims.height };
      optimized++;
      console.log(`[optimize-media] ✓ ${file} → ${id}.jpg + ${id}.webp (${dims.width}×${dims.height})`);
    } catch (err) {
      console.warn(`[optimize-media] ⚠ Failed to optimize ${file}: ${err.message}`);
      // Fallback: copy as-is
      const dest = join(PUBLIC_MEDIA, file);
      copyFileSync(srcPath, dest);
      copied++;
    }
  }

  // Write manifest for consumers (media.ts, etc.)
  const manifestPath = join(PUBLIC_MEDIA, '.optimized-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`[optimize-media] ✍ Manifest written: ${manifestPath}`);

  console.log(`[optimize-media] ✅ Done. ${optimized} optimized, ${copied} copied as-is.`);
}

main().catch((err) => {
  console.error('[optimize-media] ❌ Fatal error:', err);
  process.exit(1);
});
