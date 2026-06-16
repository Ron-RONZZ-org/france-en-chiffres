// Build-time media asset lookup utility.
// Raster images (jpg, png, webp, etc.) live in src/media/ and are
// optimized by Astro. SVG placeholders live in public/media/ and are
// served as-is via a constructed URL path.
// Both are cross-referenced with the metadata registry in media.json.

import fs from 'node:fs';
import path from 'node:path';
import type { ResolvedMedia } from './media.types';
import mediaRegistry from './media.json';

const publicMediaDir = path.resolve('public/media');

/** Raster media files from src/media/ loaded eagerly at build time */
const rasterModules = import.meta.glob(
  '/src/media/*.{jpg,jpeg,png,gif,webp,avif}',
  { eager: true }
);

/** Map of media ID → ResolvedMedia */
const resolved: Record<string, ResolvedMedia> = {};

// Process raster images (imported with ImageMetadata from Vite)
for (const [filePath, mod] of Object.entries(rasterModules)) {
  const filename = filePath.split('/').pop()!;
  const stem = filename.replace(/\.\w+$/, '');
  const ext = filename.split('.').pop()!.toLowerCase();
  const entry = mediaRegistry.find((m) => m.id === stem);
  if (entry) {
    const meta = (
      mod as { default: { src: string; width: number; height: number; format: string } }
    ).default;
    resolved[entry.id] = {
      ...entry,
      src: meta.src,
      width: meta.width,
      height: meta.height,
      format: ext,
    };
  }
}

// Process SVG placeholders from public/media/
for (const entry of mediaRegistry) {
  if (resolved[entry.id]) continue; // already resolved as raster
  const svgPath = path.join(publicMediaDir, `${entry.id}.svg`);
  if (fs.existsSync(svgPath)) {
    resolved[entry.id] = {
      ...entry,
      src: `/media/${entry.id}.svg`,
      width: 800,
      height: 600,
      format: 'svg',
    };
  }
}

/**
 * Look up a media entry by its ID.
 * Returns the resolved media (with import metadata) or undefined.
 */
export function getMedia(id: string): ResolvedMedia | undefined {
  return resolved[id];
}

/** All resolved media entries (for galleries, index pages) */
export const allMedia: ResolvedMedia[] = Object.values(resolved);
