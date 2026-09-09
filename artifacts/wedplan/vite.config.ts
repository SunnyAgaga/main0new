import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

export default defineConfig(async ({ mode }) => {
  // Loads `.env` from this package's directory so `pnpm dev` works without
  // manually exporting/sourcing environment variables first. Real process
  // env vars (e.g. from Replit) still take precedence over the file.
  const env = { ...process.env, ...loadEnv(mode, import.meta.dirname, '') };

  const rawPort = env.PORT;

  if (!rawPort) {
    throw new Error(
      'PORT environment variable is required but was not provided.',
    );
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const basePath = env.BASE_PATH;

  if (!basePath) {
    throw new Error(
      'BASE_PATH environment variable is required but was not provided.',
    );
  }

  return {
    base: basePath,
    plugins: [
      {
        name: 'wedplan-html-entry',
        transformIndexHtml: {
          order: 'pre' as const,
          handler(html: string) {
            const entryTag = [
              '<scr',
              'ipt type="module" src="/src/main.tsx"></scr',
              'ipt>',
            ].join('');

            return html.replace('<!-- vite-entry -->', entryTag);
          },
        },
      },
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      ...(env.NODE_ENV !== 'production' && env.REPL_ID !== undefined
        ? [
            await import('@replit/vite-plugin-cartographer').then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, '..'),
              }),
            ),
            await import('@replit/vite-plugin-dev-banner').then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
        '@assets': path.resolve(
          import.meta.dirname,
          '..',
          '..',
          'attached_assets',
        ),
      },
      dedupe: ['react', 'react-dom'],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, 'dist/public'),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: true,
      fs: {
        strict: true,
      },
      proxy: {
        '/api': {
          target: `http://localhost:${env.API_SERVER_PORT ?? '8080'}`,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
