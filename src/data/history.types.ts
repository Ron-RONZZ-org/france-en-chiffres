export interface TimelineEvent {
  id: string;
  year: number;
  yearDisplay: string;
  title: string;
  description: string;
  category: 'political' | 'military' | 'cultural' | 'economic' | 'scientific';
  significance: 1 | 2 | 3 | 4 | 5;
  stats: { label: string; value: number; suffix: string; format?: string };
  source: string;
  preview: {
    summary: string;
    statLabel: string;
    statValue: string;
  };
}

export interface Era {
  id: string;
  label: string;
  period: string;
  color: string;
  events: TimelineEvent[];
}

export interface HistoryData {
  page: { title: string; subtitle: string };
  eras: Era[];
}
