/**
 * departements.ts — Aggregation layer for department content
 *
 * Loads department .md files from Content Collections, enriches them
 * with population, density, area, and region data from JSON data files.
 *
 * Follows the same pattern as history.ts, sources.ts, media.ts
 */

import { getCollection } from 'astro:content';
import type { Department } from '../content/config';

import regionData from './france-regions.json';
import areaData from './department-areas.json';
import densityData from './population-density.json';
import deptGeo from './geo/departements.geojson';

export interface EnrichedDepartment extends Department {
  area: number;
  population: number;
  density: number;
}

/** Get all departments, enriched with computed data */
export async function getAllDepartments(): Promise<EnrichedDepartment[]> {
  const entries = await getCollection('departements');
  const densityMap = new Map(
    densityData.departments.map((d: { code: string; density: number }) => [d.code, d.density])
  );
  const areas = areaData as Record<string, number>;
  const regions = regionData as Record<string, string>;

  return entries
    .map((entry) => {
      const dept = entry.data;
      const code = dept.code;
      const density = densityMap.get(code) ?? 0;
      const area = areas[code] ?? 0;
      const population = Math.round(density * area);
      return {
        ...dept,
        area,
        population,
        density,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}

/** Get a single department by code */
export async function getDepartment(code: string): Promise<EnrichedDepartment | undefined> {
  const all = await getAllDepartments();
  return all.find((d) => d.code === code);
}
