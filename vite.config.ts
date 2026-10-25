import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleSessionsRequest } from './api/sessions'

// ---------------------------------------------------------------------------
// Local dev mock — replaces Vercel Blob + serverless functions when using
// `npm run dev`. Maps are stored in memory; lost on restart, which is fine
// for local testing.
// ---------------------------------------------------------------------------

const devMaps = new Map<string, Record<string, unknown>>()

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

function imageDimensions(dataUrl: string): { width: number; height: number } {
  try {
    const comma = dataUrl.indexOf(',')
    const buf = Buffer.from(dataUrl.slice(comma + 1), 'base64')
    if (buf[0] === 0x89 && buf[1] === 0x50) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
    }
    if (buf[0] === 0xFF && buf[1] === 0xD8) {
      let i = 2
      while (i + 4 < buf.length) {
        if (buf[i] !== 0xFF) break
        const m = buf[i + 1]
        if (m >= 0xC0 && m <= 0xC3) {
          return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) }
        }
        i += 2 + buf.readUInt16BE(i + 2)
      }
    }
  } catch { /* ignore */ }
  return { width: 1920, height: 1080 }
}

function localMapApiPlugin(): Plugin {
  return {
    name: 'local-map-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/maps')) return next()

        const method = req.method ?? ''
        const bgMatch = url.match(/^\/api\/maps\/([^/]+)\/background$/)
        const idMatch = !bgMatch ? url.match(/^\/api\/maps\/([^/]+)$/) : null

        if (url === '/api/maps' && method === 'POST') {
          const { nanoid } = await import('nanoid')
          const id = nanoid(10)
          const secret = nanoid(24)
          let parsedBody: Record<string, unknown> = {}
          try { parsedBody = JSON.parse(await readBody(req)) } catch { /* ignore */ }
          const mapName: string | undefined = typeof parsedBody.name === 'string' && parsedBody.name ? parsedBody.name : undefined
          const gridSize: number = typeof parsedBody.gridSize === 'number' ? parsedBody.gridSize : 50
          devMaps.set(id, {
            id, secret,
            ...(mapName !== undefined ? { name: mapName } : {}),
            createdAt: Date.now(), updatedAt: Date.now(),
            background: null, grid: { size: gridSize },
            tokens: [], shapes: [], labels: [],
            fog: { cols: 20, rows: 15, cells: new Array(300).fill(0) },
            initiative: { order: [], currentIndex: 0, round: 1 },
          })
          return sendJson(res, 201, { id, secret, gmUrl: `/gm/map/${id}`, readOnlyUrl: `/map/${id}` })
        }

        if (idMatch && method === 'GET') {
          const state = devMaps.get(idMatch[1])
          if (!state) return sendJson(res, 404, { error: 'not found' })
          const pub = { ...state }
          delete pub.secret
          return sendJson(res, 200, pub)
        }

        if (idMatch && method === 'PUT') {
          const id = idMatch[1]
          const secret = req.headers['x-gm-secret'] as string
          const state = devMaps.get(id)
          if (!state || state.secret !== secret) return sendJson(res, 401, { error: 'unauthorized' })
          const body = JSON.parse(await readBody(req)) as Record<string, unknown>
          devMaps.set(id, { ...body, id, secret })
          return sendJson(res, 200, { ok: true })
        }

        if (bgMatch && method === 'POST') {
          const id = bgMatch[1]
          const secret = req.headers['x-gm-secret'] as string
          const state = devMaps.get(id)
          if (!state || state.secret !== secret) return sendJson(res, 401, { error: 'unauthorized' })
          const body = JSON.parse(await readBody(req)) as { dataUrl: string }
          const dims = imageDimensions(body.dataUrl)
          state.background = { url: body.dataUrl, ...dims }
          devMaps.set(id, state)
          return sendJson(res, 200, { url: body.dataUrl, ...dims })
        }

        next()
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

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    localMapApiPlugin(),
    localSessionsApiPlugin(),
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
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.worktrees/**', '**/dist/**', '**/dev-dist/**'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
