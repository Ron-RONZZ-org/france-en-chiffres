/**
 * countries.ts — Aggregation layer for country content
 *
 * Loads country .md files from Content Collections and enriches them
 * with geographic + statistical data from the world GeoJSON.
 *
 * Follows the same pattern as departements.ts
 */

import { getCollection } from 'astro:content';
import type { Country } from '../content/config';
import worldGeo from './geo/world-countries.json';

export interface EnrichedCountry extends Country {
  density: number;
}

/** Get all countries, sorted by French name */
export async function getAllCountries(): Promise<EnrichedCountry[]> {
  const entries = await getCollection('countries');
  const geoIndex = new Map<string, any>();
  for (const feature of (worldGeo as any).features) {
    const iso = feature.properties.iso_a3;
    if (iso) geoIndex.set(iso, feature.properties);
  }

  return entries
    .map((entry) => {
      const country = entry.data;
      const geo = geoIndex.get(country.code.toUpperCase());
      return {
        ...country,
        density: country.density ?? geo?.density ?? 0,
      };
    })
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/** Get a single country by ISO code */
export async function getCountry(code: string): Promise<EnrichedCountry | undefined> {
  const all = await getAllCountries();
  return all.find((c) => c.code.toLowerCase() === code.toLowerCase());
}
