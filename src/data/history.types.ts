export interface TimelineEvent {
  id: string;
  year: number;
  yearDisplay: string;
  title: string;
  description: string;
  category: 'political' | 'military' | 'cultural' | 'economic' | 'scientific';
  significance: 1 | 2 | 3 | 4 | 5;
  stats: { label: string; value: number; suffix: string; format?: string };
  /** Legacy plain-text source label (kept for fallback) */
  source?: string;
  /** Reference key into src/sources/ CSL-JSON files */
  sourceId?: string;
  link?: string;
  preview: {
    summary: string;
    statLabel: string;
    statValue: string;
  };
}

/** Shape of a CSL-JSON source document */
export interface CslSource {
  id: string;
  type: string;
  title?: string;
  author?: Array<{ family?: string; given?: string; literal?: string }>;
  publisher?: string;
  'publisher-place'?: string;
  issued?: { 'date-parts': Array<Array<string | number>> };
  accessed?: { 'date-parts': Array<Array<string | number>> };
  URL?: string;
  DOI?: string;
  genre?: string;
  note?: string;
  'collection-title'?: string;
}

export interface Era {
  id: string;
  label: string;
  period: string;
  color: string;
  link?: string;
  events: TimelineEvent[];
}

export interface HistoryData {
  page: { title: string; subtitle: string };
  eras: Era[];
}
