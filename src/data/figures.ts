// Build-time figure (chart) aggregation layer.
// Loads figure entries from Content Collections and provides lookup helpers.

import { getCollection } from 'astro:content';
import type { ChartFigure } from '../content/config';

/** Resolve a single figure by ID */
export async function getFigure(id: string): Promise<ChartFigure | undefined> {
  const all = await getAllFigures();
  return all.find((f) => f.id === id);
}

/** Load all figure entries */
export async function getAllFigures(): Promise<ChartFigure[]> {
  const entries = await getCollection('figures');
  return entries.map((e) => e.data as ChartFigure);
}

/** Get only figures of specific types (useful for tree-shaking) */
export async function getFiguresByType(...types: string[]): Promise<ChartFigure[]> {
  const all = await getAllFigures();
  return all.filter((f) => types.includes(f.type));
}

/** Extract figure IDs from a Markdown body string */
export function extractFigureIds(body: string): string[] {
  const refRegex = /!\[chart:\s*([\w-]+)\]/g;
  const ids: string[] = [];
  let match;
  while ((match = refRegex.exec(body)) !== null) {
    ids.push(match[1]);
  }
  return [...new Set(ids)];
}

/** Extract media IDs from a Markdown body string */
export function extractMediaIds(body: string): string[] {
  const refRegex = /!\[media:\s*([\w-]+)\]/g;
  const ids: string[] = [];
  let match;
  while ((match = refRegex.exec(body)) !== null) {
    ids.push(match[1]);
  }
  return [...new Set(ids)];
}
