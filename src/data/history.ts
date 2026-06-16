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

/** Match an event to an era by year-range containment */
function matchEra(event: TimelineEvent, eras: Era[]): Era | undefined {
  return eras.find((e) => event.start >= e.start && event.end <= e.end);
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
        'De la Gaule à la Ve République — chaque époque racontée par ses dates et ses statistiques.',
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
