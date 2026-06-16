// Build-time source lookup via Astro Content Collections.
// All consumer imports must use `await` (these are async).

import { getCollection } from 'astro:content';
import type { CslSource } from '../content/config';

/** All sources sorted by publisher/title — async */
export async function allSources(): Promise<CslSource[]> {
  const entries = await getCollection('sources');
  return entries
    .map((e) => e.data as CslSource)
    .sort((a, b) => {
      const aKey = (a.publisher ?? a.title ?? a.id).toLowerCase();
      const bKey = (b.publisher ?? b.title ?? b.id).toLowerCase();
      return aKey.localeCompare(bKey);
    });
}

/** Look up a source by its CSL-JSON id — async */
export async function getSource(id: string): Promise<CslSource | undefined> {
  const entries = await getCollection('sources');
  return entries.find((e) => e.id === id)?.data as CslSource | undefined;
}

/** Format a source as a short citation label (publisher + year) — sync helper */
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

/** Get the bibliography page URL for a source — sync helper */
export function sourceUrl(id: string): string {
  return `/bibliography/${id}`;
}
