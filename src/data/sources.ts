// Build-time source lookup utility.
// Uses Vite's import.meta.glob to aggregate all CSL-JSON files in src/sources/.
// This file is evaluated at build time only.

import type { CslSource } from './history.types';

/** All CSL-JSON source files loaded eagerly at build time */
const sourceModules = import.meta.glob<{ default: CslSource }>(
  '/src/sources/*.json',
  { eager: true }
);

/** Map of source ID → CslSource */
export const sourcesById: Record<string, CslSource> = {};

for (const [, mod] of Object.entries(sourceModules)) {
  const src = mod.default;
  sourcesById[src.id] = src;
}

/** All sources as a sorted array (by publisher/title) */
export const allSources: CslSource[] = Object.values(sourcesById).sort((a, b) => {
  const aKey = (a.publisher ?? a.title ?? a.id).toLowerCase();
  const bKey = (b.publisher ?? b.title ?? b.id).toLowerCase();
  return aKey.localeCompare(bKey);
});

/**
 * Look up a source by its CSL-JSON id.
 * Returns the source object, or undefined if not found.
 */
export function getSource(id: string): CslSource | undefined {
  return sourcesById[id];
}

/**
 * Format a source as a short citation label (publisher + year fallback).
 */
export function formatSourceLabel(source: CslSource): string {
  if (source.publisher) {
    const year = source.issued?.['date-parts']?.[0]?.[0];
    return year ? `${source.publisher}, ${year}` : source.publisher;
  }
  if (source.author?.length) {
    const name = source.author[0]?.literal ?? source.author[0]?.family ?? '';
    return name || source.id;
  }
  return source.title ?? source.id;
}

/**
 * Get the bibliography page URL for a source.
 */
export function sourceUrl(id: string): string {
  return `/bibliography/${id}`;
}
