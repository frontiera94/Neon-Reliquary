import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SessionState, ActiveSummon } from '../types/session'
import type { ConditionType, BuffToggle, ActionEconomyState } from '../types/combat'
import type { CoinPurse } from '../types/inventory'
import type { Spell } from '../types/resources'
import type { FullCharacter } from './useCharacterStore'
import type {
  WildShapePreset,
  HeldSpellstrike,
  ActiveHex,
  DebilitatingInjuryType,
} from '../types/class-mechanics'
import {
  createDefaultClassMechanics,
  normalizeClassMechanics,
  resetClassMechanicsOnLongRest,
} from '../types/class-mechanics'
import {
  advanceTurnMechanics,
  calcBloodrageHpShift,
  calcFatigueRounds,
  checkBloodrageExitSafety,
} from '../lib/class-mechanics'
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
  advanceCharacterTurn: (characterId: string, character: FullCharacter) => void
  setWildShape: (characterId: string, preset: WildShapePreset | null) => void
  setHeldSpellstrike: (characterId: string, spellstrike: HeldSpellstrike | null) => void
  consumeSpellstrikeCharge: (characterId: string) => void
  setSpellCombat: (characterId: string, active: boolean, sacrifice?: number) => void
  activateArcaneWeapon: (characterId: string, bonus?: number) => void
  enterBloodrage: (characterId: string, character: FullCharacter) => void
  exitBloodrage: (characterId: string, character: FullCharacter) => { isLethal: boolean; remainingHp: number }
  consumeFuriousFocus: (characterId: string) => void
  applyHex: (characterId: string, hex: Omit<ActiveHex, 'id'>) => void
  removeHex: (characterId: string, hexId: string) => void
  useCackle: (characterId: string) => boolean
  activateKiExtraAttack: (characterId: string) => void
  activateKiDefense: (characterId: string) => void
  activateKiSpeed: (characterId: string) => void
  useWholenessOfBody: (characterId: string, healingAmount?: number) => void
  declareStunningFist: (characterId: string, condition?: 'stunned' | 'fatigued') => void
  applyDebilitatingInjury: (characterId: string, type: DebilitatingInjuryType, targetName?: string) => void
  setUnderhanded: (characterId: string, ready: boolean) => void
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
    if (nextVal) {
      updated.standard = true
      updated.move = true
    } else {
      updated.standard = false
      updated.move = false
    }
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
  classMechanics: createDefaultClassMechanics(characterId),
})


export function normalizePersistedSession(sess: SessionState): SessionState {
  const preparedSpells = normalizePreparedSpells(sess.preparedSpells, sess.preparedSpellIds)
  const spentResources = Object.fromEntries(
    Object.entries(sess.spentResources ?? {}).filter(([resourceId]) => !/^spells-\d+$/.test(resourceId))
  )
  const spentPreparedSpells = Object.fromEntries(
    Object.entries(sess.spentPreparedSpells ?? {})
      .map(([id, count]) => [id, Math.max(0, Math.floor(Number(count) || 0))] as const)
      .filter(([, count]) => count > 0)
  )
  return {
    ...sess,
    spentResources,
    preparedSpells,
    preparedSpellIds: expandPreparedSpells(preparedSpells),
    spentPreparedSpells,
    itemQuantities: sess.itemQuantities ?? {},
    ammo: sess.ammo ?? {},
    equippedItemIds: sess.equippedItemIds ?? [],
    actionEconomy: sess.actionEconomy ?? defaultActionEconomy(),
    currentRound: sess.currentRound ?? 1,
    classMechanics: normalizeClassMechanics(sess.classMechanics, sess.characterId),
  }
}

function migratePersistedSessions(persisted: unknown): unknown {
  const state = persisted as { sessions?: Record<string, SessionState> } | undefined
  if (!state?.sessions) return persisted
  return {
    ...state,
    sessions: Object.fromEntries(
      Object.entries(state.sessions).map(([id, sess]) => [id, normalizePersistedSession(sess)])
    ),
  }
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessions: {},

      getSession: (id) =>
        get().sessions[id] ?? defaultSession(id),

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
            return {
              sessions: {
                ...s.sessions,
                [id]: {
                  ...existing,
                  equippedItemIds: initialEquippedIds,
                },
              },
            }
          }
          return s
        }),

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

      applyDamage: (id, damage, conScore = 10) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          if (damage <= 0) return s
          const absorbedByTemp = Math.min(sess.tempHp, damage)
          const remainingDamage = damage - absorbedByTemp
          const deathThreshold = -Math.max(1, conScore)
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                tempHp: sess.tempHp - absorbedByTemp,
                currentHp: Math.max(deathThreshold, sess.currentHp - remainingDamage),
              },
            },
          }
        }),

      applyHealing: (id, healing, maxHp = Number.MAX_SAFE_INTEGER) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          if (healing <= 0) return s
          const nonlethalCleared = Math.min(sess.nonlethalDamage, healing)
          const remainingHealing = healing - nonlethalCleared
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                nonlethalDamage: sess.nonlethalDamage - nonlethalCleared,
                currentHp: Math.min(maxHp, sess.currentHp + remainingHealing),
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

      addCustomBuff: (id, buff) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const existing = sess.customBuffs ?? []
          const updated = existing.some((b) => b.id === buff.id)
            ? existing.map((b) => (b.id === buff.id ? buff : b))
            : [...existing, buff]
          const activeBuffIds = sess.activeBuffIds.includes(buff.id)
            ? sess.activeBuffIds
            : [...sess.activeBuffIds, buff.id]
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                customBuffs: updated,
                activeBuffIds,
              },
            },
          }
        }),

      removeCustomBuff: (id, buffId) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                customBuffs: (sess.customBuffs ?? []).filter((b) => b.id !== buffId),
                activeBuffIds: sess.activeBuffIds.filter((b) => b !== buffId),
              },
            },
          }
        }),

      toggleSpellBuff: (id, spell) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const buffId = `spell-buff-${spell.id}`
          const exists = (sess.customBuffs ?? []).some((b) => b.id === buffId)
          const isActive = sess.activeBuffIds.includes(buffId)

          if (exists) {
            return {
              sessions: {
                ...s.sessions,
                [id]: {
                  ...sess,
                  activeBuffIds: isActive
                    ? sess.activeBuffIds.filter((b) => b !== buffId)
                    : [...sess.activeBuffIds, buffId],
                },
              },
            }
          }

          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                customBuffs: [...(sess.customBuffs ?? []), spellToBuff(spell)],
                activeBuffIds: [...sess.activeBuffIds, buffId],
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

      toggleSpellPrepared: (id, spellId, _level, slotMax) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const prepared = normalizePreparedSpells(sess.preparedSpells, sess.preparedSpellIds)
          const current = prepared[spellId] ?? 0
          const nextSpent = { ...(sess.spentPreparedSpells ?? {}) }
          if (current > 0) {
            delete prepared[spellId]
            delete nextSpent[spellId]
          } else if (slotMax > 0) {
            prepared[spellId] = 1
          }
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                preparedSpells: prepared,
                preparedSpellIds: expandPreparedSpells(prepared),
                spentPreparedSpells: nextSpent,
              },
            },
          }
        }),

      prepareSpell: (id, spellId, maxCopies = Number.MAX_SAFE_INTEGER) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const prepared = normalizePreparedSpells(sess.preparedSpells, sess.preparedSpellIds)
          const current = prepared[spellId] ?? 0
          if (current >= Math.max(0, maxCopies)) return s
          prepared[spellId] = current + 1
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                preparedSpells: prepared,
                preparedSpellIds: expandPreparedSpells(prepared),
              },
            },
          }
        }),

      unprepareSpell: (id, spellId) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const prepared = normalizePreparedSpells(sess.preparedSpells, sess.preparedSpellIds)
          const current = prepared[spellId] ?? 0
          if (current <= 0) return s
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
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                preparedSpells: prepared,
                preparedSpellIds: expandPreparedSpells(prepared),
                spentPreparedSpells: nextSpent,
              },
            },
          }
        }),

      clearPreparedSpells: (id) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                preparedSpells: {},
                preparedSpellIds: [],
                spentPreparedSpells: {},
              },
            },
          }
        }),

      toggleItemEquipped: (id, itemId) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const list = sess.equippedItemIds ?? []
          const has = list.includes(itemId)
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                equippedItemIds: has ? list.filter((x) => x !== itemId) : [...list, itemId],
              },
            },
          }
        }),

      spendSpellSlot: (id, level, max) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const current = sess.spentSpellSlots[level] ?? 0
          if (max <= 0 || current >= max) return s
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
                  [level]: Math.max(0, current - 1),
                },
              },
            },
          }
        }),

      setSpellSlotSpent: (id, level, amount) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const nextSpent = { ...sess.spentSpellSlots }
          if (amount <= 0) {
            delete nextSpent[level]
          } else {
            nextSpent[level] = amount
          }
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                spentSpellSlots: nextSpent,
              },
            },
          }
        }),

      spendPreparedSpell: (id, spellId, maxCopies) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const current = sess.spentPreparedSpells?.[spellId] ?? 0
          if (maxCopies <= 0 || current >= maxCopies) return s
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                spentPreparedSpells: {
                  ...(sess.spentPreparedSpells ?? {}),
                  [spellId]: current + 1,
                },
              },
            },
          }
        }),

      recoverPreparedSpell: (id, spellId) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const current = sess.spentPreparedSpells?.[spellId] ?? 0
          if (current <= 0) return s
          const nextSpent = { ...(sess.spentPreparedSpells ?? {}) }
          if (current === 1) {
            delete nextSpent[spellId]
          } else {
            nextSpent[spellId] = current - 1
          }
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                spentPreparedSpells: nextSpent,
              },
            },
          }
        }),

      setPreparedSpellSpent: (id, spellId, amount) =>
        set((s) => {
          const sess = s.sessions[id] ?? defaultSession(id)
          const nextSpent = { ...(sess.spentPreparedSpells ?? {}) }
          if (amount <= 0) {
            delete nextSpent[spellId]
          } else {
            nextSpent[spellId] = amount
          }
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...sess,
                spentPreparedSpells: nextSpent,
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

      setCompanionHp: (charId, companionId, hp) =>
        set((s) => {
          const sess = s.sessions[charId] ?? defaultSession(charId)
          return {
            sessions: {
              ...s.sessions,
              [charId]: {
                ...sess,
                companionHp: {
                  ...(sess.companionHp ?? {}),
                  [companionId]: hp,
                },
              },
            },
          }
        }),

      adjustCompanionHp: (charId, companionId, delta, maxHp) =>
        set((s) => {
          const sess = s.sessions[charId] ?? defaultSession(charId)
          const current = sess.companionHp?.[companionId] ?? maxHp
          return {
            sessions: {
              ...s.sessions,
              [charId]: {
                ...sess,
                companionHp: {
                  ...(sess.companionHp ?? {}),
                  [companionId]: Math.min(maxHp, current + delta),
                },
              },
            },
          }
        }),

      setCompanionTempHp: (charId, companionId, temp) =>
        set((s) => {
          const sess = s.sessions[charId] ?? defaultSession(charId)
          return {
            sessions: {
              ...s.sessions,
              [charId]: {
                ...sess,
                companionTempHp: {
                  ...(sess.companionTempHp ?? {}),
                  [companionId]: temp,
                },
              },
            },
          }
        }),

      toggleCompanionCondition: (charId, companionId, condition) =>
        set((s) => {
          const sess = s.sessions[charId] ?? defaultSession(charId)
          const currConds = sess.companionConditions?.[companionId] ?? []
          const updated = currConds.includes(condition)
            ? currConds.filter((c) => c !== condition)
            : [...currConds, condition]
          return {
            sessions: {
              ...s.sessions,
              [charId]: {
                ...sess,
                companionConditions: {
                  ...(sess.companionConditions ?? {}),
                  [companionId]: updated,
                },
              },
            },
          }
        }),

      setActiveCompanion: (charId, companionId) =>
        set((s) => {
          const sess = s.sessions[charId] ?? defaultSession(charId)
          return {
            sessions: {
              ...s.sessions,
              [charId]: {
                ...sess,
                activeCompanionId: companionId,
              },
            },
          }
        }),

      toggleRoundAction: (charId, action) =>
        set((s) => {
          const sess = s.sessions[charId] ?? defaultSession(charId)
          const current = sess.actionEconomy ?? defaultActionEconomy()
          const updated = computeNextActionEconomy(current, action)

          return {
            sessions: {
              ...s.sessions,
              [charId]: {
                ...sess,
                actionEconomy: updated,
              },
            },
          }
        }),

      resetRoundActions: (charId) =>
        set((s) => {
          const sess = s.sessions[charId] ?? defaultSession(charId)
          return {
            sessions: {
              ...s.sessions,
              [charId]: {
                ...sess,
                actionEconomy: defaultActionEconomy(),
                currentRound: (sess.currentRound ?? 1) + 1,
              },
            },
          }
        }),

      nextRound: (charId) =>
        set((s) => {
          const sess = s.sessions[charId] ?? defaultSession(charId)
          return {
            sessions: {
              ...s.sessions,
              [charId]: {
                ...sess,
                actionEconomy: defaultActionEconomy(),
                currentRound: (sess.currentRound ?? 1) + 1,
              },
            },
          }
        }),

      resetCombatRound: (charId) =>
        set((s) => {
          const sess = s.sessions[charId] ?? defaultSession(charId)
          return {
            sessions: {
              ...s.sessions,
              [charId]: {
                ...sess,
                actionEconomy: defaultActionEconomy(),
                currentRound: 1,
              },
            },
          }
        }),

      setCombatRound: (charId, round) =>
        set((s) => {
          const sess = s.sessions[charId] ?? defaultSession(charId)
          return {
            sessions: {
              ...s.sessions,
              [charId]: {
                ...sess,
                currentRound: Math.max(1, round),
              },
            },
          }
        }),

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
          return {
            sessions: {
              ...s.sessions,
              ...normalized,
            },
          }
        }),

      longRest: (id, maxHp) =>
        set((s) => {
          const current = s.sessions[id] ?? defaultSession(id, maxHp)
          return {
            sessions: {
              ...s.sessions,
              [id]: {
                ...current,
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
                classMechanics: resetClassMechanicsOnLongRest(current.classMechanics, id),
              },
            },
          }
        }),

      advanceCharacterTurn: (characterId, character) =>
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const nextSession = advanceTurnMechanics(current, character)
          return {
            sessions: {
              ...s.sessions,
              [characterId]: nextSession,
            },
          }
        }),

      setWildShape: (characterId, preset) =>
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const mech = current.classMechanics ?? createDefaultClassMechanics(characterId)
          const druid = mech.druid ?? {
            active: false,
            formId: null,
            meldedArmor: false,
            hasNaturalSpellFeat: false,
          }
          const updatedDruid = {
            ...druid,
            active: Boolean(preset),
            formId: preset ? preset.id : null,
            activeForm: preset,
            wildShapeActive: Boolean(preset),
            currentFormId: preset ? preset.id : null,
          }
          return {
            sessions: {
              ...s.sessions,
              [characterId]: {
                ...current,
                classMechanics: {
                  ...mech,
                  druid: updatedDruid,
                  wildShape: updatedDruid,
                },
              },
            },
          }
        }),

      setHeldSpellstrike: (characterId, spellstrike) =>
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const mech = current.classMechanics ?? createDefaultClassMechanics(characterId)
          const magus = mech.magus ?? {
            heldSpellstrike: null,
            spellCombatActive: false,
            defensiveCastingSacrifice: 0,
            arcanePoolWeapon: null,
          }
          return {
            sessions: {
              ...s.sessions,
              [characterId]: {
                ...current,
                classMechanics: {
                  ...mech,
                  magus: {
                    ...magus,
                    heldSpellstrike: spellstrike,
                  },
                },
              },
            },
          }
        }),

      consumeSpellstrikeCharge: (characterId) =>
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const mech = current.classMechanics ?? createDefaultClassMechanics(characterId)
          if (!mech.magus?.heldSpellstrike) return s
          const curCharges = mech.magus.heldSpellstrike.chargesRemaining
          const nextCharges = curCharges - 1
          return {
            sessions: {
              ...s.sessions,
              [characterId]: {
                ...current,
                classMechanics: {
                  ...mech,
                  magus: {
                    ...mech.magus,
                    heldSpellstrike: nextCharges > 0
                      ? { ...mech.magus.heldSpellstrike, chargesRemaining: nextCharges }
                      : null,
                  },
                },
              },
            },
          }
        }),

      setSpellCombat: (characterId, active, sacrifice = 0) =>
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const mech = current.classMechanics ?? createDefaultClassMechanics(characterId)
          const magus = mech.magus ?? {
            heldSpellstrike: null,
            spellCombatActive: false,
            defensiveCastingSacrifice: 0,
            arcanePoolWeapon: null,
          }
          return {
            sessions: {
              ...s.sessions,
              [characterId]: {
                ...current,
                classMechanics: {
                  ...mech,
                  magus: {
                    ...magus,
                    spellCombatActive: active,
                    defensiveCastingSacrifice: Math.max(0, Math.min(4, sacrifice)),
                  },
                },
              },
            },
          }
        }),

      activateArcaneWeapon: (characterId, bonus = 1) =>
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const mech = current.classMechanics ?? createDefaultClassMechanics(characterId)
          const magus = mech.magus ?? {
            heldSpellstrike: null,
            spellCombatActive: false,
            defensiveCastingSacrifice: 0,
            arcanePoolWeapon: null,
          }
          return {
            sessions: {
              ...s.sessions,
              [characterId]: {
                ...current,
                classMechanics: {
                  ...mech,
                  magus: {
                    ...magus,
                    arcanePoolWeapon: { active: true, bonus, remainingRounds: 10 },
                    arcaneWeaponActive: true,
                    arcaneWeaponRoundsLeft: 10,
                    arcaneWeaponBonus: bonus,
                  },
                },
              },
            },
          }
        }),

      enterBloodrage: (characterId, character) =>
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const mech = current.classMechanics ?? createDefaultClassMechanics(characterId)
          const bloodrager = mech.bloodrager ?? {
            isRaging: false,
            roundsRagedThisCombat: 0,
            fatigueCountdown: 0,
            aberrantReachActive: false,
            staggeringStrikeUsesRemaining: 5,
            furiousFocusAppliedThisRound: false,
          }

          if (bloodrager.isRaging || bloodrager.isBloodraging) {
            return s
          }

          const hpGain = calcBloodrageHpShift(character.level ?? 4)
          const bloodrageBuff = character.buffs?.find((b) => /bloodrage|ira/i.test(`${b.id} ${b.name}`))
          const activeBuffIds = bloodrageBuff && !current.activeBuffIds.includes(bloodrageBuff.id)
            ? [...current.activeBuffIds, bloodrageBuff.id]
            : current.activeBuffIds

          return {
            sessions: {
              ...s.sessions,
              [characterId]: {
                ...current,
                currentHp: current.currentHp + hpGain,
                activeBuffIds,
                classMechanics: {
                  ...mech,
                  bloodrager: {
                    ...bloodrager,
                    isRaging: true,
                    isBloodraging: true,
                    roundsRagedThisCombat: 0,
                    roundsCurrentRage: 0,
                  },
                },
              },
            },
          }
        }),

      exitBloodrage: (characterId, character) => {
        let result = { isLethal: false, remainingHp: 0 }
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const mech = current.classMechanics ?? createDefaultClassMechanics(characterId)
          const bloodrager = mech.bloodrager ?? {
            isRaging: false,
            roundsRagedThisCombat: 0,
            fatigueCountdown: 0,
            aberrantReachActive: false,
            staggeringStrikeUsesRemaining: 5,
            furiousFocusAppliedThisRound: false,
          }

          if (!bloodrager.isRaging && !bloodrager.isBloodraging) {
            result = { isLethal: false, remainingHp: current.currentHp }
            return s
          }

          const conScore = character.abilities?.con ?? 16
          const safety = checkBloodrageExitSafety(current.currentHp, character.level ?? 4, 4, conScore)
          const hpLoss = calcBloodrageHpShift(character.level ?? 4)
          const remainingHp = Math.max(-conScore, current.currentHp - hpLoss)
          result = { isLethal: safety.isLethal, remainingHp }

          const roundsRaged = bloodrager.roundsRagedThisCombat ?? bloodrager.roundsCurrentRage ?? 1
          const fatigue = calcFatigueRounds(roundsRaged)
          const nextConditions = current.conditions.includes('fatigued')
            ? current.conditions
            : [...current.conditions, 'fatigued' as ConditionType]

          const bloodrageBuff = character.buffs?.find((b) => /bloodrage|ira/i.test(`${b.id} ${b.name}`))
          const activeBuffIds = current.activeBuffIds.filter(
            (id) => (!bloodrageBuff || id !== bloodrageBuff.id) && !/bloodrage|ira/i.test(id)
          )

          return {
            sessions: {
              ...s.sessions,
              [characterId]: {
                ...current,
                currentHp: remainingHp,
                conditions: nextConditions,
                activeBuffIds,
                classMechanics: {
                  ...mech,
                  bloodrager: {
                    ...bloodrager,
                    isRaging: false,
                    isBloodraging: false,
                    roundsRagedThisCombat: 0,
                    roundsCurrentRage: 0,
                    fatigueCountdown: fatigue,
                    fatigueRoundsLeft: fatigue,
                  },
                },
              },
            },
          }
        })
        return result
      },

      consumeFuriousFocus: (characterId) =>
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const mech = current.classMechanics ?? createDefaultClassMechanics(characterId)
          if (!mech.bloodrager) return s
          return {
            sessions: {
              ...s.sessions,
              [characterId]: {
                ...current,
                classMechanics: {
                  ...mech,
                  bloodrager: {
                    ...mech.bloodrager,
                    furiousFocusAppliedThisRound: true,
                    furiousFocusReady: false,
                  },
                },
              },
            },
          }
        }),

      applyHex: (characterId, hex) =>
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const mech = current.classMechanics ?? createDefaultClassMechanics(characterId)
          const witch = mech.witch ?? {
            cackleUsedThisRound: false,
            activeHexes: [],
            immuneTargets: {},
          }
          const newHex: ActiveHex = {
            id: `hex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            ...hex,
          }
          return {
            sessions: {
              ...s.sessions,
              [characterId]: {
                ...current,
                classMechanics: {
                  ...mech,
                  witch: {
                    ...witch,
                    activeHexes: [...witch.activeHexes, newHex],
                  },
                },
              },
            },
          }
        }),

      removeHex: (characterId, hexId) =>
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const mech = current.classMechanics ?? createDefaultClassMechanics(characterId)
          if (!mech.witch) return s
          return {
            sessions: {
              ...s.sessions,
              [characterId]: {
                ...current,
                classMechanics: {
                  ...mech,
                  witch: {
                    ...mech.witch,
                    activeHexes: mech.witch.activeHexes.filter((h) => h.id !== hexId),
                  },
                },
              },
            },
          }
        }),

      useCackle: (characterId) => {
        let success = false
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const mech = current.classMechanics ?? createDefaultClassMechanics(characterId)
          if (!mech.witch || mech.witch.cackleUsedThisRound) return s
          success = true
          const updatedHexes = mech.witch.activeHexes.map((h) => {
            const isExtendable = h.isExtendableByCackle ?? h.isCackleable ?? h.cackleExtendable ?? (h.hexType !== 'slumber')
            if (!isExtendable) return h
            const curDur = h.remainingRounds ?? h.durationRounds ?? 1
            return {
              ...h,
              remainingRounds: curDur + 1,
              durationRounds: curDur + 1,
            }
          })
          return {
            sessions: {
              ...s.sessions,
              [characterId]: {
                ...current,
                classMechanics: {
                  ...mech,
                  witch: {
                    ...mech.witch,
                    cackleUsedThisRound: true,
                    activeHexes: updatedHexes,
                  },
                },
              },
            },
          }
        })
        return success
      },

      activateKiExtraAttack: (characterId) =>
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const mech = current.classMechanics ?? createDefaultClassMechanics(characterId)
          const monk = mech.monk ?? {
            kiDefenseRounds: 0,
            kiSpeedRounds: 0,
            kiExtraAttackActive: false,
            stunningFistDeclared: null,
            jabbingStyleActive: false,
          }
          return {
            sessions: {
              ...s.sessions,
              [characterId]: {
                ...current,
                classMechanics: {
                  ...mech,
                  monk: {
                    ...monk,
                    kiExtraAttackActive: true,
                    kiExtraAttack: true,
                  },
                },
              },
            },
          }
        }),

      activateKiDefense: (characterId) =>
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const mech = current.classMechanics ?? createDefaultClassMechanics(characterId)
          const monk = mech.monk ?? {
            kiDefenseRounds: 0,
            kiSpeedRounds: 0,
            kiExtraAttackActive: false,
            stunningFistDeclared: null,
            jabbingStyleActive: false,
          }
          const kiDefenseBuffId = 'ki-defense'
          const existingCustom = current.customBuffs ?? []
          const kiDefenseBuff: BuffToggle = {
            id: kiDefenseBuffId,
            name: 'Ki Defense',
            active: true,
            attackMod: 0,
            damageMod: 0,
            acMod: 4,
            acType: 'dodge',
            color: 'primary',
            isCustom: true,
            duration: '1 round',
          }
          const customBuffs = existingCustom.some((b) => b.id === kiDefenseBuffId)
            ? existingCustom.map((b) => (b.id === kiDefenseBuffId ? kiDefenseBuff : b))
            : [...existingCustom, kiDefenseBuff]
          const activeBuffIds = current.activeBuffIds.includes(kiDefenseBuffId)
            ? current.activeBuffIds
            : [...current.activeBuffIds, kiDefenseBuffId]

          return {
            sessions: {
              ...s.sessions,
              [characterId]: {
                ...current,
                customBuffs,
                activeBuffIds,
                classMechanics: {
                  ...mech,
                  monk: {
                    ...monk,
                    kiDefenseRounds: 1,
                    kiDefenseRoundsLeft: 1,
                  },
                },
              },
            },
          }
        }),

      activateKiSpeed: (characterId) =>
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const mech = current.classMechanics ?? createDefaultClassMechanics(characterId)
          const monk = mech.monk ?? {
            kiDefenseRounds: 0,
            kiSpeedRounds: 0,
            kiExtraAttackActive: false,
            stunningFistDeclared: null,
            jabbingStyleActive: false,
          }
          return {
            sessions: {
              ...s.sessions,
              [characterId]: {
                ...current,
                classMechanics: {
                  ...mech,
                  monk: {
                    ...monk,
                    kiSpeedRounds: 1,
                    kiSpeedRoundsLeft: 1,
                  },
                },
              },
            },
          }
        }),

      useWholenessOfBody: (characterId, healingAmount = 8) => {
        get().applyHealing(characterId, healingAmount)
      },

      declareStunningFist: (characterId, condition = 'stunned') =>
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const mech = current.classMechanics ?? createDefaultClassMechanics(characterId)
          const monk = mech.monk ?? {
            kiDefenseRounds: 0,
            kiSpeedRounds: 0,
            kiExtraAttackActive: false,
            stunningFistDeclared: null,
            jabbingStyleActive: false,
          }
          return {
            sessions: {
              ...s.sessions,
              [characterId]: {
                ...current,
                classMechanics: {
                  ...mech,
                  monk: {
                    ...monk,
                    stunningFistDeclared: condition,
                    stunningFistActive: true,
                    stunningFistCondition: condition,
                  },
                },
              },
            },
          }
        }),

      applyDebilitatingInjury: (characterId, type, targetName) =>
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const mech = current.classMechanics ?? createDefaultClassMechanics(characterId)
          const rogue = mech.rogue ?? {
            debilitatingInjury: null,
            underhandedAvailable: true,
            halflingDaggerCritBonusActive: true,
          }
          return {
            sessions: {
              ...s.sessions,
              [characterId]: {
                ...current,
                classMechanics: {
                  ...mech,
                  rogue: {
                    ...rogue,
                    debilitatingInjury: {
                      active: true,
                      type,
                      mode: type,
                      remainingRounds: 1,
                      roundsLeft: 1,
                      targetName,
                    },
                  },
                },
              },
            },
          }
        }),

      setUnderhanded: (characterId, ready) =>
        set((s) => {
          const current = s.sessions[characterId] ?? defaultSession(characterId)
          const mech = current.classMechanics ?? createDefaultClassMechanics(characterId)
          const rogue = mech.rogue ?? {
            debilitatingInjury: null,
            underhandedAvailable: true,
            halflingDaggerCritBonusActive: true,
          }
          return {
            sessions: {
              ...s.sessions,
              [characterId]: {
                ...current,
                classMechanics: {
                  ...mech,
                  rogue: {
                    ...rogue,
                    underhandedAvailable: ready,
                    underhandedReady: ready,
                  },
                },
              },
            },
          }
        }),
    }),
    {
      name: 'neon-sessions',
      version: 2,
      migrate: migratePersistedSessions,
    }
  )
)
