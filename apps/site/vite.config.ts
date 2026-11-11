import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

/** The site is served from the repository's GitHub Pages path, not the domain root. */
const PAGES_BASE = '/livro-caixa/';

/** The app's dev server pins :5173, so the site takes the next port and both can run together. */
const DEV_PORT = 5174;

export default defineConfig({
  base: PAGES_BASE,
  server: { port: DEV_PORT, strictPort: true },
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
