import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  handleSessionsRequest,
  getDatabaseUrl,
  MAX_SESSION_BATCH,
  MAX_SESSION_JSON_BYTES,
  type ApiResponse,
  type SqlTagFn,
} from '../../api/sessions'

function createMockRes() {
  let statusCode = 200
  let jsonBody: unknown = undefined
  let ended = false
  const headers: Record<string, string> = {}

  const res: ApiResponse = {
    setHeader: (name, value) => {
      headers[name] = value
    },
    status: (code) => {
      statusCode = code
      return {
        json: (payload) => {
          jsonBody = payload
        },
        end: () => {
          ended = true
        },
      }
    },
  }

  return {
    res,
    getStatus: () => statusCode,
    getJson: () => jsonBody,
    getHeaders: () => headers,
    isEnded: () => ended,
  }
}

describe('api/sessions serverless handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves database URL from supported environment variables', () => {
    expect(getDatabaseUrl({})).toBeNull()
    expect(getDatabaseUrl({ DATABASE_URL: '  postgres://a  ' })).toBe('postgres://a')
    expect(getDatabaseUrl({ POSTGRES_URL: 'postgres://b' })).toBe('postgres://b')
    expect(getDatabaseUrl({ NEON_DATABASE_URL: 'postgres://c' })).toBe('postgres://c')
  })

  it('handles OPTIONS preflight and rejects unsupported HTTP methods', async () => {
    const opt = createMockRes()
    await handleSessionsRequest({ method: 'OPTIONS' }, opt.res)
    expect(opt.getStatus()).toBe(204)
    expect(opt.isEnded()).toBe(true)

    const del = createMockRes()
    await handleSessionsRequest({ method: 'DELETE' }, del.res)
    expect(del.getStatus()).toBe(405)
  })

  it('returns 503 when database URL is not configured', async () => {
    const mock = createMockRes()
    await handleSessionsRequest({ method: 'GET' }, mock.res, { env: {} })
    expect(mock.getStatus()).toBe(503)
    expect((mock.getJson() as { configured: boolean }).configured).toBe(false)
  })

  it('returns parsed sessions on GET and skips malformed rows', async () => {
    const sql: SqlTagFn = vi
      .fn()
      .mockResolvedValueOnce([]) // CREATE TABLE IF NOT EXISTS
      .mockResolvedValueOnce([
        {
          character_id: 'agelmund',
          state: JSON.stringify({ currentHp: 38 }),
          updated_at_ms: '1700000000000',
        },
        {
          character_id: 'knam',
          state: { currentHp: 45 },
          updated_at_ms: 1700000001000,
        },
        {
          character_id: '',
          state: {},
          updated_at_ms: 1700000002000,
        },
      ])

    const mock = createMockRes()
    await handleSessionsRequest({ method: 'GET' }, mock.res, { sql })
    expect(mock.getStatus()).toBe(200)
    const body = mock.getJson() as {
      configured: boolean
      sessions: Record<string, { state: { currentHp: number }; updatedAt: number }>
    }
    expect(body.configured).toBe(true)
    expect(body.sessions.agelmund.state.currentHp).toBe(38)
    expect(body.sessions.knam.state.currentHp).toBe(45)
    expect(Object.keys(body.sessions)).toHaveLength(2)
  })

  it('validates JSON body and batch/size limits on PUT/POST', async () => {
    const sql: SqlTagFn = vi.fn().mockResolvedValue([])

    const badJson = createMockRes()
    await handleSessionsRequest({ method: 'PUT', body: '{bad' }, badJson.res, { sql })
    expect(badJson.getStatus()).toBe(400)

    const badShape = createMockRes()
    await handleSessionsRequest({ method: 'PUT', body: { foo: 'bar' } }, badShape.res, { sql })
    expect(badShape.getStatus()).toBe(400)

    const tooMany: Record<string, Record<string, unknown>> = {}
    for (let i = 0; i <= MAX_SESSION_BATCH; i++) {
      tooMany[`char-${i}`] = { currentHp: 10 }
    }
    const batchMock = createMockRes()
    await handleSessionsRequest({ method: 'POST', body: { sessions: tooMany } }, batchMock.res, { sql })
    expect(batchMock.getStatus()).toBe(400)

    const hugeMock = createMockRes()
    await handleSessionsRequest(
      {
        method: 'PUT',
        body: { sessions: { hero: { notes: 'x'.repeat(MAX_SESSION_JSON_BYTES) } } },
      },
      hugeMock.res,
      { sql }
    )
    expect(hugeMock.getStatus()).toBe(400)
  })

  it('upserts valid sessions and returns updated timestamps', async () => {
    const sql: SqlTagFn = vi
      .fn()
      .mockResolvedValueOnce([]) // CREATE TABLE
      .mockResolvedValueOnce([{ character_id: 'agelmund', updated_at_ms: 1700000005000 }])

    const mock = createMockRes()
    await handleSessionsRequest(
      { method: 'PUT', body: { sessions: { agelmund: { currentHp: 42 } } } },
      mock.res,
      { sql }
    )
    expect(mock.getStatus()).toBe(200)
    expect(mock.getJson()).toEqual({ ok: true, updated: { agelmund: 1700000005000 } })
  })

  it('hides SQL error details in production and includes them in development', async () => {
    const failingSql: SqlTagFn = vi.fn().mockRejectedValue(new Error('secret connection string'))

    const prodMock = createMockRes()
    await handleSessionsRequest({ method: 'GET' }, prodMock.res, {
      sql: failingSql,
      env: { NODE_ENV: 'production' },
    })
    expect(prodMock.getStatus()).toBe(500)
    expect((prodMock.getJson() as { detail?: string }).detail).toBeUndefined()

    const devMock = createMockRes()
    await handleSessionsRequest({ method: 'GET' }, devMock.res, {
      sql: failingSql,
      env: { NODE_ENV: 'development' },
    })
    expect(devMock.getStatus()).toBe(500)
    expect((devMock.getJson() as { detail?: string }).detail).toContain('secret connection string')
  })
})
