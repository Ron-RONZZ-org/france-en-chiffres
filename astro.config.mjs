import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import remarkCitationLinks from './src/plugins/remark-citation-links.js';
import remarkFigureEmbed from './src/plugins/remark-figure-embed.js';
import remarkHeadingIds from './src/plugins/remark-heading-ids.js';

export default defineConfig({
  integrations: [tailwind()],
  markdown: {
    remarkPlugins: [remarkHeadingIds, remarkCitationLinks, remarkFigureEmbed],
  },
  site: 'https://france-stats.org',
});
