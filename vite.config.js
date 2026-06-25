import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://saladstik.github.io/hackathon3/ , and built into /docs
// so GitHub Pages can publish it without a CI step.
export default defineConfig({
  base: '/hackathon3/',
  plugins: [react()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
});
