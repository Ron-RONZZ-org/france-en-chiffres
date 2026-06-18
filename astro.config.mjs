import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import remarkCitationLinks from './src/plugins/remark-citation-links.js';

export default defineConfig({
  integrations: [tailwind()],
  markdown: {
    remarkPlugins: [remarkCitationLinks],
  },
  site: 'https://france-stats.org',
});
