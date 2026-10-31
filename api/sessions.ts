import { neon } from '@neondatabase/serverless'

export interface ApiRequest {
  method?: string
  url?: string
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

export type SqlTagFn = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<Record<string, unknown>[]>

const ensuredUrls = new Set<string>()

export function getDatabaseUrl(
  env: Record<string, string | undefined> = process.env
): string | null {
  const raw =
    env.DATABASE_URL ??
    env.POSTGRES_URL ??
    env.NEON_DATABASE_URL ??
    ''
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function ensureSchema(sql: SqlTagFn, cacheKey?: string): Promise<void> {
  if (cacheKey && ensuredUrls.has(cacheKey)) return
  await sql`
    CREATE TABLE IF NOT EXISTS character_sessions (
      character_id TEXT PRIMARY KEY,
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  if (cacheKey) {
    ensuredUrls.add(cacheKey)
  }
}

export async function handleSessionsRequest(
  req: ApiRequest,
  res: ApiResponse,
  options?: {
    env?: Record<string, string | undefined>
    sql?: SqlTagFn
  }
): Promise<void> {
  res.setHeader?.('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') {
    const statusRes = res.status(204)
    if (statusRes.end) statusRes.end()
    else statusRes.json({})
    return
  }

  if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const dbUrl = options?.sql ? 'injected' : getDatabaseUrl(options?.env)
  if (!dbUrl) {
    res.status(503).json({
      configured: false,
      error: 'Database not configured (missing DATABASE_URL)',
    })
    return
  }

  const sql: SqlTagFn = options?.sql ?? (neon(dbUrl) as unknown as SqlTagFn)

  try {
    await ensureSchema(sql, options?.sql ? undefined : dbUrl)

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT
          character_id,
          state,
          (EXTRACT(EPOCH FROM updated_at) * 1000)::bigint AS updated_at_ms
        FROM character_sessions
      `

      const sessions: Record<string, { state: Record<string, unknown>; updatedAt: number }> = {}
      for (const row of rows) {
        const id = typeof row.character_id === 'string' ? row.character_id : ''
        if (!id) continue
        const parsedState =
          typeof row.state === 'string' ? JSON.parse(row.state) : row.state
        if (!isPlainObject(parsedState)) continue
        const updatedAt = Number(row.updated_at_ms ?? Date.now())
        sessions[id] = {
          state: parsedState,
          updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
        }
      }

      res.status(200).json({ configured: true, sessions })
      return
    }

    // PUT or POST: batch upsert character sessions
    let parsedBody: unknown = req.body
    if (typeof req.body === 'string') {
      try {
        parsedBody = req.body.length > 0 ? JSON.parse(req.body) : {}
      } catch {
        res.status(400).json({ error: 'Invalid JSON body' })
        return
      }
    }

    if (!isPlainObject(parsedBody) || !isPlainObject(parsedBody.sessions)) {
      res.status(400).json({ error: 'Invalid request body: expected { sessions: { ... } }' })
      return
    }

    const entries = Object.entries(parsedBody.sessions).filter(
      ([charId, state]) =>
        charId.trim().length > 0 &&
        charId.length <= 128 &&
        isPlainObject(state)
    )

    if (entries.length === 0) {
      res.status(200).json({ ok: true, updated: {} })
      return
    }

    const recordsetPayload = JSON.stringify(
      entries.map(([characterId, state]) => ({
        character_id: characterId,
        state: { ...(state as Record<string, unknown>), characterId },
      }))
    )

    const upsertedRows = await sql`
      INSERT INTO character_sessions (character_id, state, updated_at)
      SELECT r.character_id, r.state, NOW()
      FROM jsonb_to_recordset(${recordsetPayload}::jsonb)
        AS r(character_id text, state jsonb)
      ON CONFLICT (character_id)
      DO UPDATE SET
        state = EXCLUDED.state,
        updated_at = NOW()
      RETURNING character_id, (EXTRACT(EPOCH FROM updated_at) * 1000)::bigint AS updated_at_ms
    `

    const updated: Record<string, number> = {}
    for (const row of upsertedRows) {
      const id = typeof row.character_id === 'string' ? row.character_id : ''
      if (!id) continue
      const ts = Number(row.updated_at_ms ?? Date.now())
      updated[id] = Number.isFinite(ts) ? ts : Date.now()
    }

    res.status(200).json({ ok: true, updated })
  } catch (err) {
    console.error('Sessions DB handler error:', err)
    res.status(500).json({
      error: 'Database error',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  return handleSessionsRequest(req, res)
}
