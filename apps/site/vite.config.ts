import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

/** The site is served from the repository's GitHub Pages path, not the domain root. */
const PAGES_BASE = '/livro-caixa/';

export default defineConfig({
  base: PAGES_BASE,
  plugins: [tailwindcss()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    // The page test parses index.html; its stylesheet and script are Vite's to load, not happy-dom's.
    environmentOptions: {
      happyDOM: {
        settings: {
          disableCSSFileLoading: true,
          disableJavaScriptFileLoading: true,
          handleDisabledFileLoadingAsSuccess: true,
        },
      },
    },
  },
});
