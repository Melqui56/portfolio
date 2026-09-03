// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Public site URL — override with PUBLIC_SITE_URL when deploying elsewhere.
const siteUrl = process.env.PUBLIC_SITE_URL ?? 'https://mqestudios.com';

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  integrations: [mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  // SPA-like transitions between pages
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});