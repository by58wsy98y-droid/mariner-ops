import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the built app works from any folder/sub-path (GitHub Pages, Netlify, etc.)
export default defineConfig({
  base: './',
  plugins: [react()],
});
