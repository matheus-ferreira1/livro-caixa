import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * React and the router change only on upgrades, so they get their own long-cached chunk.
 * Other libraries are left to Rollup, so each one follows the lazy route that needs it.
 */
const FRAMEWORK_CHUNK = 'framework';
const FRAMEWORK_PACKAGES = new Set(['react', 'react-dom', 'scheduler', 'react-router']);
// Bun installs packages as node_modules/.bun/<pkg>@<version>/node_modules/<pkg>, so take the last match.
const PACKAGE_NAME_PATTERN = /node_modules\/((?:@[^/]+\/)?[^/]+)\//g;

function packageNameOf(moduleId: string): string | undefined {
  return [...moduleId.matchAll(PACKAGE_NAME_PATTERN)].at(-1)?.[1];
}

function chunkFor(moduleId: string): string | undefined {
  const packageName = packageNameOf(moduleId);
  return packageName && FRAMEWORK_PACKAGES.has(packageName) ? FRAMEWORK_CHUNK : undefined;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: chunkFor,
      },
    },
  },
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
