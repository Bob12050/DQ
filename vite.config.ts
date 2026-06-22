import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Relative base so the build works at ANY path/case (GitHub Pages project
// sites are case-sensitive: /DQ/ vs /dq/). Override with BASE_PATH if needed.
const base = process.env.BASE_PATH ?? './';

export default defineConfig({
  base,
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  plugins: [
    VitePWA({
      registerType: 'prompt', // never auto-reload; surface an update prompt instead
      injectRegister: null, // we register the SW ourselves via PwaUpdateService
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg'],
      manifest: {
        name: 'Echoes of Beast',
        short_name: 'EchoesBeast',
        description: 'An original monster-taming turn-based RPG.',
        lang: 'ja',
        theme_color: '#1b1033',
        background_color: '#0b0717',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
