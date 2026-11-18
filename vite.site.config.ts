import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Marquette Engineering Knowledge Base on GitHub Pages, at kb/ (kb/index.html), everything bundled so it
// works with no signal. scripts/build-site.mjs then adds the knowledge-base files and the offline helper.
// public-site/ holds the app's icons and logo, and the top-level page that forwards to kb/.
export default defineConfig({
  base: './',
  plugins: [react()],
  publicDir: 'public-site',
  build: {
    outDir: 'dist-site',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: { input: { kb: 'kb/index.html' } },
  },
});
