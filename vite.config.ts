import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps asset paths relative so the build works on GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [react()],
  // three.js alone is ~600 kB; one lazy chunk per lesson is fine.
  build: { chunkSizeWarningLimit: 1200 },
});
