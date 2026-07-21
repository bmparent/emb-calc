import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL ?? 'https://embroiderycalc-pro.pages.dev';

export default defineConfig({
  site,
  output: 'static',
  integrations: [react(), mdx(), sitemap()],
});
