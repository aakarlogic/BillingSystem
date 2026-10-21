/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      src: resolve(__dirname, 'src'),
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [react()],
  server: {
    port: 5180,
    // Calls to /api are forwarded to the Java backend (pavti-api, port 8080). The browser only
    // talks to this dev server, so no CORS setup is needed, whatever port this runs on.
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          // same-origin for the backend: drop the browser's Origin so its CORS check does not apply
          proxy.on('proxyReq', (req) => req.removeHeader('origin'));
        },
      },
    },
  },
  test: { environment: 'node' },
});
