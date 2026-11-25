import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      workbox: { globPatterns: ['**/*.{js,css,html,png,json,woff2,ogg,wav}'] },
      manifest: {
        name: 'Ninja Phong Ảnh',
        short_name: 'Ninja Phong Ảnh',
        lang: 'vi',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#0b1026',
        theme_color: '#0b1026',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
});
