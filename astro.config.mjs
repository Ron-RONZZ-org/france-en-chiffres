import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import remarkCitationLinks from './src/plugins/remark-citation-links.js';
import remarkFigureEmbed from './src/plugins/remark-figure-embed.js';

export default defineConfig({
  integrations: [tailwind()],
  markdown: {
    remarkPlugins: [remarkCitationLinks, remarkFigureEmbed],
  },
  site: 'https://france-stats.org',
});
