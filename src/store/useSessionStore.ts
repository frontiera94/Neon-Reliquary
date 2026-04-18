import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SessionState, ActiveSummon } from '../types/session'
import type { ConditionType } from '../types/combat'
import type { CoinPurse } from '../types/inventory'

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
  setItemQuantity: (characterId: string, itemId: string, qty: number) => void
  adjustItemQuantity: (characterId: string, itemId: string, delta: number) => void
  setCoins: (characterId: string, coins: CoinPurse) => void
  adjustCoin: (characterId: string, denom: keyof CoinPurse, delta: number) => void
  setSummon: (characterId: string, summon: ActiveSummon) => void
  adjustSummonHp: (characterId: string, delta: number) => void
  clearSummon: (characterId: string) => void
  initSession: (characterId: string, maxHp: number, startingCoins?: CoinPurse) => void
  longRest: (characterId: string, maxHp: number) => void
}

const defaultSession = (characterId: string, maxHp = 0, startingCoins?: CoinPurse): SessionState => ({
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
  activeSummon: null,
  itemQuantities: {},
  coins: startingCoins ?? { gp: 0, sp: 0, cp: 0 },
})

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessions: {},

      getSession: (id) =>
        get().sessions[id] ?? defaultSession(id),

      initSession: (id, maxHp, startingCoins) =>
        set((s) => ({
          sessions: s.sessions[id]
            ? s.sessions
            : { ...s.sessions, [id]: defaultSession(id, maxHp, startingCoins) },
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
              [id]: { ...sess, ammo: { ...sess.ammo, [weaponId]: amount } },
            },
          }
        }),

      setItemQuantity: (id, itemId, qty) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          return {
            sessions: {
              ...s.sessions,
              [id]: { ...sess, itemQuantities: { ...sess.itemQuantities, [itemId]: Math.max(0, qty) } },
            },
          }
        }),

      adjustItemQuantity: (id, itemId, delta) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const current = sess.itemQuantities[itemId] ?? 0
          return {
            sessions: {
              ...s.sessions,
              [id]: { ...sess, itemQuantities: { ...sess.itemQuantities, [itemId]: Math.max(0, current + delta) } },
            },
          }
        }),

      setCoins: (id, coins) =>
        set((s) => ({
          sessions: {
            ...s.sessions,
            [id]: { ...(s.sessions[id] ?? defaultSession(id)), coins },
          },
        })),

      adjustCoin: (id, denom, delta) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          return {
            sessions: {
              ...s.sessions,
              [id]: { ...sess, coins: { ...sess.coins, [denom]: Math.max(0, (sess.coins[denom] ?? 0) + delta) } },
            },
          }
        }),

      setSummon: (id, summon) =>
        set((s) => ({
          sessions: {
            ...s.sessions,
            [id]: { ...(s.sessions[id] ?? defaultSession(id)), activeSummon: summon },
          },
        })),

      adjustSummonHp: (id, delta) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          if (!sess.activeSummon) return s
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                activeSummon: {
                  ...sess.activeSummon,
                  currentHp: Math.max(0, sess.activeSummon.currentHp + delta),
                },
              },
            },
          }
        }),

      clearSummon: (id) =>
        set((s) => ({
          sessions: {
            ...s.sessions,
            [id]: { ...(s.sessions[id] ?? defaultSession(id)), activeSummon: null },
          },
        })),

      longRest: (id, maxHp) =>
        set((s) => ({
          sessions: {
            ...s.sessions,
            [id]: {
              ...(s.sessions[id] ?? defaultSession(id, maxHp)),
              currentHp: maxHp,
              tempHp: 0,
              nonlethalDamage: 0,
              spentResources: {},
              spentSpellSlots: {},
              preparedSpellIds: [],
              activeBuffIds: [],
              conditions: [],
              activeSummon: null,
            },
          },
        })),
    }),
    { name: 'neon-sessions' }
  )
)
