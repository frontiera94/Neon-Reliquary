import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useSessionStore } from '../store/useSessionStore'
import { useSyncStore } from '../store/useSyncStore'
import {
  createSessionSyncController,
  DIRTY_STORAGE_KEY,
  readDirtyMap,
} from './session-sync'
import {
  handleSessionsRequest,
  getDatabaseUrl,
  type ApiResponse,
  type SqlTagFn,
} from '../../api/sessions'

function resetAll() {
  localStorage.clear()
  useSessionStore.setState({ sessions: {} })
  useSyncStore.getState().resetSyncState()
}

function createMockRes() {
  let statusCode = 200
  let jsonBody: unknown = undefined
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
        end: () => {},
      }
    },
  }

  return {
    res,
    getStatus: () => statusCode,
    getJson: () => jsonBody,
    getHeaders: () => headers,
  }
}

describe('api/sessions serverless handler', () => {
  it('resolves database URL from DATABASE_URL, POSTGRES_URL, or NEON_DATABASE_URL', () => {
    expect(getDatabaseUrl({})).toBeNull()
    expect(getDatabaseUrl({ DATABASE_URL: '  postgres://neon/db  ' })).toBe('postgres://neon/db')
    expect(getDatabaseUrl({ POSTGRES_URL: 'postgres://vercel/db' })).toBe('postgres://vercel/db')
    expect(getDatabaseUrl({ NEON_DATABASE_URL: 'postgres://custom/db' })).toBe('postgres://custom/db')
  })

  it('returns 503 configured=false when no database URL is present', async () => {
    const mock = createMockRes()
    await handleSessionsRequest({ method: 'GET' }, mock.res, { env: {} })
    expect(mock.getStatus()).toBe(503)
    expect(mock.getJson()).toEqual({
      configured: false,
      error: 'Database not configured (missing DATABASE_URL)',
    })
  })

  it('returns saved character sessions on GET', async () => {
    const queries: string[] = []
    const fakeSql: SqlTagFn = async (strings) => {
      const q = strings.join('?')
      queries.push(q)
      if (q.includes('SELECT')) {
        return [
          {
            character_id: 'mazikeen-noctis',
            state: { characterId: 'mazikeen-noctis', currentHp: 14, tempHp: 5 },
            updated_at_ms: '1761330000000',
          },
        ]
      }
      return []
    }

    const mock = createMockRes()
    await handleSessionsRequest({ method: 'GET' }, mock.res, { sql: fakeSql })

    expect(mock.getStatus()).toBe(200)
    expect(queries.some((q) => q.includes('CREATE TABLE IF NOT EXISTS'))).toBe(true)
    expect(mock.getJson()).toEqual({
      configured: true,
      sessions: {
        'mazikeen-noctis': {
          state: { characterId: 'mazikeen-noctis', currentHp: 14, tempHp: 5 },
          updatedAt: 1761330000000,
        },
      },
    })
  })

  it('upserts character sessions in batch on PUT and rejects malformed payloads', async () => {
    const capturedValues: unknown[] = []
    const fakeSql: SqlTagFn = async (strings, ...values) => {
      const q = strings.join('?')
      if (q.includes('INSERT INTO character_sessions')) {
        capturedValues.push(...values)
        return [{ character_id: 'agelmund', updated_at_ms: 1761330050000 }]
      }
      return []
    }

    // Invalid body -> 400
    const badRes = createMockRes()
    await handleSessionsRequest(
      { method: 'PUT', body: '{not-valid-json' },
      badRes.res,
      { sql: fakeSql }
    )
    expect(badRes.getStatus()).toBe(400)

    // Valid PUT -> 200
    const okRes = createMockRes()
    await handleSessionsRequest(
      {
        method: 'PUT',
        body: JSON.stringify({
          sessions: {
            agelmund: { characterId: 'agelmund', currentHp: 19, nonlethalDamage: 4 },
          },
        }),
      },
      okRes.res,
      { sql: fakeSql }
    )

    expect(okRes.getStatus()).toBe(200)
    expect(okRes.getJson()).toEqual({
      ok: true,
      updated: { agelmund: 1761330050000 },
    })
    expect(capturedValues).toHaveLength(1)
    const parsedBatch = JSON.parse(String(capturedValues[0])) as Array<{
      character_id: string
      state: { currentHp: number; nonlethalDamage: number }
    }>
    expect(parsedBatch[0].character_id).toBe('agelmund')
    expect(parsedBatch[0].state.currentHp).toBe(19)
  })

  it('rejects unsupported HTTP methods with 405', async () => {
    const mock = createMockRes()
    await handleSessionsRequest({ method: 'DELETE' }, mock.res, { env: {} })
    expect(mock.getStatus()).toBe(405)
  })
})

describe('session-sync client controller', () => {
  beforeEach(() => {
    resetAll()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hydrates saved character HP from Neon DB without echoing a PUT request', async () => {
    const calls: Array<{ method: string; body?: unknown }> = []
    const fakeFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      calls.push({ method, body: init?.body ? JSON.parse(String(init.body)) : undefined })
      return new Response(
        JSON.stringify({
          configured: true,
          sessions: {
            'mazikeen-noctis': {
              state: {
                characterId: 'mazikeen-noctis',
                currentHp: 11,
                tempHp: 4,
                nonlethalDamage: 0,
                spentResources: { 'arcane-pool': 2 },
                activeBuffIds: ['buff-shield-spell'],
                conditions: ['shaken'],
                preparedSpellIds: [],
                spentSpellSlots: { 1: 2 },
                ammo: {},
                activeSummon: null,
                itemQuantities: {},
                coins: { gp: 85, sp: 0, cp: 0 },
              },
              updatedAt: 1761330000000,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }) as unknown as typeof fetch

    const controller = createSessionSyncController({ debounceMs: 100, fetchImpl: fakeFetch })
    await controller.pullRemoteSessions()

    const hydrated = useSessionStore.getState().getSession('mazikeen-noctis')
    expect(hydrated.currentHp).toBe(11)
    expect(hydrated.tempHp).toBe(4)
    expect(hydrated.spentSpellSlots[1]).toBe(2)
    expect(hydrated.conditions).toEqual(['shaken'])
    expect(useSyncStore.getState().status).toBe('synced')

    await vi.advanceTimersByTimeAsync(500)
    expect(calls).toHaveLength(1)
    expect(calls[0].method).toBe('GET')

    controller.stop()
  })

  it('does not let a pre-pull initSession overwrite saved HP arriving from Neon DB', async () => {
    const fakeFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      if (method === 'GET') {
        return new Response(
          JSON.stringify({
            configured: true,
            sessions: {
              knam: {
                state: {
                  characterId: 'knam',
                  currentHp: 7,
                  tempHp: 0,
                  nonlethalDamage: 0,
                  spentResources: {},
                  activeBuffIds: [],
                  conditions: [],
                  preparedSpellIds: [],
                  spentSpellSlots: {},
                  ammo: {},
                  activeSummon: null,
                  itemQuantities: {},
                  coins: { gp: 10, sp: 0, cp: 0 },
                },
                updatedAt: 1761330000000,
              },
            },
          }),
          { status: 200 }
        )
      }
      return new Response(JSON.stringify({ ok: true, updated: {} }), { status: 200 })
    }) as unknown as typeof fetch

    const controller = createSessionSyncController({ debounceMs: 100, fetchImpl: fakeFetch })

    // User clicks Manifest Character (maxHp = 45) BEFORE initial GET completes
    useSessionStore.getState().initSession('knam', 45)
    expect(useSessionStore.getState().getSession('knam').currentHp).toBe(45)

    // Initial GET resolves with saved 7 HP from previous session
    await controller.pullRemoteSessions()
    expect(useSessionStore.getState().getSession('knam').currentHp).toBe(7)

    controller.stop()
  })

  it('debounces rapid HP and resource changes into a single PUT to Neon DB', async () => {
    const putPayloads: Array<Record<string, { currentHp: number }>> = []
    const fakeFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      if (method === 'GET') {
        return new Response(JSON.stringify({ configured: true, sessions: {} }), { status: 200 })
      }
      const parsed = JSON.parse(String(init?.body)) as {
        sessions: Record<string, { currentHp: number }>
      }
      putPayloads.push(parsed.sessions)
      return new Response(JSON.stringify({ ok: true, updated: {} }), { status: 200 })
    }) as unknown as typeof fetch

    const controller = createSessionSyncController({ debounceMs: 250, fetchImpl: fakeFetch })
    await controller.pullRemoteSessions()

    useSessionStore.getState().initSession('mariano-cardamomo', 39)
    useSessionStore.getState().applyDamage('mariano-cardamomo', 10, 16)
    useSessionStore.getState().applyDamage('mariano-cardamomo', 6, 16)

    expect(useSyncStore.getState().status).toBe('syncing')
    expect(putPayloads).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(300)

    expect(putPayloads).toHaveLength(1)
    expect(putPayloads[0]['mariano-cardamomo'].currentHp).toBe(23)
    expect(useSyncStore.getState().status).toBe('synced')
    expect(readDirtyMap()).toEqual({})

    controller.stop()
  })

  it('queues changes locally while offline and preserves them over older server data until synced', async () => {
    let isOnline = false
    const serverDb: Record<string, { state: unknown; updatedAt: number }> = {
      noorie: {
        state: {
          characterId: 'noorie',
          currentHp: 34,
          tempHp: 0,
          nonlethalDamage: 0,
          spentResources: {},
          activeBuffIds: [],
          conditions: [],
          preparedSpellIds: [],
          spentSpellSlots: {},
          ammo: {},
          activeSummon: null,
          itemQuantities: {},
          coins: { gp: 0, sp: 0, cp: 0 },
        },
        updatedAt: 1000,
      },
    }

    const fakeFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!isOnline) {
        throw new Error('Network unreachable')
      }
      const method = init?.method ?? 'GET'
      if (method === 'GET') {
        return new Response(JSON.stringify({ configured: true, sessions: serverDb }), {
          status: 200,
        })
      }
      const parsed = JSON.parse(String(init?.body)) as {
        sessions: Record<string, { currentHp: number }>
      }
      for (const [id, st] of Object.entries(parsed.sessions)) {
        serverDb[id] = { state: st, updatedAt: Date.now() }
      }
      return new Response(JSON.stringify({ ok: true, updated: {} }), { status: 200 })
    }) as unknown as typeof fetch

    vi.setSystemTime(new Date(5000))
    useSessionStore.getState().initSession('noorie', 34)

    const controller = createSessionSyncController({ debounceMs: 100, fetchImpl: fakeFetch })
    await controller.pullRemoteSessions()
    expect(useSyncStore.getState().status).toBe('offline')

    // Player takes damage while offline -> HP drops to 18
    useSessionStore.getState().setHp('noorie', 18)
    await vi.advanceTimersByTimeAsync(150)

    expect(useSyncStore.getState().status).toBe('offline')
    expect(localStorage.getItem(DIRTY_STORAGE_KEY)).toBeTruthy()

    // Connection returns -> syncNow pushes 18 HP and does NOT overwrite with old 34 HP
    isOnline = true
    await controller.syncNow()

    expect(useSessionStore.getState().getSession('noorie').currentHp).toBe(18)
    expect((serverDb.noorie.state as { currentHp: number }).currentHp).toBe(18)
    expect(useSyncStore.getState().status).toBe('synced')
    expect(readDirtyMap()).toEqual({})

    controller.stop()
  })

  it('switches cleanly to unconfigured mode on HTTP 503', async () => {
    const fakeFetch = vi.fn(async () => {
      return new Response(JSON.stringify({ configured: false }), { status: 503 })
    }) as unknown as typeof fetch

    const controller = createSessionSyncController({ debounceMs: 100, fetchImpl: fakeFetch })
    await controller.pullRemoteSessions()

    expect(useSyncStore.getState().status).toBe('unconfigured')

    // Local mutations still work smoothly without firing PUT retries
    useSessionStore.getState().initSession('shotrix-blackburn', 40)
    useSessionStore.getState().setHp('shotrix-blackburn', 25)
    await vi.advanceTimersByTimeAsync(300)

    expect(useSessionStore.getState().getSession('shotrix-blackburn').currentHp).toBe(25)
    expect(fakeFetch).toHaveBeenCalledTimes(1)

    controller.stop()
  })
})
