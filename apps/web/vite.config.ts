import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://localhost:4000';

export default defineConfig(({ mode }) => {
  const { DEV_HTTPS_CERT, DEV_HTTPS_KEY, DEV_HTTPS_PORT } = loadEnv(
    mode,
    process.cwd(),
    'DEV_HTTPS_',
  );
  if (Boolean(DEV_HTTPS_CERT) !== Boolean(DEV_HTTPS_KEY)) {
    throw new Error('DEV_HTTPS_CERT dan DEV_HTTPS_KEY harus diisi bersama');
  }
  return {
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
      port: DEV_HTTPS_PORT ? Number(DEV_HTTPS_PORT) : 5173,
      https:
        DEV_HTTPS_CERT && DEV_HTTPS_KEY
          ? { cert: readFileSync(DEV_HTTPS_CERT), key: readFileSync(DEV_HTTPS_KEY) }
          : undefined,
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
  };
});
