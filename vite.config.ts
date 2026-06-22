import { defineConfig } from 'vite';

// Relative base so the static build works at any path (e.g. GitHub Pages /Repo/).
export default defineConfig({
  base: './',
  server: {
    port: 5173,
  },
  build: {
    target: 'es2020',
  },
});
