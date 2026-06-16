// Content Collections configuration and Zod schemas.
// Validated at build time — every field is type-checked.

import { defineCollection, z } from 'astro:content';

// ── Eras ──

export const eraSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  period: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  start: z.number(),
  end: z.number(),
  link: z.string().url().optional(),
});

// ── Events ──

export const eventSchema = z.object({
  id: z.string().min(1),
  start: z.number(),
  end: z.number(),
  yearDisplay: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  mediaId: z.string().optional(),
  category: z.enum(['political', 'military', 'cultural', 'economic', 'scientific']),
  significance: z.number().int().min(1).max(5),
  stats: z.object({
    label: z.string(),
    value: z.number(),
    suffix: z.string(),
    format: z.string().optional(),
  }),
  sourceId: z.string().optional(),
  link: z.string().url().optional(),
  preview: z.object({
    summary: z.string(),
    statLabel: z.string(),
    statValue: z.string(),
  }),
});

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
});

// ── Export collections ──

export const collections = {
  eras:    defineCollection({ type: 'data',    schema: eraSchema }),
  events:  defineCollection({ type: 'content', schema: eventSchema }),
  sources: defineCollection({ type: 'data',    schema: sourceSchema }),
  media:   defineCollection({ type: 'data',    schema: mediaSchema }),
};

// ── Convenience types ──

export type Era = z.infer<typeof eraSchema>;
export type TimelineEvent = z.infer<typeof eventSchema>;
export type CslSource = z.infer<typeof sourceSchema>;
export type MediaEntry = z.infer<typeof mediaSchema>;
