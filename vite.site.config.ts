import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Own-site version for GitHub Pages: everything bundled (works with no signal), from index.html.
// scripts/build-site.mjs then writes the offline helper (sw.js) listing every file to keep.
export default defineConfig({
  base: './',
  plugins: [react()],
  publicDir: 'public-site',
  build: { outDir: 'dist-site', emptyOutDir: true, chunkSizeWarningLimit: 1200 },
});
