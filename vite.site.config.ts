import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Own site for GitHub Pages: the engine log (index.html) and the knowledge base (kb/index.html),
// everything bundled so both work with no signal. scripts/build-site.mjs then adds the knowledge-base
// files and the offline helpers (sw.js) for each app.
export default defineConfig({
  base: './',
  plugins: [react()],
  publicDir: 'public-site',
  build: {
    outDir: 'dist-site',
    emptyOutDir: true,
    manifest: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: { input: { main: 'index.html', kb: 'kb/index.html' } },
  },
});
