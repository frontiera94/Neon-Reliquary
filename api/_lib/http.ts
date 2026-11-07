import type { IncomingMessage, ServerResponse } from 'node:http'

export interface ApiRequest {
  method?: string
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
}

export interface ApiResponse {
  setHeader?: (name: string, value: string) => void
  status: (code: number) => {
    json: (payload: unknown) => void
    end?: () => void
  }
}

export function setNoStoreHeaders(res: ApiResponse): void {
  res.setHeader?.('Cache-Control', 'no-store')
}

export function handleOptionsPreflight(req: ApiRequest, res: ApiResponse): boolean {
  if (req.method === 'OPTIONS') {
    res.setHeader?.('Access-Control-Allow-Origin', '*')
    res.setHeader?.('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
    const statusRes = res.status(204)
    if (statusRes.end) statusRes.end()
    else statusRes.json({})
    return true
  }
  return false
}

export function parseJsonBody<T = unknown>(body: unknown): T | null {
  if (body === undefined || body === null) return null
  if (typeof body === 'object') return body as T
  if (typeof body === 'string') {
    if (body.trim().length === 0) return {} as T
    try {
      return JSON.parse(body) as T
    } catch {
      return null
    }
  }
  return null
}

export function readHttpBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', reject)
  })
}

export function sendNodeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  })
  res.end(payload)
}

export function createApiResponseAdapter(res: ServerResponse): ApiResponse {
  return {
    setHeader: (name, value) => res.setHeader(name, value),
    status: (code) => ({
      json: (payload) => sendNodeJson(res, code, payload),
      end: () => {
        res.writeHead(code)
        res.end()
      },
    }),
  }
}
