import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('/node_modules/') &&
            /\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)
          )
            return 'react-vendor';
          if (
            id.includes('/node_modules/@radix-ui/') ||
            /\/node_modules\/\.pnpm\/@radix-ui\+/.test(id)
          )
            return 'ui-vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/uploads': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
