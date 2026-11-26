import { describe, it, expect, beforeEach } from 'vitest'
import { handleMapsRequest, resetMemoryMaps } from '../../api/maps'
import type { ApiRequest, ApiResponse, SqlTagFn } from '../../api/sessions'
import type { TacticalMapState, TacticalMapSummary } from '../../src/types/map'

interface CapturedResponse {
  statusCode: number
  body: Record<string, unknown>
}

async function invokeMaps(
  req: ApiRequest,
  sql?: SqlTagFn
): Promise<CapturedResponse> {
  let statusCode = 200
  let body: Record<string, unknown> = {}

  const res: ApiResponse = {
    setHeader: () => {},
    status: (code: number) => {
      statusCode = code
      return {
        json: (payload: unknown) => {
          body = (payload ?? {}) as Record<string, unknown>
        },
        end: () => {},
      }
    },
  }

  await handleMapsRequest(req, res, { env: {}, sql })
  return { statusCode, body }
}

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

describe('/api/maps — Library CRUD, Player Permissions & Enemy Redaction', () => {
  beforeEach(() => {
    resetMemoryMaps()
  })

  it('allows Master to create multiple maps, switch active map, cache image separately, and delete maps', async () => {
    // Players cannot create maps
    const forbiddenCreate = await invokeMaps({
      method: 'POST',
      body: { role: 'player', name: 'Hack Map' },
    })
    expect(forbiddenCreate.statusCode).toBe(403)

    // Master creates Map 1 (active by default) with image
    const create1 = await invokeMaps({
      method: 'POST',
      body: {
        role: 'master',
        name: 'Cripta Livello 1',
        imageData: TINY_PNG,
        imageWidth: 1200,
        imageHeight: 800,
        setActive: true,
      },
    })
    expect(create1.statusCode).toBe(201)
    const map1 = create1.body.map as TacticalMapState
    expect(map1.isActive).toBe(true)
    expect(map1.imageHash).not.toBe('blank')
    expect(map1.imageData).toBeUndefined() // omitted unless includeImage=1

    // Master creates Map 2 (prepared in advance, not active yet)
    const create2 = await invokeMaps({
      method: 'POST',
      body: {
        role: 'master',
        name: 'Sala del Trono',
        setActive: false,
      },
    })
    expect(create2.statusCode).toBe(201)
    const map2 = create2.body.map as TacticalMapState
    expect(map2.isActive).toBe(false)

    // Library list requires master role
    const playerList = await invokeMaps({ method: 'GET', url: '/api/maps?list=1&role=player' })
    expect(playerList.statusCode).toBe(403)

    const masterList = await invokeMaps({ method: 'GET', url: '/api/maps?list=1&role=master' })
    expect(masterList.statusCode).toBe(200)
    const summaries = masterList.body.maps as TacticalMapSummary[]
    expect(summaries).toHaveLength(2)

    // Player cannot fetch non-active Map 2 directly
    const inactivePeek = await invokeMaps({
      method: 'GET',
      url: `/api/maps?id=${map2.id}&role=player`,
    })
    expect(inactivePeek.statusCode).toBe(403)

    // Player fetches active map (gets Map 1 without image, then fetches cached image once)
    const activePoll = await invokeMaps({
      method: 'GET',
      url: '/api/maps?active=1&role=player',
    })
    expect((activePoll.body.map as TacticalMapState).id).toBe(map1.id)

    const unchangedPoll = await invokeMaps({
      method: 'GET',
      url: `/api/maps?active=1&role=player&since=${map1.updatedAt}`,
    })
    expect(unchangedPoll.body.unchanged).toBe(true)

    const withImage = await invokeMaps({
      method: 'GET',
      url: `/api/maps?id=${map1.id}&role=player&includeImage=1`,
    })
    expect((withImage.body.map as TacticalMapState).imageData).toBe(TINY_PNG)

    // Master broadcasts Map 2 to players
    const broadcast2 = await invokeMaps({
      method: 'PATCH',
      body: { role: 'master', action: 'setActive', mapId: map2.id },
    })
    expect(broadcast2.statusCode).toBe(200)

    const activeAfterSwitch = await invokeMaps({
      method: 'GET',
      url: '/api/maps?active=1&role=player',
    })
    expect((activeAfterSwitch.body.map as TacticalMapState).id).toBe(map2.id)

    // Delete Map 1
    const del1 = await invokeMaps({
      method: 'DELETE',
      url: `/api/maps?id=${map1.id}&role=master`,
    })
    expect(del1.statusCode).toBe(200)
  })

  it('permits any player to move & rotate ALL allied tokens, blocks walls/closed doors & enemy edits, and redacts hidden enemies', async () => {
    const createRes = await invokeMaps({
      method: 'POST',
      body: {
        role: 'master',
        name: 'Prigione',
        grid: { cols: 12, rows: 10, visionRangeCells: 6 },
        walls: [
          { id: 'w1', x1: 5, y1: 0, x2: 5, y2: 3, kind: 'wall' },
          { id: 'd1', x1: 5, y1: 3, x2: 5, y2: 4, kind: 'door', open: false },
          { id: 'w2', x1: 5, y1: 4, x2: 5, y2: 10, kind: 'wall' },
        ],
        tokens: [
          {
            id: 'pc_shotrix',
            type: 'pc',
            characterId: 'shotrix-blackburn',
            name: 'Shotrix',
            label: 'SH',
            color: 'cyan',
            col: 2,
            row: 3,
            size: 1,
            facingDeg: 0,
          },
          {
            id: 'pc_knam',
            type: 'pc',
            characterId: 'knam',
            name: 'Knam',
            label: 'KN',
            color: 'crimson',
            col: 1,
            row: 1,
            size: 1,
            facingDeg: 90,
          },
          {
            id: 'en_guard',
            type: 'enemy',
            name: 'Guardia',
            label: 'GU',
            color: 'crimson',
            col: 6,
            row: 3,
            size: 1,
            facingDeg: 180,
            currentHp: 10,
            maxHp: 25,
            isHidden: false,
          },
          {
            id: 'en_stalker',
            type: 'enemy',
            name: 'Ombra',
            label: 'OM',
            color: 'violet',
            col: 3,
            row: 3,
            size: 1,
            facingDeg: 180,
            currentHp: 18,
            maxHp: 18,
            isHidden: true,
          },
        ],
      },
    })
    const mapId = (createRes.body.map as TacticalMapState).id

    // Player moves ANOTHER player's character (Knam) freely within room -> ALLOWED!
    const moveKnam = await invokeMaps({
      method: 'PATCH',
      body: {
        role: 'player',
        action: 'moveToken',
        mapId,
        tokenId: 'pc_knam',
        col: 3,
        row: 2,
      },
    })
    expect(moveKnam.statusCode).toBe(200)
    const afterKnam = moveKnam.body.map as TacticalMapState
    expect(afterKnam.tokens.find((t) => t.id === 'pc_knam')?.col).toBe(3)
    // Both enemies hidden right now (Guardia behind closed door, Ombra isHidden=true)
    expect(afterKnam.tokens.filter((t) => t.type === 'enemy')).toHaveLength(0)

    // Player attempts to move Shotrix THROUGH the closed door -> REJECTED (400)!
    const illegalWallJump = await invokeMaps({
      method: 'PATCH',
      body: {
        role: 'player',
        action: 'moveToken',
        mapId,
        tokenId: 'pc_shotrix',
        col: 7,
        row: 3,
      },
    })
    expect(illegalWallJump.statusCode).toBe(400)

    // Player attempts to move Enemy token -> FORBIDDEN (403)!
    const illegalEnemyMove = await invokeMaps({
      method: 'PATCH',
      body: {
        role: 'player',
        action: 'moveToken',
        mapId,
        tokenId: 'en_guard',
        col: 8,
        row: 3,
      },
    })
    expect(illegalEnemyMove.statusCode).toBe(403)

    // Player attempts Master updateMap action -> FORBIDDEN (403)!
    const illegalMasterPatch = await invokeMaps({
      method: 'PATCH',
      body: { role: 'player', action: 'fogOverride', mapId, mode: 'reset' },
    })
    expect(illegalMasterPatch.statusCode).toBe(403)

    // Master opens door d1
    const openDoor = await invokeMaps({
      method: 'PATCH',
      body: {
        role: 'master',
        action: 'updateMap',
        mapId,
        walls: [
          { id: 'w1', x1: 5, y1: 0, x2: 5, y2: 3, kind: 'wall' },
          { id: 'd1', x1: 5, y1: 3, x2: 5, y2: 4, kind: 'door', open: true },
          { id: 'w2', x1: 5, y1: 4, x2: 5, y2: 10, kind: 'wall' },
        ],
      },
    })
    expect(openDoor.statusCode).toBe(200)

    // Now Shotrix's East-facing cone sees through open door -> Guardia appears with redacted wounded status, Ombra stays hidden!
    const playerAfterOpen = await invokeMaps({
      method: 'GET',
      url: '/api/maps?active=1&role=player',
    })
    const visibleEnemies = (playerAfterOpen.body.map as TacticalMapState).tokens.filter(
      (t) => t.type === 'enemy'
    )
    expect(visibleEnemies).toHaveLength(1)
    expect(visibleEnemies[0].id).toBe('en_guard')
    expect(visibleEnemies[0].healthStatus).toBe('wounded')
    expect(visibleEnemies[0].currentHp).toBeUndefined()

    // Player sends shared ping & rotates Knam
    const rotateRes = await invokeMaps({
      method: 'PATCH',
      body: { role: 'player', action: 'rotateToken', mapId, tokenId: 'pc_knam', facingDeg: 0 },
    })
    expect(rotateRes.statusCode).toBe(200)

    const pingRes = await invokeMaps({
      method: 'PATCH',
      body: { role: 'player', action: 'sendPing', mapId, col: 6, row: 3, senderName: 'Shotrix' },
    })
    expect(pingRes.statusCode).toBe(200)
    expect((pingRes.body.map as TacticalMapState).pings).toHaveLength(1)

    // Master fog overrides (reveal / hide / reset)
    const fogReveal = await invokeMaps({
      method: 'PATCH',
      body: { role: 'master', action: 'fogOverride', mapId, mode: 'reveal', cells: ['10,8'] },
    })
    expect(fogReveal.statusCode).toBe(200)
    expect((fogReveal.body.map as TacticalMapState).fog.manualRevealedCells).toContain('10,8')

    const fogReset = await invokeMaps({
      method: 'PATCH',
      body: { role: 'master', action: 'fogOverride', mapId, mode: 'reset' },
    })
    expect(fogReset.statusCode).toBe(200)
    expect((fogReset.body.map as TacticalMapState).fog.manualRevealedCells).toHaveLength(0)
  })

  it('executes SQL queries cleanly when Neon SqlTagFn is injected', async () => {
    const executedQueries: string[] = []
    const mockSql: SqlTagFn = async (strings) => {
      const q = strings.join('?')
      executedQueries.push(q)
      if (q.includes('INSERT INTO tactical_maps')) {
        return [
          {
            id: 'map_sql1',
            name: 'Neon Dungeon',
            is_active: true,
            image_hash: 'blank',
            image_width: 1600,
            image_height: 1000,
            state: {
              grid: { cols: 20, rows: 15, offsetX: 0, offsetY: 0, cellSizePx: 64, gridOpacity: 0.35, visionRangeCells: 8, coneAngleDeg: 90 },
              walls: [],
              tokens: [],
              fog: { exploredCells: [], manualRevealedCells: [], manualHiddenCells: [] },
              pings: [],
            },
            created_at_ms: 1000,
            updated_at_ms: 1000,
          },
        ]
      }
      return []
    }

    const res = await invokeMaps(
      { method: 'POST', body: { role: 'master', name: 'Neon Dungeon', setActive: true } },
      mockSql
    )
    expect(res.statusCode).toBe(201)
    expect(executedQueries.some((q) => q.includes('CREATE TABLE IF NOT EXISTS tactical_maps'))).toBe(
      true
    )
    expect(executedQueries.some((q) => q.includes('INSERT INTO tactical_maps'))).toBe(true)
  })
})
