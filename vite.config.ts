import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds one script with React loaded from the CDN; scripts/build-web.mjs then puts the script
// and styles into a single page for claude.ai: dist-web/engine-log.html
export default defineConfig({
  plugins: [react({ jsxRuntime: 'classic' })],
  publicDir: false,
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'src/web-main.tsx',
      external: ['react', 'react-dom', 'react-dom/client'],
      output: {
        format: 'iife',
        globals: { react: 'React', 'react-dom': 'ReactDOM', 'react-dom/client': 'ReactDOM' },
        entryFileNames: 'app.js',
        assetFileNames: 'app[extname]',
      },
    },
  },
});
