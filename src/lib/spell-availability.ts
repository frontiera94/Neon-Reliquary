import type { AbilityScore, SpellcastingMode, SpellcastingProfile } from '../types/character'
import type { DailyResource, Spell, SpellSlot } from '../types/resources'
import type { SessionState } from '../types/session'
import { abilityMod } from './dice-engine'
import { calcSpellDc, getCastingAbilityKey, type AbilityKey } from './stat-calc'

const SPONTANEOUS_CLASS = /sorcerer|bard|oracle|inquisitor|summoner|bloodrager|skald|hunter/i
const PREPARED_CLASS = /wizard|magus|witch|alchemist|investigator|arcanist|cleric|druid|shaman|warpriest|ranger|paladin/i

/** Minimal character shape accepted by the availability selector. */
export interface SpellAvailabilityCharacter {
  class: string
  level: number
  abilities: AbilityScore
  spells: Spell[]
  spellSlots: SpellSlot[]
  dailyResources?: DailyResource[]
  spellcasting?: SpellcastingProfile
}

/** Minimal session shape accepted by the availability selector. */
export interface SpellAvailabilitySession {
  preparedSpellIds?: string[]
  preparedSpells?: Record<string, number>
  spentPreparedSpells?: Record<string, number>
  spentSpellSlots?: Record<number, number>
  spentResources?: Record<string, number>
}

export interface SpellLevelAvailability {
  level: number
  total: number
  spent: number
  remaining: number
  /** Class-prepared copies only; always-prepared/domain spells are excluded. */
  preparedCount: number
  /** Free preparation capacity for this level after reserving domain/always-prepared spells. */
  preparedCapacity: number
  alwaysPreparedCount: number
  /** Unassigned preparation capacity still available to prepare spells at this level. */
  unpreparedCount: number
}

export interface SpellUseSummary {
  total: number
  spent: number
  remaining: number
  kind: 'atWill' | 'sla' | 'spontaneous' | 'domain' | 'prepared'
}

export interface ActiveSpellUseItem {
  id: string
  name: string
  level: number
  total: number
  spent: number
  remaining: number
  prefix: string
  spell: Spell
  kind: 'prepared' | 'domain' | 'sla'
}

export interface SpellAvailability {
  profile: SpellcastingProfile
  castingAbility: AbilityKey
  castingMod: number
  levels: SpellLevelAvailability[]
  /** Spells displayed in combat: prepared, known, cantrips, at-will and SLAs. */
  combatSpells: Spell[]
  castableSpells: Spell[]
  castableIds: string[]
  cantrips: Spell[]
  slas: Spell[]
  preparedCount: number
  preparedCapacity: number
  knownCount: number
  remainingSlots: number
  totalSlots: number
  activeSpellUses: ActiveSpellUseItem[]
  getLevel: (level: number) => SpellLevelAvailability | undefined
  preparedCopies: (spellId: string) => number
  spellUses: (spell: Spell) => SpellUseSummary
  isCastable: (spell: Spell) => boolean
  slotCost: (spell: Spell) => number
  isAtWill: (spell: Spell) => boolean
  isPreparationLocked: (spell: Spell) => boolean
  resourceFor: (spell: Spell) => DailyResource | null
  reasonUnavailable: (spell: Spell) => string | null
  spellDc: (spell: Spell, schoolBonus?: number) => number
}

export function normalizePreparedSpells(
  preparedSpells: Record<string, number> | undefined,
  preparedSpellIds: string[] | undefined
): Record<string, number> {
  const normalized: Record<string, number> = {}

  if (preparedSpells && Object.keys(preparedSpells).length > 0) {
    for (const [spellId, count] of Object.entries(preparedSpells)) {
      const safeCount = Math.max(0, Math.floor(count))
      if (safeCount > 0) normalized[spellId] = safeCount
    }
    return normalized
  }

  for (const spellId of preparedSpellIds ?? []) {
    normalized[spellId] = (normalized[spellId] ?? 0) + 1
  }
  return normalized
}

export function expandPreparedSpells(preparedSpells: Record<string, number>): string[] {
  const ids: string[] = []
  for (const [spellId, count] of Object.entries(preparedSpells)) {
    for (let i = 0; i < count; i++) ids.push(spellId)
  }
  return ids
}

export function inferSpellcastingMode(character: SpellAvailabilityCharacter): SpellcastingMode {
  if (character.spellcasting) return character.spellcasting.mode

  const spells = character.spells ?? []
  const slots = character.spellSlots ?? []
  const slaOnly =
    spells.length > 0 &&
    spells.every((spell) => spell.source === 'sla' || spell.atWill || spell.level === 0)

  if (slots.length === 0 && slaOnly) return 'none'
  if (SPONTANEOUS_CLASS.test(character.class)) return 'spontaneous'
  if (PREPARED_CLASS.test(character.class) || slots.length > 0) return 'prepared'
  return spells.length > 0 ? 'prepared' : 'none'
}

export function getSpellcastingProfile(character: SpellAvailabilityCharacter): SpellcastingProfile {
  return (
    character.spellcasting ?? {
      mode: inferSpellcastingMode(character),
      ability: getCastingAbilityKey(character.class),
    }
  )
}

function isAlwaysPreparedSpell(spell: Spell): boolean {
  return Boolean(spell.alwaysPrepared || spell.source === 'domain' || spell.source === 'bloodline')
}

function isSlaSpell(spell: Spell): boolean {
  return spell.source === 'sla'
}

/**
 * Single source of truth for spell slots, preparation capacity and castability.
 * Every UI surface should consume this selector instead of recomputing counts.
 */
export function getSpellAvailability(
  character: SpellAvailabilityCharacter,
  session: SpellAvailabilitySession | SessionState
): SpellAvailability {
  const profile = getSpellcastingProfile(character)
  const castingAbility = profile.ability
  const castingMod = abilityMod(character.abilities[castingAbility])
  const preparedMap = normalizePreparedSpells(
    session.preparedSpells,
    session.preparedSpellIds
  )
  const spentPrepared = session.spentPreparedSpells ?? {}
  const spentSlots = session.spentSpellSlots ?? {}
  const spentResources = session.spentResources ?? {}
  const spells = character.spells ?? []
  const dailyResources = character.dailyResources ?? []

  const slotByLevel = new Map<number, SpellSlot>()
  for (const slot of character.spellSlots ?? []) {
    slotByLevel.set(slot.level, slot)
  }
  const allLevels = new Set<number>([...slotByLevel.keys()])
  for (const spell of spells) {
    if (spell.level > 0) allLevels.add(spell.level)
  }

  const preparedCopies = (spellId: string) => preparedMap[spellId] ?? 0

  const isIncludedInCombat = (spell: Spell) => {
    if (spell.level === 0 || spell.atWill || isSlaSpell(spell)) return true
    if (isAlwaysPreparedSpell(spell)) return true
    if (profile.mode === 'spontaneous') return true
    if (profile.mode === 'prepared') return preparedCopies(spell.id) > 0
    return false
  }

  const resourceFor = (spell: Spell): DailyResource | null => {
    if (!spell.resourceId) return null
    return dailyResources.find((resource) => resource.id === spell.resourceId) ?? null
  }

  const isAtWill = (spell: Spell): boolean => {
    if (spell.atWill || spell.level === 0) return true
    if (isSlaSpell(spell)) {
      const resource = resourceFor(spell)
      return !resource
    }
    return false
  }

  const spellUses = (spell: Spell): SpellUseSummary => {
    if (isAtWill(spell)) {
      return { total: 0, spent: 0, remaining: Infinity, kind: 'atWill' }
    }
    if (isSlaSpell(spell)) {
      const res = resourceFor(spell)
      if (!res) return { total: 0, spent: 0, remaining: Infinity, kind: 'atWill' }
      const spent = Math.min(res.total, Math.max(0, spentResources[res.id] ?? 0))
      return { total: res.total, spent, remaining: Math.max(0, res.total - spent), kind: 'sla' }
    }
    if (profile.mode === 'spontaneous') {
      const total = Math.max(0, slotByLevel.get(spell.level)?.total ?? 0)
      const spent = Math.min(total, Math.max(0, spentSlots[spell.level] ?? 0))
      return { total, spent, remaining: Math.max(0, total - spent), kind: 'spontaneous' }
    }
    if (isAlwaysPreparedSpell(spell)) {
      const total = 1
      const spent = Math.min(total, Math.max(0, spentPrepared[spell.id] ?? 0))
      return { total, spent, remaining: total - spent, kind: 'domain' }
    }
    // Class prepared
    const total = preparedCopies(spell.id)
    const spent = Math.min(total, Math.max(0, spentPrepared[spell.id] ?? 0))
    return { total, spent, remaining: Math.max(0, total - spent), kind: 'prepared' }
  }

  const levels: SpellLevelAvailability[] = [...allLevels]
    .sort((a, b) => a - b)
    .map((level) => {
      const total = Math.max(0, slotByLevel.get(level)?.total ?? 0)
      const alwaysPreparedCount = spells.filter(
        (spell) => spell.level === level && isAlwaysPreparedSpell(spell)
      ).length
      const preparedCount = spells
        .filter(
          (spell) =>
            spell.level === level &&
            !isAlwaysPreparedSpell(spell) &&
            !isSlaSpell(spell) &&
            !spell.atWill
        )
        .reduce((sum, spell) => sum + (preparedMap[spell.id] ?? 0), 0)
      const preparedCapacity =
        profile.mode === 'prepared' ? Math.max(0, total - alwaysPreparedCount) : 0
      const unpreparedCount =
        profile.mode === 'prepared' ? Math.max(0, preparedCapacity - preparedCount) : 0

      let spent: number
      let remaining: number
      if (profile.mode === 'prepared') {
        const domainSpent = spells
          .filter((spell) => spell.level === level && isAlwaysPreparedSpell(spell))
          .reduce((sum, spell) => sum + Math.min(1, Math.max(0, spentPrepared[spell.id] ?? 0)), 0)
        const prepSpent = spells
          .filter(
            (spell) =>
              spell.level === level &&
              !isAlwaysPreparedSpell(spell) &&
              !isSlaSpell(spell) &&
              !spell.atWill
          )
          .reduce(
            (sum, spell) =>
              sum + Math.min(preparedCopies(spell.id), Math.max(0, spentPrepared[spell.id] ?? 0)),
            0
          )
        const slotLevelSpent = Math.max(0, spentSlots[level] ?? 0)
        spent = Math.min(total, domainSpent + prepSpent + slotLevelSpent)
        remaining = Math.max(0, total - spent)
      } else {
        spent = Math.min(total, Math.max(0, spentSlots[level] ?? 0))
        remaining = Math.max(0, total - spent)
      }

      return {
        level,
        total,
        spent,
        remaining,
        preparedCount,
        preparedCapacity,
        alwaysPreparedCount,
        unpreparedCount,
      }
    })

  const levelMap = new Map(levels.map((level) => [level.level, level]))
  const getLevel = (level: number) => levelMap.get(level)

  const isCastable = (spell: Spell): boolean => {
    if (!isIncludedInCombat(spell)) return false
    const uses = spellUses(spell)
    if (uses.kind === 'atWill') return true
    if (uses.kind === 'sla') {
      const resource = resourceFor(spell)
      if (!resource) return true
      return uses.remaining > 0
    }
    if (uses.kind === 'spontaneous') {
      const level = getLevel(spell.level)
      return Boolean(level && level.total > 0 && uses.remaining > 0)
    }
    const level = getLevel(spell.level)
    if (spell.level > 0 && (!level || level.total <= 0)) return false
    return uses.total > 0 && uses.remaining > 0
  }

  const slotCost = (spell: Spell): number => {
    if (isAtWill(spell) || isSlaSpell(spell) || spell.level === 0) return 0
    return 1
  }

  const isPreparationLocked = (spell: Spell): boolean => {
    return (
      profile.mode !== 'prepared' ||
      isAlwaysPreparedSpell(spell) ||
      isSlaSpell(spell) ||
      spell.atWill ||
      spell.level === 0
    )
  }

  const reasonUnavailable = (spell: Spell): string | null => {
    if (!isIncludedInCombat(spell)) return 'Not prepared'
    const uses = spellUses(spell)
    if (uses.kind === 'atWill') return null
    if (uses.kind === 'sla') {
      const resource = resourceFor(spell)
      if (resource && uses.remaining <= 0) {
        return `${resource.name} exhausted`
      }
      return null
    }
    const level = getLevel(spell.level)
    if (spell.level > 0 && (!level || level.total <= 0)) return 'No slots at this level'
    if (uses.kind === 'spontaneous') {
      if (uses.remaining <= 0) return 'No slots remaining'
      return null
    }
    if (uses.total <= 0) return 'Not prepared'
    if (uses.remaining <= 0) return 'No uses remaining'
    return null
  }

  const activeSpellUses: ActiveSpellUseItem[] = []
  if (profile.mode === 'prepared') {
    for (const spell of spells) {
      if (isAlwaysPreparedSpell(spell) && spell.level > 0) {
        const uses = spellUses(spell)
        activeSpellUses.push({
          id: spell.id,
          name: spell.name,
          level: spell.level,
          total: uses.total,
          spent: uses.spent,
          remaining: uses.remaining,
          prefix: `DOM L${spell.level}`,
          spell,
          kind: 'domain',
        })
      }
    }
    for (const spell of spells) {
      if (!isAlwaysPreparedSpell(spell) && !isSlaSpell(spell) && !spell.atWill && spell.level > 0) {
        const count = preparedCopies(spell.id)
        if (count > 0) {
          const uses = spellUses(spell)
          activeSpellUses.push({
            id: spell.id,
            name: spell.name,
            level: spell.level,
            total: uses.total,
            spent: uses.spent,
            remaining: uses.remaining,
            prefix: `LV ${spell.level}`,
            spell,
            kind: 'prepared',
          })
        }
      }
    }
    for (const spell of spells) {
      if (isSlaSpell(spell) && spell.resourceId) {
        const uses = spellUses(spell)
        activeSpellUses.push({
          id: spell.id,
          name: spell.name,
          level: spell.level,
          total: uses.total,
          spent: uses.spent,
          remaining: uses.remaining,
          prefix: 'SLA',
          spell,
          kind: 'sla',
        })
      }
    }
    activeSpellUses.sort((a, b) => (a.level !== b.level ? a.level - b.level : a.name.localeCompare(b.name)))
  } else if (profile.mode === 'none') {
    for (const spell of spells) {
      if (isSlaSpell(spell) && spell.resourceId) {
        const uses = spellUses(spell)
        activeSpellUses.push({
          id: spell.id,
          name: spell.name,
          level: spell.level,
          total: uses.total,
          spent: uses.spent,
          remaining: uses.remaining,
          prefix: 'SLA',
          spell,
          kind: 'sla',
        })
      }
    }
  }

  const combatSpells = spells.filter(isIncludedInCombat)
  const castableSpells = combatSpells.filter(isCastable)
  const preparedCount = levels.reduce((sum, level) => sum + level.preparedCount, 0)
  const preparedCapacity = levels.reduce((sum, level) => sum + level.preparedCapacity, 0)
  const remainingSlots = levels.reduce((sum, level) => sum + level.remaining, 0)
  const totalSlots = levels.reduce((sum, level) => sum + level.total, 0)

  return {
    profile,
    castingAbility,
    castingMod,
    levels,
    combatSpells,
    castableSpells,
    castableIds: castableSpells.map((spell) => spell.id),
    cantrips: spells.filter((spell) => spell.level === 0),
    slas: spells.filter(isSlaSpell),
    preparedCount,
    preparedCapacity,
    knownCount:
      profile.mode === 'spontaneous'
        ? spells.filter((spell) => !isSlaSpell(spell) && spell.level > 0).length
        : 0,
    remainingSlots,
    totalSlots,
    activeSpellUses,
    getLevel,
    preparedCopies,
    spellUses,
    isCastable,
    slotCost,
    isAtWill,
    isPreparationLocked,
    resourceFor,
    reasonUnavailable,
    spellDc: (spell: Spell, schoolBonus = 0) => calcSpellDc(spell.level, castingMod, schoolBonus),
  }
}
