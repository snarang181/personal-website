import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { tiledDark } from './src/shiki-theme.js';

export default defineConfig({
  site: 'https://samarthnarang.com',
  integrations: [sitemap()],

  // The old Hugo slug used an underscore; keep the published URL alive.
  redirects: {
    '/tiled-thoughts/posts/mlir_for_llvm': '/tiled-thoughts/posts/mlir-for-llvm',
  },

  // Self-hosted, subsetted, with auto-generated metric fallbacks so swapping in
  // the real face causes no layout shift.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-mono',
      weights: [400, 500, 600],
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
    },
    {
      provider: fontProviders.google(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-sans',
      weights: [400, 500, 600],
      fallbacks: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    },
  ],

  markdown: {
    shikiConfig: {
      theme: tiledDark,
      wrap: false,
      // Shiki ships no MLIR grammar; LLVM IR is the closest structural match
      // and highlights MLIR acceptably.
      langAlias: { mlir: 'llvm', tablegen: 'llvm' },
    },
  },
});
