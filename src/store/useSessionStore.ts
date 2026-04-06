import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SessionState } from '../types/session'
import type { ConditionType } from '../types/combat'

interface SessionStore {
  sessions: Record<string, SessionState>
  getSession: (characterId: string) => SessionState
  setHp: (characterId: string, hp: number) => void
  adjustHp: (characterId: string, delta: number, maxHp: number) => void
  setTempHp: (characterId: string, temp: number) => void
  setNonlethal: (characterId: string, nl: number) => void
  spendResource: (characterId: string, resourceId: string, max: number) => void
  recoverResource: (characterId: string, resourceId: string) => void
  setResourceSpent: (characterId: string, resourceId: string, amount: number) => void
  toggleBuff: (characterId: string, buffId: string) => void
  toggleCondition: (characterId: string, condition: ConditionType) => void
  toggleSpellPrepared: (characterId: string, spellId: string, level: number, slotMax: number) => void
  spendSpellSlot: (characterId: string, level: number, max: number) => void
  recoverSpellSlot: (characterId: string, level: number) => void
  setAmmo: (characterId: string, weaponId: string, amount: number) => void
  initSession: (characterId: string, maxHp: number) => void
}

const defaultSession = (characterId: string, maxHp = 0): SessionState => ({
  characterId,
  currentHp: maxHp,
  tempHp: 0,
  nonlethalDamage: 0,
  spentResources: {},
  activeBuffIds: [],
  conditions: [],
  preparedSpellIds: [],
  spentSpellSlots: {},
  ammo: {},
})

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessions: {},

      getSession: (id) =>
        get().sessions[id] ?? defaultSession(id),

      initSession: (id, maxHp) =>
        set((s) => ({
          sessions: s.sessions[id]
            ? s.sessions
            : { ...s.sessions, [id]: defaultSession(id, maxHp) },
        })),

      setHp: (id, hp) =>
        set((s) => ({
          sessions: {
            ...s.sessions,
            [id]: { ...(s.sessions[id] ?? defaultSession(id)), currentHp: hp },
          },
        })),

      adjustHp: (id, delta, maxHp) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id, maxHp)
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                currentHp: Math.min(maxHp, sess.currentHp + delta),
              },
            },
          }
        }),

      setTempHp: (id, temp) =>
        set((s) => ({
          sessions: {
            ...s.sessions,
            [id]: { ...(s.sessions[id] ?? defaultSession(id)), tempHp: temp },
          },
        })),

      setNonlethal: (id, nl) =>
        set((s) => ({
          sessions: {
            ...s.sessions,
            [id]: {
              ...(s.sessions[id] ?? defaultSession(id)),
              nonlethalDamage: nl,
            },
          },
        })),

      spendResource: (id, resourceId, max) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const current = sess.spentResources[resourceId] ?? 0
          if (current >= max) return s
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                spentResources: {
                  ...sess.spentResources,
                  [resourceId]: current + 1,
                },
              },
            },
          }
        }),

      setResourceSpent: (id, resourceId, amount) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                spentResources: { ...sess.spentResources, [resourceId]: amount },
              },
            },
          }
        }),

      recoverResource: (id, resourceId) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const current = sess.spentResources[resourceId] ?? 0
          if (current <= 0) return s
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                spentResources: {
                  ...sess.spentResources,
                  [resourceId]: current - 1,
                },
              },
            },
          }
        }),

      toggleBuff: (id, buffId) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const active = sess.activeBuffIds.includes(buffId)
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                activeBuffIds: active
                  ? sess.activeBuffIds.filter((b) => b !== buffId)
                  : [...sess.activeBuffIds, buffId],
              },
            },
          }
        }),

      toggleCondition: (id, condition) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const has = sess.conditions.includes(condition)
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                conditions: has
                  ? sess.conditions.filter((c) => c !== condition)
                  : [...sess.conditions, condition],
              },
            },
          }
        }),

      toggleSpellPrepared: (id, spellId, level, slotMax) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const isPrepared = sess.preparedSpellIds.includes(spellId)
          const currentSpent = sess.spentSpellSlots[level] ?? 0
          // Preparing: spend a slot if available. Unpreparing: recover a slot.
          const newSpent = isPrepared
            ? Math.max(0, currentSpent - 1)
            : Math.min(slotMax, currentSpent + 1)
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                preparedSpellIds: isPrepared
                  ? sess.preparedSpellIds.filter((x) => x !== spellId)
                  : [...sess.preparedSpellIds, spellId],
                spentSpellSlots: {
                  ...sess.spentSpellSlots,
                  [level]: newSpent,
                },
              },
            },
          }
        }),

      spendSpellSlot: (id, level, max) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const current = sess.spentSpellSlots[level] ?? 0
          if (current >= max) return s
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                spentSpellSlots: {
                  ...sess.spentSpellSlots,
                  [level]: current + 1,
                },
              },
            },
          }
        }),

      recoverSpellSlot: (id, level) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const current = sess.spentSpellSlots[level] ?? 0
          if (current <= 0) return s
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                spentSpellSlots: {
                  ...sess.spentSpellSlots,
                  [level]: current - 1,
                },
              },
            },
          }
        }),

      setAmmo: (id, weaponId, amount) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                ammo: { ...sess.ammo, [weaponId]: amount },
              },
            },
          }
        }),
    }),
    { name: 'neon-sessions' }
  )
)
