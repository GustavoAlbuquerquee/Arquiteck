import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'favicon-96x96.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Arquiteck Vistorias',
        short_name: 'Arquiteck',
        description: 'Sistema de gestão de vistorias, checklists e entrega de obras de marcenaria',
        theme_color: '#603829',
        background_color: '#ffffff',
        orientation: 'portrait',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Fontes self-hosted: só os subconjuntos latinos, para o app funcionar offline
        // com a tipografia certa sem precachear cirílico/vietnamita
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,webp}', '**/*-latin-*.woff2'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        // Apenas arquivos públicos do Storage (logos). Fotos e assinaturas ficam
        // no bucket privado e usam URLs assinadas, que não entram neste cache.
        // Respostas da API (REST/Auth) não são cacheadas: a chave do cache é só a URL,
        // então dados de um usuário poderiam ser servidos a outro no mesmo aparelho.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dias
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000
  }
});
