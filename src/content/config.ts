// Content Collections configuration and Zod schemas.
// Validated at build time — every field is type-checked.

import { defineCollection, z } from 'astro:content';
import { autoInferYearDisplay, autoInferEraPeriod } from '../data/year-display';

// ── Eras ──

export const eraSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  start: z.number(),
  end: z.number(),
  description: z.string().optional(),
}).transform((data) => ({
  ...data,
  period: autoInferEraPeriod(data.start, data.end),
}));

// ── Timeline sub-entries (mini-timeline within an event article) ──

const timelineEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  start: z.number(),
  end: z.number(),
  sectionId: z.string().optional(),
}).refine(
  (data) => data.end >= data.start,
  { message: 'end must be >= start for timeline entry', path: ['end'] }
);

// ── Events ──

export const eventSchema = z.object({
  id: z.string().min(1),
  start: z.number(),
  end: z.number(),
  yearDisplay: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  mediaId: z.string().optional(),
  mediaIds: z.array(z.string()).optional(),
  departmentId: z.string().optional(),
  timeline: z.array(timelineEntrySchema).optional(),
}).refine(
  (data) => data.end >= data.start,
  { message: 'end must be >= start', path: ['end'] }
).transform((data) => ({
  ...data,
  yearDisplay: data.yearDisplay ?? autoInferYearDisplay(data.start, data.end),
}));

// ── Sources (CSL-JSON) ──

const sourceAuthor = z.object({
  family: z.string().optional(),
  given: z.string().optional(),
  literal: z.string().optional(),
}).optional();

const cslDateParts = z.array(z.union([z.number(), z.string()]));

const sourceSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'article', 'article-journal', 'article-magazine', 'article-newspaper',
    'bill', 'book', 'broadcast', 'chapter', 'classic', 'collection',
    'dataset', 'document', 'entry', 'entry-dictionary', 'entry-encyclopedia',
    'event', 'figure', 'graphic', 'hearing', 'interview', 'legal_case',
    'legislation', 'manuscript', 'map', 'motion_picture', 'musical_score',
    'pamphlet', 'paper-conference', 'patent', 'performance', 'periodical',
    'personal_communication', 'post', 'post-weblog', 'regulation', 'report',
    'review', 'review-book', 'software', 'song', 'speech', 'standard',
    'thesis', 'treaty', 'webpage',
  ]),
  title: z.string().optional(),
  author: z.array(sourceAuthor).optional(),
  publisher: z.string().optional(),
  'publisher-place': z.string().optional(),
  issued: z.object({
    'date-parts': z.array(cslDateParts),
  }).optional(),
  accessed: z.object({
    'date-parts': z.array(cslDateParts),
  }).optional(),
  URL: z.string().url().optional(),
  DOI: z.string().optional(),
  genre: z.string().optional(),
  'collection-title': z.string().optional(),
  note: z.string().optional(),
});

// ── Media ──

const sourceCodeSchema = z.object({
  lang: z.enum(['javascript', 'mermaid', 'svg', 'json']),
  code: z.string(),
  label: z.string().optional(),
});

const renderingSourceSchema = z.object({
  filePath: z.string(),
  label: z.string(),
});

const mediaSchema = z.object({
  id: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().optional(),
  credit: z.string().optional(),
  license: z.string().optional(),
  licenseUrl: z.string().url().optional(),
  sourceId: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  sourceCode: z.array(sourceCodeSchema).optional(),
  renderingSource: renderingSourceSchema.optional(),
});

// ── Departments ──

export const departmentSchema = z.object({
  code: z.string().regex(/^(\d{2,3}|[2-9][A-B])$/, 'Must be a valid department code'),
  nom: z.string().min(1),
  region: z.string().min(1),
  prefecture: z.string().optional(),
  mediaIds: z.array(z.string()).optional(),
  sourceIds: z.array(z.string()).optional(),
}).transform((data) => ({
  ...data,
  slug: data.code,
}));

// ── Countries (world map + country profiles) ──

export const countrySchema = z.object({
  code: z.string().length(3), // ISO 3166-1 alpha-3
  nom: z.string().min(1), // French name
  nomEn: z.string().min(1), // English name
  nativeName: z.string().optional(), // Name in native language
  continent: z.enum(['africa', 'americas', 'asia', 'europe', 'oceania', 'antarctica']).optional(),
  capital: z.string().optional(),
  population: z.number().optional(),
  area: z.number().optional(),
  density: z.number().optional(),
  hdi: z.number().min(0).max(1).optional(),
  ihdi: z.number().min(0).max(1).optional(),
  mediaIds: z.array(z.string()).optional(),
  sourceIds: z.array(z.string()).optional(),
}).transform((data) => ({
  ...data,
  slug: data.code.toLowerCase(),
}));

// ── Figures (data-driven charts, prerendered to SVG) ──

const chartType = z.enum([
  'line',
  'bar',
  'population-pyramid',
  'bump',
  'choropleth',
  'comparison',
  'sankey',
  'pie',
]);

const figureBase = {
  id: z.string().min(1),
  type: chartType,
  title: z.string().optional(),
  caption: z.string().optional(),
  credit: z.string().optional(),
  license: z.string().optional(),
  licenseUrl: z.string().url().optional(),
  sourceIds: z.array(z.string()).min(1).optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  palette: z.array(z.string()).optional(),
  previewMediaId: z.string().optional(),
};

// ── Line chart ──
const lineFigureSchema = z.object({
  ...figureBase,
  type: z.literal('line'),
  config: z.object({
    xAxis: z.object({ label: z.string().optional() }).optional(),
    yAxis: z.object({
      label: z.string().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      unit: z.string().optional(),
    }).optional(),
    interpolation: z.enum(['linear', 'monotone', 'step']).optional(),
    showLegend: z.boolean().optional(),
  }).optional(),
  data: z.object({
    series: z.array(z.object({
      name: z.string(),
      values: z.array(z.object({
        x: z.union([z.number(), z.string()]),
        y: z.number(),
      })).min(1),
    })).min(1),
  }),
});

// ── Bar chart ──
const barFigureSchema = z.object({
  ...figureBase,
  type: z.literal('bar'),
  config: z.object({
    orientation: z.enum(['grouped', 'stacked']).optional(),
    xAxis: z.object({ label: z.string().optional() }).optional(),
    yAxis: z.object({ label: z.string().optional(), unit: z.string().optional() }).optional(),
    showLegend: z.boolean().optional(),
  }).optional(),
  data: z.object({
    values: z.array(z.object({
      category: z.string(),
      groups: z.array(z.object({
        name: z.string(),
        value: z.number(),
      })).min(1),
    })).min(1),
  }),
});

// ── Pie chart ──
const pieFigureSchema = z.object({
  ...figureBase,
  type: z.literal('pie'),
  config: z.object({
    showLegend: z.boolean().optional(),
    innerRadius: z.number().min(0).optional(),
  }).optional(),
  data: z.object({
    values: z.array(z.object({
      label: z.string(),
      value: z.number().positive(),
    })).min(1),
  }),
});

// ── Population pyramid ──
const pyramidFigureSchema = z.object({
  ...figureBase,
  type: z.literal('population-pyramid'),
  config: z.object({
    year: z.number(),
    xLabel: z.string().optional(),
    unit: z.string().optional(),
  }).optional(),
  data: z.object({
    male: z.array(z.object({
      ageGroup: z.string(),
      value: z.number(),
    })).min(1),
    female: z.array(z.object({
      ageGroup: z.string(),
      value: z.number(),
    })).min(1),
  }),
});

// ── Bump chart ──
const bumpFigureSchema = z.object({
  ...figureBase,
  type: z.literal('bump'),
  config: z.object({
    xAxis: z.object({ label: z.string().optional() }).optional(),
    yLabel: z.string().optional(),
  }).optional(),
  data: z.object({
    series: z.array(z.object({
      name: z.string(),
      values: z.array(z.object({
        x: z.union([z.number(), z.string()]),
        rank: z.number().int().positive(),
      })).min(1),
    })).min(1),
  }),
});

// ── Choropleth ──
const choroplethFigureSchema = z.object({
  ...figureBase,
  type: z.literal('choropleth'),
  config: z.object({
    geoLayer: z.string(),
    valueProperty: z.string(),
    legend: z.object({
      label: z.string(),
      unit: z.string().optional(),
    }).optional(),
    classification: z.enum(['quantile', 'equal', 'jenks']).optional(),
    numClasses: z.number().int().min(3).max(9).optional(),
  }),
  data: z.object({
    features: z.array(z.object({
      id: z.string(),
      value: z.number(),
    })).min(1),
  }),
});

// ── Comparison (before/after side-by-side) ──
const comparisonFigureSchema = z.object({
  ...figureBase,
  type: z.literal('comparison'),
  config: z.object({
    labelBefore: z.string().optional(),
    labelAfter: z.string().optional(),
  }).optional(),
  data: z.object({
    before: z.string(),
    after: z.string(),
    mediaIdBefore: z.string().optional(),
    mediaIdAfter: z.string().optional(),
  }),
});

// ── Sankey diagram ──
const sankeyFigureSchema = z.object({
  ...figureBase,
  type: z.literal('sankey'),
  config: z.object({
    nodeLabel: z.enum(['name', 'value', 'none']).optional(),
  }).optional(),
  data: z.object({
    nodes: z.array(z.object({
      name: z.string(),
      category: z.string().optional(),
    })).min(1),
    links: z.array(z.object({
      source: z.union([z.string(), z.number()]),
      target: z.union([z.string(), z.number()]),
      value: z.number(),
    })).min(1),
  }),
});

export const figureSchema = z.discriminatedUnion('type', [
  lineFigureSchema,
  barFigureSchema,
  pieFigureSchema,
  pyramidFigureSchema,
  bumpFigureSchema,
  choroplethFigureSchema,
  comparisonFigureSchema,
  sankeyFigureSchema,
]);

// ── Export collections ──

export const collections = {
  eras:         defineCollection({ type: 'content', schema: eraSchema }),
  events:       defineCollection({ type: 'content', schema: eventSchema }),
  sources:      defineCollection({ type: 'data',    schema: sourceSchema }),
  media:        defineCollection({ type: 'data',    schema: mediaSchema }),
  departements: defineCollection({ type: 'content', schema: departmentSchema }),
  countries:    defineCollection({ type: 'content', schema: countrySchema }),
  figures:      defineCollection({ type: 'data',    schema: figureSchema }),
};

// ── Convenience types ──

export type Era = z.infer<typeof eraSchema>;
export type TimelineEvent = z.infer<typeof eventSchema>;
export type CslSource = z.infer<typeof sourceSchema>;
export type MediaEntry = z.infer<typeof mediaSchema>;
export type Department = z.infer<typeof departmentSchema>;
export type Country = z.infer<typeof countrySchema>;
export type ChartFigure = z.infer<typeof figureSchema>;
export type ChartType = z.infer<typeof chartType>;
export type TimelineEntry = z.infer<typeof timelineEntrySchema>;
export type SourceCode = z.infer<typeof sourceCodeSchema>;
