// Build-time media asset lookup utility.
// All media files live in src/media/. Raster images (jpg, png, etc.) are
// imported via import.meta.glob as ImageMetadata objects (optimized by Astro).
// SVGs are imported as URL strings via query: '?url' (avoiding Astro's
// default SVG-component compilation so they work with <img src="...">).

import type { ResolvedMedia } from './media.types';
import mediaRegistry from './media.json';

/** SVG files — imported as URL strings */
const svgModules = import.meta.glob<string>(
  '/src/media/*.svg',
  { eager: true, query: '?url', import: 'default' }
);

/** Raster images — imported as ImageMetadata objects */
const rasterModules = import.meta.glob(
  '/src/media/*.{jpg,jpeg,png,gif,webp,avif}',
  { eager: true }
);

/** Map of media ID → ResolvedMedia */
const resolved: Record<string, ResolvedMedia> = {};

// ── Process SVGs (URL strings) ──
for (const [filePath, url] of Object.entries(svgModules)) {
  const stem = pathStem(filePath);
  const entry = mediaRegistry.find((m) => m.id === stem);
  if (entry) {
    resolved[entry.id] = {
      ...entry,
      src: url,
      width: 800,
      height: 600,
      format: 'svg',
    };
  }
}

// ── Process raster images (ImageMetadata) ──
for (const [filePath, mod] of Object.entries(rasterModules)) {
  const stem = pathStem(filePath);
  const ext = filePath.split('.').pop()!.toLowerCase();
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

/** Extract filename stem (without dir or extension) */
function pathStem(filePath: string): string {
  return filePath.split('/').pop()!.replace(/\.\w+$/, '');
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
