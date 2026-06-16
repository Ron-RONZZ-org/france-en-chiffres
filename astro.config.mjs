import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import rehypeCitationLinks from './src/plugins/rehype-citation-links.js';

export default defineConfig({
  integrations: [tailwind()],
  markdown: {
    rehypePlugins: [rehypeCitationLinks],
  },
  site: 'https://france-en-chiffres.netlify.app',
});
