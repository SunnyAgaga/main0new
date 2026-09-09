import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';


export default defineConfig(async ({ mode }) => {
  // Loads `.env` from this package's directory so `pnpm dev` works without
  // manually exporting/sourcing environment variables first. Real process
  // Load the repo-root .env (the backend reads the same file). Prefix '' means
  // all keys, not just VITE_*. Real environment variables win over the file.
  const env = { ...loadEnv(mode, path.resolve(import.meta.dirname, '..'), ''), ...process.env };

  // The dev server's own port. Deliberately NOT `PORT` - that is the backend's
  // port in the shared root .env, and reusing it makes the two collide.
  const port = Number(env.FRONTEND_PORT ?? 5173);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid FRONTEND_PORT value: "${env.FRONTEND_PORT}"`);
  }

  // Where to proxy /api. Falls back to the backend's PORT from the root .env.
  const apiPort = env.API_SERVER_PORT ?? env.PORT ?? '8080';

  // Path the app is served from; '/' for a root domain.
  const basePath = env.BASE_PATH ?? '/';

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
          target: `http://localhost:${apiPort}`,
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
