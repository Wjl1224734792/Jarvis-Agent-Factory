import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    {
      ...viteSingleFile({ removeViteModuleLoader: true }),
      apply: 'build' as const,
    },
  ],
  base: '/',
  build: {
    outDir: resolve(__dirname, '..', 'dist', 'web'),
    emptyOutDir: true,
    cssCodeSplit: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3456',
      '/health': 'http://127.0.0.1:3456',
    },
  },
});
