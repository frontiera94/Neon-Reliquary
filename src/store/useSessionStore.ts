import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SessionState, ActiveSummon } from '../types/session'
import type { ConditionType, BuffToggle, ActionEconomyState } from '../types/combat'
import type { CoinPurse } from '../types/inventory'
import type { Spell } from '../types/resources'
import { spellToBuff } from '../lib/spell-buffs'
import { expandPreparedSpells, normalizePreparedSpells } from '../lib/spell-availability'

interface SessionStore {
  sessions: Record<string, SessionState>
  getSession: (characterId: string) => SessionState
  setHp: (characterId: string, hp: number) => void
  adjustHp: (characterId: string, delta: number, maxHp: number) => void
  /** Atomic PF1e damage: absorbs temp HP first, clamps at -CON. */
  applyDamage: (characterId: string, damage: number, conScore?: number) => void
  /** Atomic PF1e healing: clears nonlethal first, then restores HP to max. */
  applyHealing: (characterId: string, healing: number, maxHp?: number) => void
  setTempHp: (characterId: string, temp: number) => void
  setNonlethal: (characterId: string, nl: number) => void
  spendResource: (characterId: string, resourceId: string, max: number) => void
  recoverResource: (characterId: string, resourceId: string) => void
  setResourceSpent: (characterId: string, resourceId: string, amount: number) => void
  toggleBuff: (characterId: string, buffId: string) => void
  addCustomBuff: (characterId: string, buff: BuffToggle) => void
  removeCustomBuff: (characterId: string, buffId: string) => void
  toggleSpellBuff: (characterId: string, spell: Spell) => void
  toggleCondition: (characterId: string, condition: ConditionType) => void
  toggleSpellPrepared: (characterId: string, spellId: string, level: number, slotMax: number) => void
  prepareSpell: (characterId: string, spellId: string, maxCopies?: number) => void
  unprepareSpell: (characterId: string, spellId: string) => void
  clearPreparedSpells: (characterId: string) => void
  toggleItemEquipped: (characterId: string, itemId: string) => void
  spendSpellSlot: (characterId: string, level: number, max: number) => void
  recoverSpellSlot: (characterId: string, level: number) => void
  setSpellSlotSpent: (characterId: string, level: number, amount: number) => void
  spendPreparedSpell: (characterId: string, spellId: string, maxCopies: number) => void
  recoverPreparedSpell: (characterId: string, spellId: string) => void
  setPreparedSpellSpent: (characterId: string, spellId: string, amount: number) => void
  setAmmo: (characterId: string, weaponId: string, amount: number) => void
  setItemQuantity: (characterId: string, itemId: string, qty: number) => void
  adjustItemQuantity: (characterId: string, itemId: string, delta: number) => void
  setCoins: (characterId: string, coins: CoinPurse) => void
  adjustCoin: (characterId: string, denom: keyof CoinPurse, delta: number) => void
  setSummon: (characterId: string, summon: ActiveSummon) => void
  adjustSummonHp: (characterId: string, delta: number) => void
  clearSummon: (characterId: string) => void
  setCompanionHp: (characterId: string, companionId: string, hp: number) => void
  adjustCompanionHp: (characterId: string, companionId: string, delta: number, maxHp: number) => void
  setCompanionTempHp: (characterId: string, companionId: string, temp: number) => void
  toggleCompanionCondition: (characterId: string, companionId: string, condition: ConditionType) => void
  setActiveCompanion: (characterId: string, companionId: string) => void
  toggleRoundAction: (characterId: string, action: keyof ActionEconomyState) => void
  resetRoundActions: (characterId: string) => void
  nextRound: (characterId: string) => void
  resetCombatRound: (characterId: string) => void
  setCombatRound: (characterId: string, round: number) => void
  initSession: (characterId: string, maxHp: number, startingCoins?: CoinPurse, initialEquippedIds?: string[]) => void
  hydrateSessions: (incoming: Record<string, SessionState>) => void
  longRest: (characterId: string, maxHp: number) => void
}

export const defaultActionEconomy = (): ActionEconomyState => ({
  standard: false,
  move: false,
  swift: false,
  immediate: false,
  fullRound: false,
})

export function computeNextActionEconomy(
  current: ActionEconomyState,
  action: keyof ActionEconomyState
): ActionEconomyState {
  const nextVal = !current[action]
  const updated: ActionEconomyState = { ...current, [action]: nextVal }

  if (action === 'fullRound') {
    updated.standard = nextVal
    updated.move = nextVal
  } else if (action === 'standard' || action === 'move') {
    if (!nextVal) {
      updated.fullRound = false
    } else if (updated.standard && updated.move) {
      updated.fullRound = true
    }
  }

  return updated
}

const defaultSession = (characterId: string, maxHp = 0, startingCoins?: CoinPurse, initialEquippedIds?: string[]): SessionState => ({
  characterId,
  currentHp: maxHp,
  tempHp: 0,
  nonlethalDamage: 0,
  spentResources: {},
  activeBuffIds: [],
  conditions: [],
  customBuffs: [],
  preparedSpells: {},
  preparedSpellIds: [],
  spentPreparedSpells: {},
  spentSpellSlots: {},
  ammo: {},
  activeSummon: null,
  itemQuantities: {},
  equippedItemIds: initialEquippedIds ?? [],
  coins: startingCoins ?? { gp: 0, sp: 0, cp: 0 },
  companionHp: {},
  companionTempHp: {},
  companionConditions: {},
  actionEconomy: defaultActionEconomy(),
  currentRound: 1,
})

/** Drops keys whose value is `undefined`/`null` so they cannot shadow defaults when spread. */
function definedEntries<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null)
  ) as Partial<T>
}

/**
 * Normalizes a session coming from an untrusted/legacy source (old localStorage
 * versions, Neon DB rows written by older clients) into a complete SessionState.
 * Any required field that is missing is back-filled from `defaultSession`, so
 * downstream code can safely call `.includes()` / `.filter()` on arrays.
 */
export function normalizePersistedSession(sess: SessionState): SessionState {
  const base = defaultSession(sess.characterId)
  // `activeSummon` is legitimately `null`, so restore it explicitly after the merge.
  const merged: SessionState = {
    ...base,
    ...definedEntries(sess),
    activeSummon: sess.activeSummon ?? null,
  }
  const preparedSpells = normalizePreparedSpells(sess.preparedSpells, sess.preparedSpellIds)
  const spentResources = Object.fromEntries(
    Object.entries(merged.spentResources).filter(([resourceId]) => !/^spells-\d+$/.test(resourceId))
  )
  const spentPreparedSpells = Object.fromEntries(
    Object.entries(merged.spentPreparedSpells ?? {})
      .map(([id, count]) => [id, Math.max(0, Math.floor(Number(count) || 0))] as const)
      .filter(([, count]) => count > 0)
  )
  return {
    ...merged,
    spentResources,
    preparedSpells,
    preparedSpellIds: expandPreparedSpells(preparedSpells),
    spentPreparedSpells,
  }
}

function migratePersistedSessions(persisted: unknown): unknown {
  const state = persisted as { sessions?: Record<string, SessionState> } | undefined
  if (!state?.sessions) return persisted
  return {
    ...state,
    sessions: Object.fromEntries(
      Object.entries(state.sessions).map(([id, sess]) => [
        id,
        normalizePersistedSession({ ...sess, characterId: sess.characterId || id }),
      ])
    ),
  }
}

type SessionsSlice = Pick<SessionStore, 'sessions'>

/**
 * Immutably applies a patch to one character's session.
 * - Missing sessions fall back to `defaultSession(id, fallbackMaxHp)`.
 * - Returning `null` from `update` signals a no-op: the original state object is
 *   returned unchanged so Zustand subscribers (incl. cloud sync) are not notified.
 */
function patchSession<S extends SessionsSlice>(
  state: S,
  id: string,
  update: (sess: SessionState) => Partial<SessionState> | null,
  fallbackMaxHp?: number
): S | SessionsSlice {
  const sess = state.sessions[id] ?? defaultSession(id, fallbackMaxHp)
  const patch = update(sess)
  if (patch === null) return state
  return {
    sessions: {
      ...state.sessions,
      [id]: { ...sess, ...patch },
    },
  }
}

function toggleInList<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

/** Sets `map[key] = amount`, or deletes the key when `amount <= 0`. */
function setOrDelete<K extends string | number>(
  map: Record<K, number>,
  key: K,
  amount: number
): Record<K, number> {
  const next = { ...map }
  if (amount <= 0) delete next[key]
  else next[key] = amount
  return next
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => {
      /** Shorthand: patch one character's session inside a Zustand `set`. */
      const update = (
        id: string,
        fn: (sess: SessionState) => Partial<SessionState> | null,
        fallbackMaxHp?: number
      ) => set((s) => patchSession(s, id, fn, fallbackMaxHp))

      return {
        sessions: {},

        getSession: (id) => get().sessions[id] ?? defaultSession(id),

        initSession: (id, maxHp, startingCoins, initialEquippedIds) =>
          set((s) => {
            const existing = s.sessions[id]
            if (!existing) {
              return {
                sessions: {
                  ...s.sessions,
                  [id]: defaultSession(id, maxHp, startingCoins, initialEquippedIds),
                },
              }
            }
            if (existing.equippedItemIds === undefined && initialEquippedIds) {
              return patchSession(s, id, () => ({ equippedItemIds: initialEquippedIds }))
            }
            return s
          }),

        // ─── HP ────────────────────────────────────────────────────────────────

        setHp: (id, hp) => update(id, () => ({ currentHp: hp })),

        adjustHp: (id, delta, maxHp) =>
          update(id, (sess) => ({ currentHp: Math.min(maxHp, sess.currentHp + delta) }), maxHp),

        applyDamage: (id, damage, conScore = 10) =>
          update(id, (sess) => {
            if (damage <= 0) return null
            const absorbedByTemp = Math.min(sess.tempHp, damage)
            const remainingDamage = damage - absorbedByTemp
            const deathThreshold = -Math.max(1, conScore)
            return {
              tempHp: sess.tempHp - absorbedByTemp,
              currentHp: Math.max(deathThreshold, sess.currentHp - remainingDamage),
            }
          }),

        applyHealing: (id, healing, maxHp = Number.MAX_SAFE_INTEGER) =>
          update(id, (sess) => {
            if (healing <= 0) return null
            const nonlethalCleared = Math.min(sess.nonlethalDamage, healing)
            const remainingHealing = healing - nonlethalCleared
            return {
              nonlethalDamage: sess.nonlethalDamage - nonlethalCleared,
              currentHp: Math.min(maxHp, sess.currentHp + remainingHealing),
            }
          }),

        setTempHp: (id, temp) => update(id, () => ({ tempHp: temp })),

        setNonlethal: (id, nl) => update(id, () => ({ nonlethalDamage: nl })),

        // ─── Daily resources ───────────────────────────────────────────────────

        spendResource: (id, resourceId, max) =>
          update(id, (sess) => {
            const current = sess.spentResources[resourceId] ?? 0
            if (current >= max) return null
            return { spentResources: { ...sess.spentResources, [resourceId]: current + 1 } }
          }),

        setResourceSpent: (id, resourceId, amount) =>
          update(id, (sess) => ({
            spentResources: { ...sess.spentResources, [resourceId]: amount },
          })),

        recoverResource: (id, resourceId) =>
          update(id, (sess) => {
            const current = sess.spentResources[resourceId] ?? 0
            if (current <= 0) return null
            return { spentResources: { ...sess.spentResources, [resourceId]: current - 1 } }
          }),

        // ─── Buffs & conditions ────────────────────────────────────────────────

        toggleBuff: (id, buffId) =>
          update(id, (sess) => ({ activeBuffIds: toggleInList(sess.activeBuffIds, buffId) })),

        addCustomBuff: (id, buff) =>
          update(id, (sess) => {
            const existing = sess.customBuffs ?? []
            const customBuffs = existing.some((b) => b.id === buff.id)
              ? existing.map((b) => (b.id === buff.id ? buff : b))
              : [...existing, buff]
            const activeBuffIds = sess.activeBuffIds.includes(buff.id)
              ? sess.activeBuffIds
              : [...sess.activeBuffIds, buff.id]
            return { customBuffs, activeBuffIds }
          }),

        removeCustomBuff: (id, buffId) =>
          update(id, (sess) => ({
            customBuffs: (sess.customBuffs ?? []).filter((b) => b.id !== buffId),
            activeBuffIds: sess.activeBuffIds.filter((b) => b !== buffId),
          })),

        toggleSpellBuff: (id, spell) =>
          update(id, (sess) => {
            const buffId = `spell-buff-${spell.id}`
            const exists = (sess.customBuffs ?? []).some((b) => b.id === buffId)
            if (exists) {
              return { activeBuffIds: toggleInList(sess.activeBuffIds, buffId) }
            }
            return {
              customBuffs: [...(sess.customBuffs ?? []), spellToBuff(spell)],
              // Guard against a stale active id without its buff definition.
              activeBuffIds: sess.activeBuffIds.includes(buffId)
                ? sess.activeBuffIds
                : [...sess.activeBuffIds, buffId],
            }
          }),

        toggleCondition: (id, condition) =>
          update(id, (sess) => ({ conditions: toggleInList(sess.conditions, condition) })),

        // ─── Spell preparation ─────────────────────────────────────────────────

        toggleSpellPrepared: (id, spellId, _level, slotMax) =>
          update(id, (sess) => {
            const prepared = normalizePreparedSpells(sess.preparedSpells, sess.preparedSpellIds)
            const current = prepared[spellId] ?? 0
            const nextSpent = { ...(sess.spentPreparedSpells ?? {}) }
            if (current > 0) {
              delete prepared[spellId]
              delete nextSpent[spellId]
            } else if (slotMax > 0) {
              prepared[spellId] = 1
            } else {
              return null
            }
            return {
              preparedSpells: prepared,
              preparedSpellIds: expandPreparedSpells(prepared),
              spentPreparedSpells: nextSpent,
            }
          }),

        prepareSpell: (id, spellId, maxCopies = Number.MAX_SAFE_INTEGER) =>
          update(id, (sess) => {
            const prepared = normalizePreparedSpells(sess.preparedSpells, sess.preparedSpellIds)
            const current = prepared[spellId] ?? 0
            if (current >= Math.max(0, maxCopies)) return null
            prepared[spellId] = current + 1
            return {
              preparedSpells: prepared,
              preparedSpellIds: expandPreparedSpells(prepared),
            }
          }),

        unprepareSpell: (id, spellId) =>
          update(id, (sess) => {
            const prepared = normalizePreparedSpells(sess.preparedSpells, sess.preparedSpellIds)
            const current = prepared[spellId] ?? 0
            if (current <= 0) return null
            const nextSpent = { ...(sess.spentPreparedSpells ?? {}) }
            if (current === 1) {
              delete prepared[spellId]
              delete nextSpent[spellId]
            } else {
              prepared[spellId] = current - 1
              if ((nextSpent[spellId] ?? 0) > current - 1) {
                nextSpent[spellId] = current - 1
              }
            }
            return {
              preparedSpells: prepared,
              preparedSpellIds: expandPreparedSpells(prepared),
              spentPreparedSpells: nextSpent,
            }
          }),

        clearPreparedSpells: (id) =>
          update(id, () => ({
            preparedSpells: {},
            preparedSpellIds: [],
            spentPreparedSpells: {},
          })),

        // ─── Spell slots & prepared uses ───────────────────────────────────────

        spendSpellSlot: (id, level, max) =>
          update(id, (sess) => {
            const current = sess.spentSpellSlots[level] ?? 0
            if (max <= 0 || current >= max) return null
            return { spentSpellSlots: { ...sess.spentSpellSlots, [level]: current + 1 } }
          }),

        recoverSpellSlot: (id, level) =>
          update(id, (sess) => {
            const current = sess.spentSpellSlots[level] ?? 0
            if (current <= 0) return null
            return {
              spentSpellSlots: { ...sess.spentSpellSlots, [level]: Math.max(0, current - 1) },
            }
          }),

        setSpellSlotSpent: (id, level, amount) =>
          update(id, (sess) => ({
            spentSpellSlots: setOrDelete(sess.spentSpellSlots, level, amount),
          })),

        spendPreparedSpell: (id, spellId, maxCopies) =>
          update(id, (sess) => {
            const current = sess.spentPreparedSpells?.[spellId] ?? 0
            if (maxCopies <= 0 || current >= maxCopies) return null
            return {
              spentPreparedSpells: { ...(sess.spentPreparedSpells ?? {}), [spellId]: current + 1 },
            }
          }),

        recoverPreparedSpell: (id, spellId) =>
          update(id, (sess) => {
            const current = sess.spentPreparedSpells?.[spellId] ?? 0
            if (current <= 0) return null
            return {
              spentPreparedSpells: setOrDelete(sess.spentPreparedSpells ?? {}, spellId, current - 1),
            }
          }),

        setPreparedSpellSpent: (id, spellId, amount) =>
          update(id, (sess) => ({
            spentPreparedSpells: setOrDelete(sess.spentPreparedSpells ?? {}, spellId, amount),
          })),

        // ─── Inventory ─────────────────────────────────────────────────────────

        toggleItemEquipped: (id, itemId) =>
          update(id, (sess) => ({
            equippedItemIds: toggleInList(sess.equippedItemIds ?? [], itemId),
          })),

        setAmmo: (id, weaponId, amount) =>
          update(id, (sess) => ({ ammo: { ...sess.ammo, [weaponId]: amount } })),

        setItemQuantity: (id, itemId, qty) =>
          update(id, (sess) => ({
            itemQuantities: { ...sess.itemQuantities, [itemId]: Math.max(0, qty) },
          })),

        adjustItemQuantity: (id, itemId, delta) =>
          update(id, (sess) => {
            const current = sess.itemQuantities[itemId] ?? 0
            return {
              itemQuantities: { ...sess.itemQuantities, [itemId]: Math.max(0, current + delta) },
            }
          }),

        setCoins: (id, coins) => update(id, () => ({ coins })),

        adjustCoin: (id, denom, delta) =>
          update(id, (sess) => ({
            coins: { ...sess.coins, [denom]: Math.max(0, (sess.coins[denom] ?? 0) + delta) },
          })),

        // ─── Summons ───────────────────────────────────────────────────────────

        setSummon: (id, summon) => update(id, () => ({ activeSummon: summon })),

        adjustSummonHp: (id, delta) =>
          update(id, (sess) => {
            if (!sess.activeSummon) return null
            return {
              activeSummon: {
                ...sess.activeSummon,
                currentHp: Math.max(0, sess.activeSummon.currentHp + delta),
              },
            }
          }),

        clearSummon: (id) => update(id, () => ({ activeSummon: null })),

        // ─── Companions ────────────────────────────────────────────────────────

        setCompanionHp: (charId, companionId, hp) =>
          update(charId, (sess) => ({
            companionHp: { ...(sess.companionHp ?? {}), [companionId]: hp },
          })),

        adjustCompanionHp: (charId, companionId, delta, maxHp) =>
          update(charId, (sess) => {
            const current = sess.companionHp?.[companionId] ?? maxHp
            return {
              companionHp: {
                ...(sess.companionHp ?? {}),
                [companionId]: Math.min(maxHp, current + delta),
              },
            }
          }),

        setCompanionTempHp: (charId, companionId, temp) =>
          update(charId, (sess) => ({
            companionTempHp: { ...(sess.companionTempHp ?? {}), [companionId]: temp },
          })),

        toggleCompanionCondition: (charId, companionId, condition) =>
          update(charId, (sess) => ({
            companionConditions: {
              ...(sess.companionConditions ?? {}),
              [companionId]: toggleInList(sess.companionConditions?.[companionId] ?? [], condition),
            },
          })),

        setActiveCompanion: (charId, companionId) =>
          update(charId, () => ({ activeCompanionId: companionId })),

        // ─── Action economy / rounds ───────────────────────────────────────────

        toggleRoundAction: (charId, action) =>
          update(charId, (sess) => ({
            actionEconomy: computeNextActionEconomy(sess.actionEconomy ?? defaultActionEconomy(), action),
          })),

        // Kept as an alias of `nextRound` for backwards compatibility: clearing the
        // action tracker ends the current round.
        resetRoundActions: (charId) =>
          update(charId, (sess) => ({
            actionEconomy: defaultActionEconomy(),
            currentRound: (sess.currentRound ?? 1) + 1,
          })),

        nextRound: (charId) =>
          update(charId, (sess) => ({
            actionEconomy: defaultActionEconomy(),
            currentRound: (sess.currentRound ?? 1) + 1,
          })),

        resetCombatRound: (charId) =>
          update(charId, () => ({
            actionEconomy: defaultActionEconomy(),
            currentRound: 1,
          })),

        setCombatRound: (charId, round) =>
          update(charId, () => ({ currentRound: Math.max(1, round) })),

        // ─── Bulk ──────────────────────────────────────────────────────────────

        hydrateSessions: (incoming) =>
          set((s) => {
            const entries = Object.entries(incoming)
            if (entries.length === 0) return s
            const normalized = Object.fromEntries(
              entries.map(([id, sess]) => [
                id,
                normalizePersistedSession({ ...sess, characterId: sess.characterId || id }),
              ])
            )
            return { sessions: { ...s.sessions, ...normalized } }
          }),

        longRest: (id, maxHp) =>
          update(
            id,
            (current) => ({
              currentHp: maxHp,
              tempHp: 0,
              nonlethalDamage: 0,
              spentResources: {},
              spentSpellSlots: {},
              spentPreparedSpells: {},
              preparedSpells: current.preparedSpells ?? {},
              preparedSpellIds: current.preparedSpellIds ?? [],
              activeBuffIds: [],
              conditions: [],
              activeSummon: null,
              companionHp: {},
              companionTempHp: {},
              companionConditions: {},
              actionEconomy: defaultActionEconomy(),
              currentRound: 1,
            }),
            maxHp
          ),
      }
    },
    {
      name: 'neon-sessions',
      version: 2,
      migrate: migratePersistedSessions,
    }
  )
)
