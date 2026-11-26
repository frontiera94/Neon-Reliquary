import { createHash } from 'node:crypto'
import { neon } from '@neondatabase/serverless'
import type { ApiRequest, ApiResponse, SqlTagFn } from './sessions'
import type {
  FacingDirectionDeg,
  GridConfig,
  MapFogState,
  MapPing,
  MapToken,
  MapWallSegment,
  TacticalMapState,
  TacticalMapSummary,
  TokenAccentColor,
  TokenSizeCells,
} from '../src/types/map'
import {
  computePartyVisibility,
  filterMapStateForPlayer,
  isCellInBounds,
  isTokenInBounds,
  isValidFacingDeg,
  parseCellKey,
  validatePlayerTokenMove,
} from '../src/lib/battlemap-engine'

export const MAX_MAP_IMAGE_CHARS = 4_200_000 // ~3.1 MB binary in Base64, within Vercel 4.5 MB limit
export const PING_TTL_MS = 8_000
const MAX_PINGS = 12

interface StoredMapStatePayload {
  grid: GridConfig
  walls: MapWallSegment[]
  tokens: MapToken[]
  fog: MapFogState
  pings: MapPing[]
}

interface StoredMapRecord {
  id: string
  name: string
  isActive: boolean
  imageHash: string
  imageData: string
  imageWidth: number
  imageHeight: number
  state: StoredMapStatePayload
  createdAt: number
  updatedAt: number
}

const memoryMaps = new Map<string, StoredMapRecord>()
const ensuredUrls = new Set<string>()

export function resetMemoryMaps(): void {
  memoryMaps.clear()
}

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

function generateId(prefix = 'map'): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`
    }
  } catch {
    // fallback
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`
}

function hashImageData(data: string): string {
  if (!data) return 'blank'
  return createHash('sha256').update(data).digest('hex').slice(0, 16)
}

function isValidImageDataUrl(data: string): boolean {
  if (data === '') return true
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i.test(data)
}

function clampInt(val: unknown, fallback: number, min: number, max: number): number {
  const n = typeof val === 'number' ? Math.round(val) : fallback
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function clampNum(val: unknown, fallback: number, min: number, max: number): number {
  const n = typeof val === 'number' ? val : fallback
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

export function normalizeGridConfig(raw: unknown): GridConfig {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  return {
    cols: clampInt(obj.cols, 24, 4, 80),
    rows: clampInt(obj.rows, 16, 4, 80),
    offsetX: clampNum(obj.offsetX, 0, -2000, 2000),
    offsetY: clampNum(obj.offsetY, 0, -2000, 2000),
    cellSizePx: clampNum(obj.cellSizePx, 64, 12, 512),
    gridOpacity: clampNum(obj.gridOpacity, 0.35, 0, 1),
    visionRangeCells: clampInt(obj.visionRangeCells, 8, 1, 40),
    coneAngleDeg: 90,
  }
}

const VALID_COLORS: readonly TokenAccentColor[] = [
  'cyan',
  'magenta',
  'crimson',
  'violet',
  'amber',
  'emerald',
]

function normalizeWalls(raw: unknown): MapWallSegment[] {
  if (!Array.isArray(raw)) return []
  const clean: MapWallSegment[] = []
  for (const item of raw.slice(0, 1000)) {
    if (typeof item !== 'object' || item === null) continue
    const w = item as Record<string, unknown>
    const x1 = Number(w.x1)
    const y1 = Number(w.y1)
    const x2 = Number(w.x2)
    const y2 = Number(w.y2)
    if (![x1, y1, x2, y2].every(Number.isFinite)) continue
    if (Math.hypot(x2 - x1, y2 - y1) < 1e-3) continue
    const kind = w.kind === 'door' ? 'door' : 'wall'
    clean.push({
      id: typeof w.id === 'string' && w.id.trim() ? w.id.trim().slice(0, 48) : generateId('w'),
      x1,
      y1,
      x2,
      y2,
      kind,
      ...(kind === 'door' ? { open: Boolean(w.open) } : {}),
    })
  }
  return clean
}

function normalizeTokens(raw: unknown, grid: GridConfig): MapToken[] {
  if (!Array.isArray(raw)) return []
  const clean: MapToken[] = []
  for (const item of raw.slice(0, 200)) {
    if (typeof item !== 'object' || item === null) continue
    const t = item as Record<string, unknown>
    const type = t.type === 'pc' || t.type === 'companion' || t.type === 'enemy' ? t.type : 'enemy'
    const sizeRaw = Number(t.size)
    const size: TokenSizeCells = sizeRaw === 2 || sizeRaw === 3 ? sizeRaw : 1
    const col = clampInt(t.col, 0, 0, Math.max(0, grid.cols - size))
    const row = clampInt(t.row, 0, 0, Math.max(0, grid.rows - size))
    const facingDeg: FacingDirectionDeg = isValidFacingDeg(t.facingDeg) ? t.facingDeg : 90
    const color: TokenAccentColor = VALID_COLORS.includes(t.color as TokenAccentColor)
      ? (t.color as TokenAccentColor)
      : type === 'enemy'
        ? 'crimson'
        : 'cyan'
    const name = typeof t.name === 'string' && t.name.trim() ? t.name.trim().slice(0, 64) : 'Token'
    const label =
      typeof t.label === 'string' && t.label.trim()
        ? t.label.trim().slice(0, 4)
        : name.slice(0, 2).toUpperCase()

    const tok: MapToken = {
      id: typeof t.id === 'string' && t.id.trim() ? t.id.trim().slice(0, 64) : generateId('tok'),
      type,
      name,
      label,
      color,
      col,
      row,
      size,
      facingDeg,
    }

    if (typeof t.characterId === 'string' && t.characterId.trim()) {
      tok.characterId = t.characterId.trim().slice(0, 64)
    }
    if (typeof t.companionId === 'string' && t.companionId.trim()) {
      tok.companionId = t.companionId.trim().slice(0, 64)
    }
    if (typeof t.speedFeet === 'number' && Number.isFinite(t.speedFeet)) {
      tok.speedFeet = clampInt(t.speedFeet, 30, 5, 200)
    }
    if (type === 'enemy') {
      const maxHp = clampInt(t.maxHp, 15, 1, 9999)
      const currentHp = clampInt(t.currentHp, maxHp, -100, 9999)
      tok.maxHp = maxHp
      tok.currentHp = currentHp
      tok.isHidden = Boolean(t.isHidden)
    }

    if (isTokenInBounds(tok.col, tok.row, tok.size, grid.cols, grid.rows)) {
      clean.push(tok)
    }
  }
  return clean
}

function normalizeCellKeyList(raw: unknown, grid: GridConfig): string[] {
  if (!Array.isArray(raw)) return []
  const set = new Set<string>()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const parsed = parseCellKey(item)
    if (parsed && isCellInBounds(parsed.col, parsed.row, grid.cols, grid.rows)) {
      set.add(`${parsed.col},${parsed.row}`)
    }
  }
  return Array.from(set)
}

function normalizeFog(raw: unknown, grid: GridConfig): MapFogState {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  return {
    exploredCells: normalizeCellKeyList(obj.exploredCells, grid),
    manualRevealedCells: normalizeCellKeyList(obj.manualRevealedCells, grid),
    manualHiddenCells: normalizeCellKeyList(obj.manualHiddenCells, grid),
  }
}

function pruneActivePings(pings: unknown, grid: GridConfig, now = Date.now()): MapPing[] {
  if (!Array.isArray(pings)) return []
  const valid: MapPing[] = []
  for (const item of pings) {
    if (typeof item !== 'object' || item === null) continue
    const p = item as Record<string, unknown>
    const createdAt = Number(p.createdAt)
    const col = Number(p.col)
    const row = Number(p.row)
    if (!Number.isFinite(createdAt) || now - createdAt > PING_TTL_MS) continue
    if (!isCellInBounds(col, row, grid.cols, grid.rows)) continue
    const color = p.color === 'magenta' || p.color === 'amber' ? p.color : 'cyan'
    valid.push({
      id: typeof p.id === 'string' && p.id ? p.id.slice(0, 48) : generateId('ping'),
      col,
      row,
      senderName:
        typeof p.senderName === 'string' && p.senderName.trim()
          ? p.senderName.trim().slice(0, 32)
          : 'Party',
      color,
      createdAt,
    })
  }
  return valid.slice(-MAX_PINGS)
}

async function ensureMapsSchema(sql: SqlTagFn, cacheKey?: string): Promise<void> {
  if (cacheKey && ensuredUrls.has(cacheKey)) return
  await sql`
    CREATE TABLE IF NOT EXISTS tactical_maps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT FALSE,
      image_hash TEXT NOT NULL DEFAULT 'blank',
      image_data TEXT NOT NULL DEFAULT '',
      image_width INTEGER NOT NULL DEFAULT 1600,
      image_height INTEGER NOT NULL DEFAULT 1000,
      state JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  if (cacheKey) {
    ensuredUrls.add(cacheKey)
  }
}

function parseQuery(req: ApiRequest): Record<string, string> {
  const out: Record<string, string> = {}
  const queryObj = (req as { query?: Record<string, string | string[] | undefined> }).query
  if (queryObj) {
    for (const [k, v] of Object.entries(queryObj)) {
      const val = Array.isArray(v) ? v[0] : v
      if (typeof val === 'string') out[k] = val
    }
  }
  if (req.url) {
    try {
      const parsed = new URL(req.url, 'http://localhost')
      for (const [k, v] of parsed.searchParams.entries()) {
        if (!(k in out)) out[k] = v
      }
    } catch {
      // ignore invalid URL
    }
  }
  return out
}

function parseBody(body: unknown): Record<string, unknown> | null {
  if (typeof body === 'string') {
    if (!body.trim()) return {}
    try {
      const parsed = JSON.parse(body) as unknown
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null
    } catch {
      return null
    }
  }
  if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
    return body as Record<string, unknown>
  }
  return {}
}

function recordToSummary(rec: StoredMapRecord): TacticalMapSummary {
  const enemyCount = rec.state.tokens.filter((t) => t.type === 'enemy').length
  return {
    id: rec.id,
    name: rec.name,
    isActive: rec.isActive,
    cols: rec.state.grid.cols,
    rows: rec.state.grid.rows,
    tokenCount: rec.state.tokens.length,
    enemyCount,
    wallCount: rec.state.walls.length,
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
  }
}

function recordToMapState(rec: StoredMapRecord, includeImage: boolean): TacticalMapState {
  const now = Date.now()
  const grid = normalizeGridConfig(rec.state.grid)
  const walls = normalizeWalls(rec.state.walls)
  const tokens = normalizeTokens(rec.state.tokens, grid)
  const fog = normalizeFog(rec.state.fog, grid)
  const visibility = computePartyVisibility(tokens, grid, walls, fog)

  const state: TacticalMapState = {
    id: rec.id,
    name: rec.name,
    isActive: rec.isActive,
    imageHash: rec.imageHash,
    imageWidth: rec.imageWidth,
    imageHeight: rec.imageHeight,
    grid,
    walls,
    tokens,
    fog: {
      exploredCells: visibility.exploredCells,
      manualRevealedCells: fog.manualRevealedCells,
      manualHiddenCells: fog.manualHiddenCells,
    },
    pings: pruneActivePings(rec.state.pings, grid, now),
    updatedAt: rec.updatedAt,
  }

  if (includeImage) {
    state.imageData = rec.imageData
  }

  return state
}

function rowToRecord(row: Record<string, unknown>): StoredMapRecord {
  const rawState =
    typeof row.state === 'string'
      ? (JSON.parse(row.state) as Record<string, unknown>)
      : typeof row.state === 'object' && row.state !== null
        ? (row.state as Record<string, unknown>)
        : {}

  const grid = normalizeGridConfig(rawState.grid)
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? 'Mappa'),
    isActive: Boolean(row.is_active),
    imageHash: String(row.image_hash ?? 'blank'),
    imageData: typeof row.image_data === 'string' ? row.image_data : '',
    imageWidth: clampInt(Number(row.image_width), 1600, 100, 10000),
    imageHeight: clampInt(Number(row.image_height), 1000, 100, 10000),
    state: {
      grid,
      walls: normalizeWalls(rawState.walls),
      tokens: normalizeTokens(rawState.tokens, grid),
      fog: normalizeFog(rawState.fog, grid),
      pings: pruneActivePings(rawState.pings, grid),
    },
    createdAt: Number(row.created_at_ms ?? Date.now()),
    updatedAt: Number(row.updated_at_ms ?? Date.now()),
  }
}

async function fetchRecordById(
  sql: SqlTagFn | null,
  id: string,
  includeImage: boolean
): Promise<StoredMapRecord | null> {
  if (!sql) {
    const mem = memoryMaps.get(id)
    if (!mem) return null
    return {
      ...mem,
      imageData: includeImage ? mem.imageData : '',
    }
  }

  const rows = includeImage
    ? await sql`
        SELECT
          id, name, is_active, image_hash, image_data, image_width, image_height, state,
          (EXTRACT(EPOCH FROM created_at) * 1000)::bigint AS created_at_ms,
          (EXTRACT(EPOCH FROM updated_at) * 1000)::bigint AS updated_at_ms
        FROM tactical_maps
        WHERE id = ${id}
        LIMIT 1
      `
    : await sql`
        SELECT
          id, name, is_active, image_hash, image_width, image_height, state,
          (EXTRACT(EPOCH FROM created_at) * 1000)::bigint AS created_at_ms,
          (EXTRACT(EPOCH FROM updated_at) * 1000)::bigint AS updated_at_ms
        FROM tactical_maps
        WHERE id = ${id}
        LIMIT 1
      `

  if (rows.length === 0) return null
  return rowToRecord(rows[0])
}

async function fetchActiveRecord(
  sql: SqlTagFn | null,
  includeImage: boolean
): Promise<StoredMapRecord | null> {
  if (!sql) {
    for (const rec of memoryMaps.values()) {
      if (rec.isActive) {
        return {
          ...rec,
          imageData: includeImage ? rec.imageData : '',
        }
      }
    }
    return null
  }

  const rows = includeImage
    ? await sql`
        SELECT
          id, name, is_active, image_hash, image_data, image_width, image_height, state,
          (EXTRACT(EPOCH FROM created_at) * 1000)::bigint AS created_at_ms,
          (EXTRACT(EPOCH FROM updated_at) * 1000)::bigint AS updated_at_ms
        FROM tactical_maps
        WHERE is_active = TRUE
        ORDER BY updated_at DESC
        LIMIT 1
      `
    : await sql`
        SELECT
          id, name, is_active, image_hash, image_width, image_height, state,
          (EXTRACT(EPOCH FROM created_at) * 1000)::bigint AS created_at_ms,
          (EXTRACT(EPOCH FROM updated_at) * 1000)::bigint AS updated_at_ms
        FROM tactical_maps
        WHERE is_active = TRUE
        ORDER BY updated_at DESC
        LIMIT 1
      `

  if (rows.length === 0) return null
  return rowToRecord(rows[0])
}

async function saveStateOnly(
  sql: SqlTagFn | null,
  id: string,
  statePayload: StoredMapStatePayload,
  name?: string
): Promise<number> {
  const now = Date.now()
  if (!sql) {
    const existing = memoryMaps.get(id)
    if (existing) {
      existing.state = statePayload
      if (name) existing.name = name
      existing.updatedAt = now
    }
    return now
  }

  const stateJson = JSON.stringify(statePayload)
  const rows = name
    ? await sql`
        UPDATE tactical_maps
        SET state = ${stateJson}::jsonb, name = ${name}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING (EXTRACT(EPOCH FROM updated_at) * 1000)::bigint AS updated_at_ms
      `
    : await sql`
        UPDATE tactical_maps
        SET state = ${stateJson}::jsonb, updated_at = NOW()
        WHERE id = ${id}
        RETURNING (EXTRACT(EPOCH FROM updated_at) * 1000)::bigint AS updated_at_ms
      `
  return Number(rows[0]?.updated_at_ms ?? now)
}

export async function handleMapsRequest(
  req: ApiRequest,
  res: ApiResponse,
  options?: {
    env?: Record<string, string | undefined>
    sql?: SqlTagFn
  }
): Promise<void> {
  res.setHeader?.('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') {
    const s = res.status(204)
    if (s.end) s.end()
    else s.json({})
    return
  }

  const env = options?.env ?? process.env
  const dbUrl = options?.sql ? 'injected' : getDatabaseUrl(env)
  const sql: SqlTagFn | null = options?.sql ?? (dbUrl ? (neon(dbUrl) as unknown as SqlTagFn) : null)

  try {
    if (sql) {
      await ensureMapsSchema(sql, options?.sql ? undefined : dbUrl ?? undefined)
    }

    const query = parseQuery(req)

    // -------------------------------------------------------------------------
    // GET: list maps, get active map, or get map by id
    // -------------------------------------------------------------------------
    if (req.method === 'GET') {
      const role = query.role === 'master' ? 'master' : 'player'
      const includeImage = query.includeImage === '1' || query.image === '1'

      if (query.list === '1') {
        if (role !== 'master') {
          res.status(403).json({ error: 'Solo il Master può elencare la libreria mappe' })
          return
        }
        if (!sql) {
          const summaries = Array.from(memoryMaps.values())
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map(recordToSummary)
          res.status(200).json({ maps: summaries })
          return
        }

        const rows = await sql`
          SELECT
            id, name, is_active, image_hash, image_width, image_height, state,
            (EXTRACT(EPOCH FROM created_at) * 1000)::bigint AS created_at_ms,
            (EXTRACT(EPOCH FROM updated_at) * 1000)::bigint AS updated_at_ms
          FROM tactical_maps
          ORDER BY updated_at DESC
        `
        const summaries = rows.map((r) => recordToSummary(rowToRecord(r)))
        res.status(200).json({ maps: summaries })
        return
      }

      if (query.active === '1') {
        const rec = await fetchActiveRecord(sql, includeImage)
        if (!rec) {
          res.status(200).json({ map: null })
          return
        }

        const since = query.since ? Number(query.since) : NaN
        if (Number.isFinite(since) && rec.updatedAt <= since && !includeImage) {
          res.status(200).json({ unchanged: true, mapId: rec.id, updatedAt: rec.updatedAt })
          return
        }

        const fullState = recordToMapState(rec, includeImage)
        const payload = role === 'master' ? fullState : filterMapStateForPlayer(fullState)
        res.status(200).json({ map: payload })
        return
      }

      if (query.id) {
        const rec = await fetchRecordById(sql, query.id, includeImage)
        if (!rec) {
          res.status(404).json({ error: 'Mappa non trovata' })
          return
        }
        if (role !== 'master' && !rec.isActive) {
          res.status(403).json({ error: 'Mappa non attiva per i giocatori' })
          return
        }
        const fullState = recordToMapState(rec, includeImage)
        const payload = role === 'master' ? fullState : filterMapStateForPlayer(fullState)
        res.status(200).json({ map: payload })
        return
      }

      res.status(400).json({ error: 'Parametro query mancante (list, active o id)' })
      return
    }

    // -------------------------------------------------------------------------
    // POST: create a new map in the Master library
    // -------------------------------------------------------------------------
    if (req.method === 'POST') {
      const body = parseBody(req.body)
      if (!body) {
        res.status(400).json({ error: 'Payload JSON non valido' })
        return
      }
      if (body.role !== 'master') {
        res.status(403).json({ error: 'Solo il Master può creare nuove mappe' })
        return
      }

      const name =
        typeof body.name === 'string' && body.name.trim()
          ? body.name.trim().slice(0, 80)
          : 'Nuova Mappa Tattica'
      const imageData = typeof body.imageData === 'string' ? body.imageData.trim() : ''
      if (imageData.length > MAX_MAP_IMAGE_CHARS) {
        res.status(413).json({ error: 'Immagine troppo pesante (max ~3 MB compressa)' })
        return
      }
      if (!isValidImageDataUrl(imageData)) {
        res.status(400).json({ error: 'Formato immagine non valido (richiesto PNG, JPEG, WebP o GIF)' })
        return
      }

      const imageWidth = clampInt(body.imageWidth, 1600, 100, 10000)
      const imageHeight = clampInt(body.imageHeight, 1000, 100, 10000)
      const grid = normalizeGridConfig(body.grid)
      const walls = normalizeWalls(body.walls)
      const tokens = normalizeTokens(body.tokens, grid)
      const fog = normalizeFog(body.fog, grid)
      const visibility = computePartyVisibility(tokens, grid, walls, fog)

      const statePayload: StoredMapStatePayload = {
        grid,
        walls,
        tokens,
        fog: {
          exploredCells: visibility.exploredCells,
          manualRevealedCells: fog.manualRevealedCells,
          manualHiddenCells: fog.manualHiddenCells,
        },
        pings: [],
      }

      const id = generateId('map')
      const imageHash = hashImageData(imageData)
      const now = Date.now()
      const setActive = body.setActive !== false

      if (!sql) {
        const shouldActivate = setActive || memoryMaps.size === 0
        if (shouldActivate) {
          for (const existing of memoryMaps.values()) {
            existing.isActive = false
          }
        }
        const rec: StoredMapRecord = {
          id,
          name,
          isActive: shouldActivate,
          imageHash,
          imageData,
          imageWidth,
          imageHeight,
          state: statePayload,
          createdAt: now,
          updatedAt: now,
        }
        memoryMaps.set(id, rec)
        res.status(201).json({
          map: recordToMapState(rec, false),
          summary: recordToSummary(rec),
        })
        return
      }

      if (setActive) {
        await sql`UPDATE tactical_maps SET is_active = FALSE WHERE is_active = TRUE`
      }

      const stateJson = JSON.stringify(statePayload)
      const inserted = await sql`
        INSERT INTO tactical_maps (
          id, name, is_active, image_hash, image_data, image_width, image_height, state, created_at, updated_at
        )
        VALUES (
          ${id}, ${name}, ${setActive}, ${imageHash}, ${imageData}, ${imageWidth}, ${imageHeight},
          ${stateJson}::jsonb, NOW(), NOW()
        )
        RETURNING
          id, name, is_active, image_hash, image_width, image_height, state,
          (EXTRACT(EPOCH FROM created_at) * 1000)::bigint AS created_at_ms,
          (EXTRACT(EPOCH FROM updated_at) * 1000)::bigint AS updated_at_ms
      `
      const rec = rowToRecord(inserted[0])
      res.status(201).json({
        map: recordToMapState(rec, false),
        summary: recordToSummary(rec),
      })
      return
    }

    // -------------------------------------------------------------------------
    // PATCH: Player actions (moveToken, rotateToken, sendPing) & Master actions
    // -------------------------------------------------------------------------
    if (req.method === 'PATCH') {
      const body = parseBody(req.body)
      if (!body) {
        res.status(400).json({ error: 'Payload JSON non valido' })
        return
      }

      const role = body.role === 'master' ? 'master' : 'player'
      const action = typeof body.action === 'string' ? body.action : ''
      const mapId = typeof body.mapId === 'string' ? body.mapId.trim() : ''

      if (!mapId) {
        res.status(400).json({ error: 'mapId obbligatorio' })
        return
      }

      // ---- PLAYER ACTIONS ----
      if (role === 'player') {
        if (action !== 'moveToken' && action !== 'rotateToken' && action !== 'sendPing') {
          res.status(403).json({ error: 'Azione non consentita ai giocatori' })
          return
        }

        const rec = await fetchRecordById(sql, mapId, false)
        if (!rec || !rec.isActive) {
          res.status(404).json({ error: 'Mappa attiva non trovata' })
          return
        }

        const { grid, walls, tokens, fog } = rec.state
        const pings = pruneActivePings(rec.state.pings, grid)

        if (action === 'moveToken') {
          const tokenId = typeof body.tokenId === 'string' ? body.tokenId : ''
          const col = Number(body.col)
          const row = Number(body.row)
          const tokenIdx = tokens.findIndex((t) => t.id === tokenId)
          if (tokenIdx === -1) {
            res.status(404).json({ error: 'Tondino non trovato' })
            return
          }

          const targetToken = tokens[tokenIdx]
          const validation = validatePlayerTokenMove(targetToken, col, row, grid, walls)
          if (!validation.ok) {
            if (validation.reason === 'forbidden_token_type') {
              res.status(403).json({ error: 'I giocatori possono muovere solo i tondini alleati' })
              return
            }
            res.status(400).json({
              error: 'Movimento bloccato da muro, porta chiusa o fuori griglia',
              reason: validation.reason,
            })
            return
          }

          const nextFacing =
            body.facingDeg !== undefined
              ? isValidFacingDeg(body.facingDeg)
                ? body.facingDeg
                : null
              : targetToken.facingDeg

          if (nextFacing === null) {
            res.status(400).json({ error: 'Direzione cono visivo non valida' })
            return
          }

          const updatedTokens = tokens.map((t, i) =>
            i === tokenIdx ? { ...t, col, row, facingDeg: nextFacing } : t
          )
          const visibility = computePartyVisibility(updatedTokens, grid, walls, fog)
          const nextState: StoredMapStatePayload = {
            grid,
            walls,
            tokens: updatedTokens,
            fog: {
              exploredCells: visibility.exploredCells,
              manualRevealedCells: fog.manualRevealedCells,
              manualHiddenCells: fog.manualHiddenCells,
            },
            pings,
          }
          rec.updatedAt = await saveStateOnly(sql, rec.id, nextState)
          rec.state = nextState

          const full = recordToMapState(rec, false)
          res.status(200).json({
            map: filterMapStateForPlayer(full),
            distanceFeet: validation.distanceFeet ?? 0,
          })
          return
        }

        if (action === 'rotateToken') {
          const tokenId = typeof body.tokenId === 'string' ? body.tokenId : ''
          const facingDeg = body.facingDeg
          if (!isValidFacingDeg(facingDeg)) {
            res.status(400).json({ error: 'Direzione cono visivo non valida (richiesto multiplo di 45°)' })
            return
          }
          const tokenIdx = tokens.findIndex((t) => t.id === tokenId)
          if (tokenIdx === -1) {
            res.status(404).json({ error: 'Tondino non trovato' })
            return
          }
          const targetToken = tokens[tokenIdx]
          if (targetToken.type !== 'pc' && targetToken.type !== 'companion') {
            res.status(403).json({ error: 'I giocatori possono ruotare solo i tondini alleati' })
            return
          }

          const updatedTokens = tokens.map((t, i) =>
            i === tokenIdx ? { ...t, facingDeg } : t
          )
          const visibility = computePartyVisibility(updatedTokens, grid, walls, fog)
          const nextState: StoredMapStatePayload = {
            grid,
            walls,
            tokens: updatedTokens,
            fog: {
              exploredCells: visibility.exploredCells,
              manualRevealedCells: fog.manualRevealedCells,
              manualHiddenCells: fog.manualHiddenCells,
            },
            pings,
          }
          rec.updatedAt = await saveStateOnly(sql, rec.id, nextState)
          rec.state = nextState

          const full = recordToMapState(rec, false)
          res.status(200).json({ map: filterMapStateForPlayer(full) })
          return
        }

        if (action === 'sendPing') {
          const col = Number(body.col)
          const row = Number(body.row)
          if (!isCellInBounds(col, row, grid.cols, grid.rows)) {
            res.status(400).json({ error: 'Coordinate ping fuori dalla griglia' })
            return
          }
          const senderName =
            typeof body.senderName === 'string' && body.senderName.trim()
              ? body.senderName.trim().slice(0, 32)
              : 'Giocatore'
          const color: MapPing['color'] =
            body.color === 'magenta' || body.color === 'amber' ? body.color : 'cyan'
          const nextPings: MapPing[] = [
            ...pings,
            { id: generateId('ping'), col, row, senderName, color, createdAt: Date.now() },
          ].slice(-MAX_PINGS)

          const nextState: StoredMapStatePayload = {
            grid,
            walls,
            tokens,
            fog,
            pings: nextPings,
          }
          rec.updatedAt = await saveStateOnly(sql, rec.id, nextState)
          rec.state = nextState

          const full = recordToMapState(rec, false)
          res.status(200).json({ map: filterMapStateForPlayer(full) })
          return
        }
      }

      // ---- MASTER ACTIONS ----
      if (action === 'setActive') {
        const rec = await fetchRecordById(sql, mapId, false)
        if (!rec) {
          res.status(404).json({ error: 'Mappa non trovata' })
          return
        }

        if (!sql) {
          for (const item of memoryMaps.values()) {
            item.isActive = item.id === mapId
            if (item.id === mapId) item.updatedAt = Date.now()
          }
          const updated = memoryMaps.get(mapId)!
          res.status(200).json({ map: recordToMapState(updated, false) })
          return
        }

        await sql`UPDATE tactical_maps SET is_active = FALSE WHERE is_active = TRUE`
        const rows = await sql`
          UPDATE tactical_maps
          SET is_active = TRUE, updated_at = NOW()
          WHERE id = ${mapId}
          RETURNING
            id, name, is_active, image_hash, image_width, image_height, state,
            (EXTRACT(EPOCH FROM created_at) * 1000)::bigint AS created_at_ms,
            (EXTRACT(EPOCH FROM updated_at) * 1000)::bigint AS updated_at_ms
        `
        const updatedRec = rowToRecord(rows[0])
        res.status(200).json({ map: recordToMapState(updatedRec, false) })
        return
      }

      if (action === 'fogOverride') {
        const rec = await fetchRecordById(sql, mapId, false)
        if (!rec) {
          res.status(404).json({ error: 'Mappa non trovata' })
          return
        }
        const mode = body.mode
        const { grid, walls, tokens } = rec.state
        let nextFog: MapFogState = { ...rec.state.fog }

        if (mode === 'reset') {
          const vis = computePartyVisibility(tokens, grid, walls, {
            exploredCells: [],
            manualRevealedCells: [],
            manualHiddenCells: [],
          })
          nextFog = {
            exploredCells: vis.exploredCells,
            manualRevealedCells: [],
            manualHiddenCells: [],
          }
        } else if (mode === 'reveal') {
          const targetCells = normalizeCellKeyList(body.cells, grid)
          const targetSet = new Set(targetCells)
          const revealed = new Set([...nextFog.manualRevealedCells, ...targetCells])
          const hidden = nextFog.manualHiddenCells.filter((k) => !targetSet.has(k))
          const explored = new Set([...nextFog.exploredCells, ...targetCells])
          nextFog = {
            exploredCells: Array.from(explored),
            manualRevealedCells: Array.from(revealed),
            manualHiddenCells: hidden,
          }
        } else if (mode === 'hide') {
          const targetCells = normalizeCellKeyList(body.cells, grid)
          const targetSet = new Set(targetCells)
          const hidden = new Set([...nextFog.manualHiddenCells, ...targetCells])
          const revealed = nextFog.manualRevealedCells.filter((k) => !targetSet.has(k))
          const explored = nextFog.exploredCells.filter((k) => !targetSet.has(k))
          nextFog = {
            exploredCells: explored,
            manualRevealedCells: revealed,
            manualHiddenCells: Array.from(hidden),
          }
        } else {
          res.status(400).json({ error: 'Modalità fogOverride non valida (reset, reveal o hide)' })
          return
        }

        const vis = computePartyVisibility(tokens, grid, walls, nextFog)
        nextFog.exploredCells = vis.exploredCells

        const nextState: StoredMapStatePayload = {
          grid,
          walls,
          tokens,
          fog: nextFog,
          pings: pruneActivePings(rec.state.pings, grid),
        }
        rec.updatedAt = await saveStateOnly(sql, rec.id, nextState)
        rec.state = nextState
        res.status(200).json({ map: recordToMapState(rec, false) })
        return
      }

      if (action === 'sendPing') {
        const rec = await fetchRecordById(sql, mapId, false)
        if (!rec) {
          res.status(404).json({ error: 'Mappa non trovata' })
          return
        }
        const { grid, walls, tokens, fog } = rec.state
        const col = Number(body.col)
        const row = Number(body.row)
        if (!isCellInBounds(col, row, grid.cols, grid.rows)) {
          res.status(400).json({ error: 'Coordinate ping fuori dalla griglia' })
          return
        }
        const nextPings = [
          ...pruneActivePings(rec.state.pings, grid),
          {
            id: generateId('ping'),
            col,
            row,
            senderName: 'Master',
            color: 'magenta' as const,
            createdAt: Date.now(),
          },
        ].slice(-MAX_PINGS)

        const nextState: StoredMapStatePayload = { grid, walls, tokens, fog, pings: nextPings }
        rec.updatedAt = await saveStateOnly(sql, rec.id, nextState)
        rec.state = nextState
        res.status(200).json({ map: recordToMapState(rec, false) })
        return
      }

      if (action === 'updateMap') {
        const hasNewImage = typeof body.imageData === 'string'
        const rec = await fetchRecordById(sql, mapId, !hasNewImage)
        if (!rec) {
          res.status(404).json({ error: 'Mappa non trovata' })
          return
        }

        const nextName =
          typeof body.name === 'string' && body.name.trim()
            ? body.name.trim().slice(0, 80)
            : rec.name

        if (hasNewImage) {
          const img = (body.imageData as string).trim()
          if (img.length > MAX_MAP_IMAGE_CHARS) {
            res.status(413).json({ error: 'Immagine troppo pesante (max ~3 MB compressa)' })
            return
          }
          if (!isValidImageDataUrl(img)) {
            res.status(400).json({ error: 'Formato immagine non valido' })
            return
          }
          rec.imageData = img
          rec.imageHash = hashImageData(img)
        }

        if (body.imageWidth !== undefined) {
          rec.imageWidth = clampInt(body.imageWidth, rec.imageWidth, 100, 10000)
        }
        if (body.imageHeight !== undefined) {
          rec.imageHeight = clampInt(body.imageHeight, rec.imageHeight, 100, 10000)
        }

        const nextGrid = body.grid !== undefined ? normalizeGridConfig(body.grid) : rec.state.grid
        const nextWalls = body.walls !== undefined ? normalizeWalls(body.walls) : rec.state.walls
        const nextTokens =
          body.tokens !== undefined
            ? normalizeTokens(body.tokens, nextGrid)
            : normalizeTokens(rec.state.tokens, nextGrid)
        const baseFog =
          body.fog !== undefined
            ? normalizeFog(body.fog, nextGrid)
            : normalizeFog(rec.state.fog, nextGrid)
        const visibility = computePartyVisibility(nextTokens, nextGrid, nextWalls, baseFog)

        const nextState: StoredMapStatePayload = {
          grid: nextGrid,
          walls: nextWalls,
          tokens: nextTokens,
          fog: {
            exploredCells: visibility.exploredCells,
            manualRevealedCells: baseFog.manualRevealedCells,
            manualHiddenCells: baseFog.manualHiddenCells,
          },
          pings: pruneActivePings(rec.state.pings, nextGrid),
        }

        if (hasNewImage || body.imageWidth !== undefined || body.imageHeight !== undefined) {
          const now = Date.now()
          if (!sql) {
            const mem = memoryMaps.get(mapId)
            if (mem) {
              mem.name = nextName
              mem.imageData = rec.imageData
              mem.imageHash = rec.imageHash
              mem.imageWidth = rec.imageWidth
              mem.imageHeight = rec.imageHeight
              mem.state = nextState
              mem.updatedAt = now
            }
            rec.updatedAt = now
          } else {
            const stateJson = JSON.stringify(nextState)
            const rows = await sql`
              UPDATE tactical_maps
              SET
                name = ${nextName},
                image_hash = ${rec.imageHash},
                image_data = ${rec.imageData},
                image_width = ${rec.imageWidth},
                image_height = ${rec.imageHeight},
                state = ${stateJson}::jsonb,
                updated_at = NOW()
              WHERE id = ${mapId}
              RETURNING (EXTRACT(EPOCH FROM updated_at) * 1000)::bigint AS updated_at_ms
            `
            rec.updatedAt = Number(rows[0]?.updated_at_ms ?? now)
          }
        } else {
          rec.updatedAt = await saveStateOnly(sql, mapId, nextState, nextName)
        }

        rec.name = nextName
        rec.state = nextState
        res.status(200).json({
          map: recordToMapState(rec, false),
          summary: recordToSummary(rec),
        })
        return
      }

      res.status(400).json({ error: `Azione Master sconosciuta: ${action}` })
      return
    }

    // -------------------------------------------------------------------------
    // DELETE: remove map from library (Master only)
    // -------------------------------------------------------------------------
    if (req.method === 'DELETE') {
      const body = parseBody(req.body)
      const role = query.role === 'master' || body?.role === 'master' ? 'master' : 'player'
      if (role !== 'master') {
        res.status(403).json({ error: 'Solo il Master può eliminare mappe' })
        return
      }
      const targetId = query.id || (typeof body?.mapId === 'string' ? body.mapId : '')
      if (!targetId) {
        res.status(400).json({ error: 'ID mappa mancante' })
        return
      }

      if (!sql) {
        memoryMaps.delete(targetId)
      } else {
        await sql`DELETE FROM tactical_maps WHERE id = ${targetId}`
      }
      res.status(200).json({ ok: true, id: targetId })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Maps API error:', err)
    const isProd = env.NODE_ENV === 'production'
    res.status(500).json({
      error: 'Errore server mappe',
      ...(isProd ? {} : { detail: err instanceof Error ? err.message : String(err) }),
    })
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  return handleMapsRequest(req, res)
}
