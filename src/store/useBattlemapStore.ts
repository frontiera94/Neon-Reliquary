import { create } from 'zustand'
import type {
  FacingDirectionDeg,
  GridConfig,
  MapFogState,
  MapToken,
  MapWallSegment,
  TacticalMapState,
  TacticalMapSummary,
} from '../types/map'
import {
  computePartyVisibility,
  validatePlayerTokenMove,
  type MoveValidationResult,
} from '../lib/battlemap-engine'

export interface CreateMapInput {
  name: string
  imageData?: string
  imageWidth?: number
  imageHeight?: number
  grid?: Partial<GridConfig>
  walls?: MapWallSegment[]
  tokens?: MapToken[]
  setActive?: boolean
}

export interface UpdateMasterMapPatch {
  name?: string
  imageData?: string
  imageWidth?: number
  imageHeight?: number
  grid?: GridConfig
  walls?: MapWallSegment[]
  tokens?: MapToken[]
  fog?: MapFogState
}

export interface BattlemapStoreState {
  /** Player-visible active map (`/map`). */
  activeMap: TacticalMapState | null
  /** Currently edited Master map (`/master-map`). */
  masterMap: TacticalMapState | null
  /** Master map library summaries. */
  library: TacticalMapSummary[]
  /** Cached base64 map images keyed by `${mapId}:${imageHash}`. */
  imageCache: Record<string, string>
  loading: boolean
  error: string | null
  lastFeedback: string | null

  clearFeedback: () => void
  ensureMapImage: (mapId: string, imageHash: string, role: 'player' | 'master') => Promise<void>
  pollActiveMap: (role?: 'player' | 'master', force?: boolean) => Promise<void>

  // Player actions (any allied token, blocked by walls/closed doors)
  playerMoveToken: (
    tokenId: string,
    col: number,
    row: number,
    facingDeg?: FacingDirectionDeg
  ) => Promise<MoveValidationResult>
  playerRotateToken: (tokenId: string, facingDeg: FacingDirectionDeg) => Promise<boolean>
  sendPing: (
    mapId: string,
    col: number,
    row: number,
    senderName: string,
    role?: 'player' | 'master',
    color?: 'cyan' | 'magenta' | 'amber'
  ) => Promise<boolean>

  // Master actions
  fetchLibrary: () => Promise<void>
  loadMasterMap: (mapId: string) => Promise<void>
  createMap: (input: CreateMapInput) => Promise<TacticalMapState | null>
  setActiveMap: (mapId: string) => Promise<boolean>
  updateMasterMap: (mapId: string, patch: UpdateMasterMapPatch) => Promise<boolean>
  fogOverride: (
    mapId: string,
    mode: 'reset' | 'reveal' | 'hide',
    cells?: string[]
  ) => Promise<boolean>
  deleteMap: (mapId: string) => Promise<boolean>
}

const inFlightImages = new Set<string>()
let masterMutationSeq = 0
let masterPatchChain: Promise<void> = Promise.resolve()

function getEndpoint(): string {
  return '/api/maps'
}

export function getCachedMapImage(
  imageCache: Record<string, string>,
  map: Pick<TacticalMapState, 'id' | 'imageHash' | 'imageData'> | null
): string {
  if (!map) return ''
  if (map.imageData) return map.imageData
  if (!map.imageHash || map.imageHash === 'blank') return ''
  return imageCache[`${map.id}:${map.imageHash}`] ?? ''
}

export const useBattlemapStore = create<BattlemapStoreState>((set, get) => ({
  activeMap: null,
  masterMap: null,
  library: [],
  imageCache: {},
  loading: false,
  error: null,
  lastFeedback: null,

  clearFeedback: () => set({ lastFeedback: null, error: null }),

  ensureMapImage: async (mapId, imageHash, role) => {
    if (!mapId || !imageHash || imageHash === 'blank') return
    const cacheKey = `${mapId}:${imageHash}`
    if (get().imageCache[cacheKey] || inFlightImages.has(cacheKey)) return

    inFlightImages.add(cacheKey)
    try {
      const res = await fetch(
        `${getEndpoint()}?id=${encodeURIComponent(mapId)}&role=${role}&includeImage=1`,
        { headers: { Accept: 'application/json' } }
      )
      if (!res.ok) return
      const data = (await res.json()) as { map?: TacticalMapState }
      const img = data.map?.imageData
      if (typeof img === 'string' && img.length > 0) {
        set((s) => ({
          imageCache: { ...s.imageCache, [cacheKey]: img },
        }))
      }
    } catch {
      // Ignore transient image fetch error; next poll will retry
    } finally {
      inFlightImages.delete(cacheKey)
    }
  },

  pollActiveMap: async (role = 'player', force = false) => {
    const current = role === 'master' ? get().masterMap : get().activeMap
    const sinceParam =
      !force && current && current.isActive ? `&since=${current.updatedAt}` : ''

    try {
      const res = await fetch(`${getEndpoint()}?active=1&role=${role}${sinceParam}`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) return
      const data = (await res.json()) as {
        unchanged?: boolean
        map?: TacticalMapState | null
      }

      if (data.unchanged) return

      if (!data.map) {
        if (role === 'player') {
          set({ activeMap: null })
        }
        return
      }

      const incoming = data.map
      if (role === 'player') {
        set({ activeMap: incoming, error: null })
      } else {
        set((s) => ({
          masterMap: !s.masterMap || s.masterMap.id === incoming.id ? incoming : s.masterMap,
          activeMap: incoming,
          error: null,
        }))
      }

      if (incoming.imageHash && incoming.imageHash !== 'blank') {
        void get().ensureMapImage(incoming.id, incoming.imageHash, role)
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) })
    }
  },

  playerMoveToken: async (tokenId, col, row, facingDeg) => {
    const prevMap = get().activeMap
    if (!prevMap) {
      return { ok: false, reason: 'out_of_bounds' }
    }

    const tok = prevMap.tokens.find((t) => t.id === tokenId)
    if (!tok) {
      return { ok: false, reason: 'out_of_bounds' }
    }

    const validation = validatePlayerTokenMove(tok, col, row, prevMap.grid, prevMap.walls)
    if (!validation.ok) {
      set({
        lastFeedback:
          validation.reason === 'forbidden_token_type'
            ? 'forbidden_token_type'
            : 'blocked_by_wall',
      })
      return validation
    }

    const nextFacing = facingDeg ?? tok.facingDeg
    const nextTokens = prevMap.tokens.map((t) =>
      t.id === tokenId ? { ...t, col, row, facingDeg: nextFacing } : t
    )
    const vis = computePartyVisibility(nextTokens, prevMap.grid, prevMap.walls, prevMap.fog)

    // Optimistic update
    set({
      lastFeedback: null,
      activeMap: {
        ...prevMap,
        tokens: nextTokens,
        fog: {
          ...prevMap.fog,
          exploredCells: vis.exploredCells,
        },
        updatedAt: Date.now(),
      },
    })

    try {
      const res = await fetch(getEndpoint(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'player',
          action: 'moveToken',
          mapId: prevMap.id,
          tokenId,
          col,
          row,
          ...(facingDeg !== undefined ? { facingDeg } : {}),
        }),
      })
      if (!res.ok) {
        set({ activeMap: prevMap, lastFeedback: 'blocked_by_wall' })
        return { ok: false, reason: 'blocked_by_wall' }
      }
      const data = (await res.json()) as { map?: TacticalMapState }
      if (data.map) {
        set({ activeMap: data.map, error: null })
      }
      return validation
    } catch {
      set({ activeMap: prevMap })
      return { ok: false, reason: 'blocked_by_wall' }
    }
  },

  playerRotateToken: async (tokenId, facingDeg) => {
    const prevMap = get().activeMap
    if (!prevMap) return false

    const tok = prevMap.tokens.find((t) => t.id === tokenId)
    if (!tok || (tok.type !== 'pc' && tok.type !== 'companion')) {
      set({ lastFeedback: 'forbidden_token_type' })
      return false
    }

    const nextTokens = prevMap.tokens.map((t) =>
      t.id === tokenId ? { ...t, facingDeg } : t
    )
    const vis = computePartyVisibility(nextTokens, prevMap.grid, prevMap.walls, prevMap.fog)

    set({
      lastFeedback: null,
      activeMap: {
        ...prevMap,
        tokens: nextTokens,
        fog: { ...prevMap.fog, exploredCells: vis.exploredCells },
        updatedAt: Date.now(),
      },
    })

    try {
      const res = await fetch(getEndpoint(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'player',
          action: 'rotateToken',
          mapId: prevMap.id,
          tokenId,
          facingDeg,
        }),
      })
      if (!res.ok) {
        set({ activeMap: prevMap })
        return false
      }
      const data = (await res.json()) as { map?: TacticalMapState }
      if (data.map) {
        set({ activeMap: data.map })
      }
      return true
    } catch {
      set({ activeMap: prevMap })
      return false
    }
  },

  sendPing: async (mapId, col, row, senderName, role = 'player', color = 'cyan') => {
    const target = role === 'master' ? get().masterMap : get().activeMap
    if (target && target.id === mapId) {
      const optimisticPing = {
        id: `local_${Date.now()}`,
        col,
        row,
        senderName,
        color,
        createdAt: Date.now(),
      }
      if (role === 'master') {
        set({ masterMap: { ...target, pings: [...target.pings, optimisticPing] } })
      } else {
        set({ activeMap: { ...target, pings: [...target.pings, optimisticPing] } })
      }
    }

    try {
      const res = await fetch(getEndpoint(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          action: 'sendPing',
          mapId,
          col,
          row,
          senderName,
          color,
        }),
      })
      if (!res.ok) return false
      const data = (await res.json()) as { map?: TacticalMapState }
      if (data.map) {
        if (role === 'master') set({ masterMap: data.map })
        else set({ activeMap: data.map })
      }
      return true
    } catch {
      return false
    }
  },

  fetchLibrary: async () => {
    set({ loading: true })
    try {
      const res = await fetch(`${getEndpoint()}?list=1&role=master`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) {
        set({ loading: false })
        return
      }
      const data = (await res.json()) as { maps?: TacticalMapSummary[] }
      const maps = data.maps ?? []
      set({ library: maps, loading: false, error: null })

      if (!get().masterMap && maps.length > 0) {
        const preferred = maps.find((m) => m.isActive) ?? maps[0]
        await get().loadMasterMap(preferred.id)
      }
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : String(err) })
    }
  },

  loadMasterMap: async (mapId) => {
    set({ loading: true })
    try {
      const res = await fetch(
        `${getEndpoint()}?id=${encodeURIComponent(mapId)}&role=master`,
        { headers: { Accept: 'application/json' } }
      )
      if (!res.ok) {
        set({ loading: false })
        return
      }
      const data = (await res.json()) as { map?: TacticalMapState }
      if (data.map) {
        set({ masterMap: data.map, loading: false, error: null })
        if (data.map.imageHash && data.map.imageHash !== 'blank') {
          void get().ensureMapImage(data.map.id, data.map.imageHash, 'master')
        }
      } else {
        set({ loading: false })
      }
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : String(err) })
    }
  },

  createMap: async (input) => {
    set({ loading: true })
    try {
      const res = await fetch(getEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'master',
          ...input,
        }),
      })
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string }
        set({ loading: false, error: errBody.error ?? 'Errore creazione mappa' })
        return null
      }
      const data = (await res.json()) as {
        map: TacticalMapState
        summary: TacticalMapSummary
      }
      const created = data.map
      set((s) => {
        const nextCache =
          input.imageData && created.imageHash && created.imageHash !== 'blank'
            ? { ...s.imageCache, [`${created.id}:${created.imageHash}`]: input.imageData }
            : s.imageCache
        const prevLib = created.isActive
          ? s.library.map((m) => ({ ...m, isActive: false }))
          : s.library
        return {
          masterMap: created,
          library: [data.summary, ...prevLib],
          imageCache: nextCache,
          loading: false,
          error: null,
        }
      })
      return created
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : String(err) })
      return null
    }
  },

  setActiveMap: async (mapId) => {
    try {
      const res = await fetch(getEndpoint(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'master',
          action: 'setActive',
          mapId,
        }),
      })
      if (!res.ok) return false
      const data = (await res.json()) as { map?: TacticalMapState }
      set((s) => ({
        library: s.library.map((m) => ({ ...m, isActive: m.id === mapId })),
        masterMap:
          data.map && (!s.masterMap || s.masterMap.id === mapId)
            ? data.map
            : s.masterMap
              ? { ...s.masterMap, isActive: s.masterMap.id === mapId }
              : null,
      }))
      if (data.map && data.map.imageHash !== 'blank') {
        void get().ensureMapImage(data.map.id, data.map.imageHash, 'master')
      }
      return true
    } catch {
      return false
    }
  },

  updateMasterMap: async (mapId, patch) => {
    const seq = ++masterMutationSeq
    const prev = get().masterMap
    if (prev && prev.id === mapId) {
      const nextGrid = patch.grid ?? prev.grid
      const nextWalls = patch.walls ?? prev.walls
      const nextTokens = patch.tokens ?? prev.tokens
      const nextFogBase = patch.fog ?? prev.fog
      const vis = computePartyVisibility(nextTokens, nextGrid, nextWalls, nextFogBase)
      set({
        masterMap: {
          ...prev,
          name: patch.name ?? prev.name,
          imageWidth: patch.imageWidth ?? prev.imageWidth,
          imageHeight: patch.imageHeight ?? prev.imageHeight,
          grid: nextGrid,
          walls: nextWalls,
          tokens: nextTokens,
          fog: {
            exploredCells: vis.exploredCells,
            manualRevealedCells: nextFogBase.manualRevealedCells,
            manualHiddenCells: nextFogBase.manualHiddenCells,
          },
          updatedAt: Date.now(),
        },
      })
    }

    const runPatch = async (): Promise<boolean> => {
      try {
        const res = await fetch(getEndpoint(), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'master',
            action: 'updateMap',
            mapId,
            ...patch,
          }),
        })
        if (!res.ok) {
          if (prev && seq === masterMutationSeq) set({ masterMap: prev })
          return false
        }
        const data = (await res.json()) as {
          map?: TacticalMapState
          summary?: TacticalMapSummary
        }
        if (data.map) {
          const saved = data.map
          set((s) => {
            const nextCache =
              patch.imageData && saved.imageHash && saved.imageHash !== 'blank'
                ? { ...s.imageCache, [`${saved.id}:${saved.imageHash}`]: patch.imageData }
                : s.imageCache
            const nextLib = data.summary
              ? s.library.map((m) => (m.id === saved.id ? data.summary! : m))
              : s.library
            return {
              masterMap:
                seq === masterMutationSeq && s.masterMap?.id === saved.id
                  ? saved
                  : s.masterMap,
              library: nextLib,
              imageCache: nextCache,
              error: null,
            }
          })
        }
        return true
      } catch {
        if (prev && seq === masterMutationSeq) set({ masterMap: prev })
        return false
      }
    }

    const chained = masterPatchChain.then(runPatch, runPatch)
    masterPatchChain = chained.then(
      () => undefined,
      () => undefined
    )
    return chained
  },

  fogOverride: async (mapId, mode, cells) => {
    try {
      const res = await fetch(getEndpoint(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'master',
          action: 'fogOverride',
          mapId,
          mode,
          ...(cells ? { cells } : {}),
        }),
      })
      if (!res.ok) return false
      const data = (await res.json()) as { map?: TacticalMapState }
      if (data.map) {
        set((s) => ({
          masterMap: s.masterMap?.id === mapId ? data.map! : s.masterMap,
        }))
      }
      return true
    } catch {
      return false
    }
  },

  deleteMap: async (mapId) => {
    try {
      const res = await fetch(`${getEndpoint()}?id=${encodeURIComponent(mapId)}&role=master`, {
        method: 'DELETE',
      })
      if (!res.ok) return false
      set((s) => {
        const remaining = s.library.filter((m) => m.id !== mapId)
        const nextMaster = s.masterMap?.id === mapId ? null : s.masterMap
        return { library: remaining, masterMap: nextMaster }
      })
      const nextFirst = get().library[0]
      if (!get().masterMap && nextFirst) {
        await get().loadMasterMap(nextFirst.id)
      }
      return true
    } catch {
      return false
    }
  },
}))
