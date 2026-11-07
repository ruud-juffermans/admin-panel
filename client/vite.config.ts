import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Keep the chart library in its own chunk so app code stays small.
      output: { manualChunks: { charts: ['recharts'] } },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3005,
    proxy: {
      // Dev: forward API and auth calls to the panel server (../server, :3000)
      // so the session cookie stays same-origin, exactly as in production
      // where the server serves this build itself.
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/auth': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
