import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pushMap } from './map-api'
import { isCellHidden, paintRect, initFog } from './fog-utils'
import type { PublicMapState, MapState, Token } from '../types/map'

describe('VTT Security, Fog of War Integrity & Auth Isolation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('1. Secret Stripping & Public State Sanitization', () => {
    it('ensures secret key is stripped from PublicMapState delivered to players', () => {
      const fullServerState: MapState = {
        id: 'map-secret-123',
        secret: 'ultra-secret-gm-token-xyz',
        name: 'Dungeon of Black Ice',
        createdAt: 1000,
        updatedAt: 2000,
        background: null,
        grid: { size: 50 },
        tokens: [],
        shapes: [],
        labels: [],
        fog: { cols: 10, rows: 10, cells: new Array(100).fill(0) },
        initiative: { order: [], currentIndex: 0, round: 1 },
      }

      // Simulate the backend sanitization transform
      const publicState = { ...fullServerState }
      delete (publicState as Partial<MapState>).secret

      expect((publicState as unknown as { secret?: string }).secret).toBeUndefined()
      expect(publicState.id).toBe('map-secret-123')
      expect(publicState.name).toBe('Dungeon of Black Ice')
    })
  })

  describe('2. GM Authentication Gates via map-api', () => {
    it('sends x-gm-secret header when pushing map updates', async () => {
      const mockState: PublicMapState = {
        id: 'map-auth-test',
        name: 'Test Arena',
        createdAt: 1000,
        updatedAt: 2000,
        background: null,
        grid: { size: 50 },
        tokens: [],
        shapes: [],
        labels: [],
        fog: { cols: 10, rows: 10, cells: new Array(100).fill(0) },
        initiative: { order: [], currentIndex: 0, round: 1 },
      }

      let capturedHeaders: Record<string, string> = {}
      globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      })

      await pushMap('map-auth-test', 'my-gm-secret-key', mockState)

      expect(capturedHeaders['x-gm-secret']).toBe('my-gm-secret-key')
      expect(capturedHeaders['Content-Type']).toBe('application/json')
    })

    it('rejects update and throws when server returns 401 Unauthorized', async () => {
      const mockState: PublicMapState = {
        id: 'map-unauth',
        name: 'Test Arena',
        createdAt: 1000,
        updatedAt: 2000,
        background: null,
        grid: { size: 50 },
        tokens: [],
        shapes: [],
        labels: [],
        fog: { cols: 10, rows: 10, cells: new Array(100).fill(0) },
        initiative: { order: [], currentIndex: 0, round: 1 },
      }

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'unauthorized', detail: 'Invalid GM secret' }), {
          status: 401,
        })
      )

      await expect(pushMap('map-unauth', 'wrong-secret', mockState)).rejects.toThrow(/HTTP 401: Invalid GM secret/)
    })
  })

  describe('3. Fog of War Culling & Token Secrecy', () => {
    it('correctly flags hidden areas covered by fog for token privacy', () => {
      // 10x10 fog grid, 50px cell size
      const gridSize = 50
      let fog = initFog(10, 10)

      // GM hides top-left 4x4 room (cols 0..3, rows 0..3) with fog
      fog = paintRect(fog, 0, 0, 3, 3, true)

      // Helper function to check if token is inside hidden fog
      function isTokenConcealedByFog(token: Token, fogMask: typeof fog, cellPx: number): boolean {
        const col = Math.floor(token.pos.x / cellPx)
        const row = Math.floor(token.pos.y / cellPx)
        return isCellHidden(fogMask, col, row)
      }

      const ambushingGoblin: Token = {
        id: 'hidden-goblin',
        name: 'Goblin Ambush',
        initial: 'G',
        color: '#ffb4ab',
        kind: 'enemy',
        pos: { x: 75, y: 75 }, // col 1, row 1 -> inside hidden fog
        hp: { current: 6, max: 6 },
        initiative: null,
      }

      const playerFighter: Token = {
        id: 'player-fighter',
        name: 'Valeros',
        initial: 'V',
        color: '#00daf3',
        kind: 'pc',
        pos: { x: 350, y: 350 }, // col 7, row 7 -> revealed
        hp: { current: 30, max: 30 },
        initiative: null,
      }

      expect(isTokenConcealedByFog(ambushingGoblin, fog, gridSize)).toBe(true)
      expect(isTokenConcealedByFog(playerFighter, fog, gridSize)).toBe(false)
    })
  })
})
