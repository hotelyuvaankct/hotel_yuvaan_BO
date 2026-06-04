import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const baseFromEnv = env.VITE_BASE ?? process.env.VITE_BASE ?? '/';
  const base = baseFromEnv.endsWith('/') ? baseFromEnv : baseFromEnv + '/';

  return {
    base,
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});