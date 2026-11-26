import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleSessionsRequest } from './api/sessions'
import { handleSheetsRequest } from './api/sheets'
import { handleMapsRequest } from './api/maps'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => { data += chunk.toString() })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(payload)
}

function localMapApiPlugin(): Plugin {
  return {
    name: 'local-map-api',
    apply: 'serve',
    configureServer(server) {
      const fileEnv = loadEnv(server.config.mode, process.cwd(), '')
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = (req.url ?? '').split('?')[0]
        if (url !== '/api/maps') return next()

        const rawBody =
          req.method === 'POST' || req.method === 'PATCH' || req.method === 'DELETE' || req.method === 'PUT'
            ? await readBody(req)
            : undefined

        await handleMapsRequest(
          {
            method: req.method,
            url: req.url,
            body: rawBody,
            headers: req.headers,
          },
          {
            setHeader: (name, value) => res.setHeader(name, value),
            status: (code) => ({
              json: (payload) => sendJson(res, code, payload),
              end: () => {
                res.writeHead(code)
                res.end()
              },
            }),
          },
          {
            env: {
              ...fileEnv,
              ...process.env,
            },
          }
        )
      })
    },
  }
}

function localSessionsApiPlugin(): Plugin {
  return {
    name: 'local-sessions-api',
    apply: 'serve',
    configureServer(server) {
      const fileEnv = loadEnv(server.config.mode, process.cwd(), '')
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = (req.url ?? '').split('?')[0]
        if (url !== '/api/sessions') return next()

        const rawBody =
          req.method === 'PUT' || req.method === 'POST'
            ? await readBody(req)
            : undefined

        await handleSessionsRequest(
          {
            method: req.method,
            body: rawBody,
            headers: req.headers,
          },
          {
            setHeader: (name, value) => res.setHeader(name, value),
            status: (code) => ({
              json: (payload) => sendJson(res, code, payload),
              end: () => {
                res.writeHead(code)
                res.end()
              },
            }),
          },
          {
            env: {
              ...fileEnv,
              ...process.env,
            },
          }
        )
      })
    },
  }
}

function localSheetsApiPlugin(): Plugin {
  return {
    name: 'local-sheets-api',
    apply: 'serve',
    configureServer(server) {
      const fileEnv = loadEnv(server.config.mode, process.cwd(), '')
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = (req.url ?? '').split('?')[0]
        if (url !== '/api/sheets') return next()

        const rawBody =
          req.method === 'POST' || req.method === 'PATCH' || req.method === 'DELETE' || req.method === 'PUT'
            ? await readBody(req)
            : undefined

        await handleSheetsRequest(
          {
            method: req.method,
            url: req.url,
            body: rawBody,
            headers: req.headers,
          },
          {
            setHeader: (name, value) => res.setHeader(name, value),
            status: (code) => ({
              json: (payload) => sendJson(res, code, payload),
              end: () => {
                res.writeHead(code)
                res.end()
              },
              send: (data: Buffer | string) => {
                res.writeHead(code)
                res.end(data)
              },
            }),
          },
          {
            env: {
              ...fileEnv,
              ...process.env,
            },
          }
        )
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    localMapApiPlugin(),
    localSessionsApiPlugin(),
    localSheetsApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'apple-touch-icon-180x180.png',
        'pwa-64x64.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png',
        'pdfs/*.pdf',
      ],
      manifest: {
        id: '/',
        name: 'Neon Reliquary',
        short_name: 'Neon Reliquary',
        description:
          'Pathfinder 1e digital tactical companion — automated combat, spell grimoire, resources, and offline play.',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        categories: ['games', 'utilities'],
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Roster Personaggi',
            short_name: 'Personaggi',
            url: '/characters',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Combattimento',
            short_name: 'Combat',
            url: '/combat',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Incantesimi',
            short_name: 'Spells',
            url: '/spells',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,pdf}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/pdfs\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/(placehold\.co|images\.unsplash\.com)\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'external-portraits',
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: !process.env.VITEST,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 15000,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/.worktrees/**',
      '**/dist/**',
      '**/dev-dist/**',
      'tests/e2e/class-mechanics-e2e.test.ts',
    ],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/data/**',
        'src/types/**',
        'src/main.tsx',
        '**/*.d.ts',
      ],
    },
  },
})
