// History aggregation layer.
// Loads eras and events via Content Collections, matches events to eras
// by year-range containment, and exports the HistoryData shape
// expected by Timeline.astro and its sub-components.

import { getCollection } from 'astro:content';
import type { Era, TimelineEvent } from '../content/config';

export interface HistoryPage {
  title: string;
  subtitle: string;
}

export interface HistoryData {
  page: HistoryPage;
  eras: Array<Era & { events: TimelineEvent[] }>;
}

/** Match an event to an era by year-range containment.
 *
 * When an event's year matches multiple eras (boundary years),
 * prefers the era whose `start` equals the event's `start`
 * (the era that "owns" its boundary year).
 */
function matchEra(event: TimelineEvent, eras: Era[]): Era | undefined {
  // Exact start match → unambiguous boundary ownership
  const exact = eras.find((e) => e.start === event.start && e.end >= event.end);
  if (exact) return exact;
  // Fall back to first containing era (must start strictly AFTER era start
  // and end strictly BEFORE era end to avoid double-matching boundary years)
  return eras.find((e) => event.start > e.start && event.end < e.end);
}

/** Load and assemble the full history data */
export async function getHistoryData(): Promise<HistoryData> {
  const [eraEntries, eventEntries] = await Promise.all([
    getCollection('eras'),
    getCollection('events'),
  ]);

  const eras = eraEntries.map((e) => e.data as Era).sort((a, b) => a.start - b.start);
  const events = eventEntries.map((e) => e.data as TimelineEvent);

  return {
    page: {
      title: 'Histoire en chiffres',
      subtitle:
        "De l'arrivée des premiers humains en France à la Ve République — une grande Histoire de la France, chiffrée et animée.",
    },
    eras: eras.map((era) => ({
      ...era,
      events: events
        .filter((ev) => {
          const matched = matchEra(ev, [era]);
          return matched !== undefined;
        })
        .sort((a, b) => a.start - b.start),
    })),
  };
}
