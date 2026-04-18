import { create } from 'zustand'
import type { PublicMapState, Token, Shape, Label } from '../types/map'
import { pushMap } from '../lib/map-api'
import { paintFog as fogPaint, paintRect as fogPaintRect } from '../lib/fog-utils'

interface MapStore {
  map: PublicMapState | null
  isPushing: boolean
  setMap: (state: PublicMapState) => void
  clearMap: () => void
  addToken: (token: Token) => void
  moveToken: (id: string, pos: { x: number; y: number }) => void
  editHP: (id: string, delta: number) => void
  addShape: (shape: Shape) => void
  removeShape: (id: string) => void
  addLabel: (label: Label) => void
  removeLabel: (id: string) => void
  paintFog: (col: number, row: number, hidden: boolean) => void
  paintFogRect: (startCol: number, startRow: number, endCol: number, endRow: number, hidden: boolean) => void
  setBackground: (bg: { url: string; width: number; height: number } | null) => void
  setInitiativeOrder: (order: string[]) => void
  advanceTurn: () => void
  setTokenInitiative: (tokenId: string, value: number | null) => void
  scheduleSync: (mapId: string, secret: string) => void
}

let syncTimer: ReturnType<typeof setTimeout> | null = null

export const useMapStore = create<MapStore>()((set, get) => ({
  map: null,
  isPushing: false,

  setMap: (state) => set({ map: state }),

  clearMap: () => set({ map: null }),

  addToken: (token) =>
    set((s) => {
      if (!s.map) return s
      const alreadyInOrder = s.map.initiative.order.includes(token.id)
      return {
        map: {
          ...s.map,
          tokens: [...s.map.tokens, token],
          initiative: alreadyInOrder
            ? s.map.initiative
            : { ...s.map.initiative, order: [...s.map.initiative.order, token.id] },
        },
      }
    }),

  moveToken: (id, pos) =>
    set((s) => {
      if (!s.map) return s
      return {
        map: {
          ...s.map,
          tokens: s.map.tokens.map((t) => (t.id === id ? { ...t, pos } : t)),
          updatedAt: Date.now(),
        },
      }
    }),

  editHP: (id, delta) =>
    set((s) => {
      if (!s.map) return s
      return {
        map: {
          ...s.map,
          tokens: s.map.tokens.map((t) =>
            t.id === id
              ? { ...t, hp: { ...t.hp, current: Math.max(0, Math.min(t.hp.max, t.hp.current + delta)) } }
              : t
          ),
          updatedAt: Date.now(),
        },
      }
    }),

  addShape: (shape) =>
    set((s) => {
      if (!s.map) return s
      return {
        map: {
          ...s.map,
          shapes: [...s.map.shapes, shape],
          updatedAt: Date.now(),
        },
      }
    }),

  removeShape: (id) =>
    set((s) => {
      if (!s.map) return s
      return {
        map: {
          ...s.map,
          shapes: s.map.shapes.filter((sh) => sh.id !== id),
        },
      }
    }),

  addLabel: (label) =>
    set((s) => {
      if (!s.map) return s
      return {
        map: {
          ...s.map,
          labels: [...s.map.labels, label],
        },
      }
    }),

  removeLabel: (id) =>
    set((s) => {
      if (!s.map) return s
      return {
        map: {
          ...s.map,
          labels: s.map.labels.filter((l) => l.id !== id),
        },
      }
    }),

  paintFog: (col, row, hidden) =>
    set((s) => {
      if (!s.map) return s
      return {
        map: {
          ...s.map,
          fog: fogPaint(s.map.fog, col, row, hidden),
          updatedAt: Date.now(),
        },
      }
    }),

  paintFogRect: (startCol, startRow, endCol, endRow, hidden) =>
    set((s) => {
      if (!s.map) return s
      return {
        map: {
          ...s.map,
          fog: fogPaintRect(s.map.fog, startCol, startRow, endCol, endRow, hidden),
          updatedAt: Date.now(),
        },
      }
    }),

  setBackground: (bg) =>
    set((s) => {
      if (!s.map) return s
      return {
        map: {
          ...s.map,
          background: bg,
        },
      }
    }),

  setInitiativeOrder: (order) =>
    set((s) => {
      if (!s.map) return s
      const changed =
        order.length !== s.map.initiative.order.length ||
        order.some((id, i) => s.map!.initiative.order[i] !== id)
      return {
        map: {
          ...s.map,
          initiative: {
            ...s.map.initiative,
            order,
            currentIndex: changed ? 0 : s.map.initiative.currentIndex,
          },
        },
      }
    }),

  advanceTurn: () =>
    set((s) => {
      if (!s.map) return s
      const { order, currentIndex, round } = s.map.initiative
      const next = currentIndex + 1
      if (next >= order.length) {
        return {
          map: {
            ...s.map,
            initiative: { order, currentIndex: 0, round: round + 1 },
          },
        }
      }
      return {
        map: {
          ...s.map,
          initiative: { order, currentIndex: next, round },
        },
      }
    }),

  setTokenInitiative: (tokenId, value) =>
    set((s) => {
      if (!s.map) return s
      const updatedTokens = s.map.tokens.map((t) =>
        t.id === tokenId ? { ...t, initiative: value } : t
      )
      const tokenMap = new Map(updatedTokens.map((t) => [t.id, t]))
      const sortedOrder = [...s.map.initiative.order].sort((a, b) => {
        const ta = tokenMap.get(a)
        const tb = tokenMap.get(b)
        const ia = ta?.initiative ?? null
        const ib = tb?.initiative ?? null
        if (ia === null && ib === null) return 0
        if (ia === null) return 1
        if (ib === null) return -1
        return ib - ia
      })
      return {
        map: {
          ...s.map,
          tokens: updatedTokens,
          initiative: { ...s.map.initiative, order: sortedOrder },
        },
      }
    }),

  scheduleSync: (mapId, secret) => {
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(async () => {
      const { map } = get()
      if (!map) return
      set({ isPushing: true })
      try {
        await pushMap(mapId, secret, map)
      } catch (e) {
        console.error('Map sync failed:', e)
      } finally {
        set({ isPushing: false })
      }
    }, 300)
  },
}))
