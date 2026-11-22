import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': { target: 'http://localhost:3001', ws: true },
      '/api': { target: 'http://localhost:3001' },
    },
  },
  build: {
    // The lazy-loaded Three.js core is 683 kB minified and about 176 kB gzipped.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return;
          if (id.includes('/node_modules/three/')) return 'three';
          if (id.includes('/node_modules/@react-three/') || id.includes('/node_modules/three-stdlib/')) {
            return 'react-three';
          }
        },
      },
    },
  },
  test: { environment: 'node', include: ['shared/**/*.test.ts', 'server/**/*.test.ts', 'src/**/*.test.tsx'] },
});
