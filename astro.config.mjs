// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  integrations: [react()],

  vite: {
    optimizeDeps: {
      exclude: [
        '@electric-sql/pglite',
        '@bokuweb/zstd-wasm'
      ]
    },
    assetsInclude: [
      '**/*.tar',
      '**/*.tar.br',
    ],
    build: {
      // Ship sourcemaps to prod
      sourcemap: true
    }
  },

  // adapter: cloudflare()
});