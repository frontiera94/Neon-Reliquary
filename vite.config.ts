import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

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

export default defineConfig({
  plugins: [react(), tailwindcss(), localMapApiPlugin()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.worktrees/**', '**/dist/**'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
