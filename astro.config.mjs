import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://scarletbreeze.github.io',
  base: process.env.INSIGHT_LAB_BASE_PATH || '/insight-lab/',
  trailingSlash: 'always',
  integrations: [react()],
  vite: { plugins: [tailwind()] },
});
