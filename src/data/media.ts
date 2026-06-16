// Build-time media asset lookup.
// Combines Content Collections (metadata) with import.meta.glob (file imports).
// SVGs imported as URL strings via '?url' query.
// Raster images imported as optimized ImageMetadata objects.

import { getCollection } from 'astro:content';
import type { MediaEntry } from '../content/config';

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

interface ImageMeta {
  src: string;
  width: number;
  height: number;
  format: string;
}

/** Resolved media entry paired with its imported file metadata */
export interface ResolvedMedia extends MediaEntry {
  src: string;
  width: number;
  height: number;
  format: string;
}

/** Extract filename stem (without dir or extension) */
function pathStem(filePath: string): string {
  return filePath.split('/').pop()!.replace(/\.\w+$/, '');
}

/** Get a resolved media entry by ID — async */
export async function getMedia(id: string): Promise<ResolvedMedia | undefined> {
  const all = await getAllMedia();
  return all.find((m) => m.id === id);
}

/** Get all resolved media entries — async */
export async function getAllMedia(): Promise<ResolvedMedia[]> {
  const entries = await getCollection('media');
  const byId = new Map<string, MediaEntry>();
  for (const e of entries) {
    byId.set(e.id, e.data as MediaEntry);
  }

  const resolved: ResolvedMedia[] = [];

  // Process SVGs (URL strings)
  for (const [filePath, url] of Object.entries(svgModules)) {
    const stem = pathStem(filePath);
    const entry = byId.get(stem);
    if (entry) {
      resolved.push({
        ...entry,
        src: url,
        width: entry.width ?? 800,
        height: entry.height ?? 600,
        format: 'svg',
      });
    }
  }

  // Process raster images (ImageMetadata)
  for (const [filePath, mod] of Object.entries(rasterModules)) {
    const stem = pathStem(filePath);
    const ext = filePath.split('.').pop()!.toLowerCase();
    const entry = byId.get(stem);
    if (entry) {
      const meta = (
        mod as { default: ImageMeta }
      ).default;
      resolved.push({
        ...entry,
        src: meta.src,
        width: entry.width ?? meta.width,
        height: entry.height ?? meta.height,
        format: ext,
      });
    }
  }

  return resolved;
}
