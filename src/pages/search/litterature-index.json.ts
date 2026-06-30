import { getCollection } from 'astro:content';
import { readFileSync } from 'fs';

export async function GET() {
  const entries = await getCollection('litterature');

  const index = entries.map((entry) => {
    const raw = readFileSync(entry.filePath, 'utf-8');
    const body = raw
      .replace(/^---[\s\S]*?---\n?/, '')       // strip YAML frontmatter
      .replace(/\[media:[^\]]+\]/g, '')         // strip [media:...]
      .replace(/\[chart:[^\]]+\]/g, '')         // strip [chart:...]
      .replace(/\[source:[^\]]+\]/g, '')        // strip [source:...]
      .replace(/^##?\s+/gm, '')                 // strip ## headings
      .replace(/!\[.*?\]\(.*?\)/g, '')          // strip images
      .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')    // keep link text ([text](url) → text)
      .replace(/[*_~`]/g, '')                   // strip emphasis markers
      .replace(/^>\s+/gm, '')                   // strip blockquotes
      .replace(/\n{3,}/g, '\n\n')              // normalize whitespace
      .trim();

    return {
      id: entry.data.id,
      title: entry.data.title,
      author: entry.data.author,
      year: entry.data.year,
      isbn: entry.data.isbn ?? null,
      tags: entry.data.tags ?? [],
      slug: entry.data.slug,
      body,
    };
  });

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
}
