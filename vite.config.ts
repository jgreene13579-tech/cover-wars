import { defineConfig } from 'vite';

// base './' keeps every path relative, so the built game works on itch.io,
// Netlify, or any sub-folder of the band website.
export default defineConfig({
  base: './',
  appType: 'mpa',
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 2000 },
});
