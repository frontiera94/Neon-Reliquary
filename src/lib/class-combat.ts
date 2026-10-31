/**
 * src/lib/class-combat.ts
 * Pure Pathfinder 1e helpers that connect class mechanics state to the combat UI:
 * Wild Shape (view + natural weapons), Magus Spellstrike, Witch hex durations,
 * Bloodrager Furious Focus and Halfling dagger confirmation.
 */

import type { Weapon } from '../types/combat'
import type { ArmorClass } from '../types/defense'
import type { AbilityScore } from '../types/character'
import type {
  HeldSpellstrike,
  HexType,
  WildShapePreset,
  ClassMechanicsState,
} from '../types/class-mechanics'
import { getWildShapePreset } from '../data/wild-shape-presets'
import { abilityMod } from './dice-engine'
import { resolveEffectiveArmorBase } from './stat-calc'

/* -------------------------------------------------------------------------- */
/* Wild Shape                                                                 */
/* -------------------------------------------------------------------------- */

/** Str damage contribution for a natural attack: 1x, 1.5x (sole attack) or 0.5x (secondary). */
export function scaleStrDamage(strMod: number, multiplier: number): number {
  if (strMod <= 0) return strMod
  return Math.floor(strMod * multiplier)
}

export interface WildShapeView {
  active: boolean
  preset: WildShapePreset | null
  /** Ability scores with the form's size bonuses applied (unchanged when not transformed). */
  abilities: AbilityScore
  /** Armor class with armor/shield melded and natural armor / size applied. */
  armorClass: ArmorClass
  hasNaturalSpell: boolean
}

interface WildShapeSource {
  abilities: AbilityScore
  armorClass: ArmorClass
  feats?: { name: string }[]
}

export function getActiveWildShapePreset(
  mechanics: ClassMechanicsState | undefined
): WildShapePreset | null {
  const druid = mechanics?.druid ?? mechanics?.wildShape
  if (!druid) return null
  const isActive = Boolean(druid.active ?? druid.wildShapeActive)
  if (!isActive) return null
  return druid.activeForm ?? getWildShapePreset(druid.formId ?? druid.currentFormId)
}

export function getWildShapeView(
  char: WildShapeSource,
  mechanics: ClassMechanicsState | undefined
): WildShapeView {
  const hasNaturalSpell = Boolean(char.feats?.some((f) => /natural spell/i.test(f.name)))
  const preset = getActiveWildShapePreset(mechanics)
  if (!preset) {
    return { active: false, preset: null, abilities: char.abilities, armorClass: char.armorClass, hasNaturalSpell }
  }
  const strBonus = preset.strBonus ?? preset.statBonus?.str ?? 0
  const dexBonus = preset.dexBonus ?? preset.statBonus?.dex ?? 0
  return {
    active: true,
    preset,
    abilities: {
      ...char.abilities,
      str: char.abilities.str + strBonus,
      dex: char.abilities.dex + dexBonus,
    },
    armorClass: resolveEffectiveArmorBase(char.armorClass, {
      active: true,
      naturalArmorBonus: preset.naturalArmorBonus,
      formSize: preset.size,
    }),
    hasNaturalSpell,
  }
}

/**
 * Builds the natural attacks of a Wild Shape form as Weapon entries.
 * `formStrMod` must already include the form's Strength bonus.
 */
export function buildWildShapeWeapons(
  preset: WildShapePreset,
  baseAttackBonus: number,
  formStrMod: number
): Weapon[] {
  const sizeAtk = preset.sizeAtkBonus ?? 0
  return (preset.naturalAttacks ?? []).map((atk) => {
    const bonus = baseAttackBonus + formStrMod + sizeAtk + atk.attackBonusMod
    const tags: string[] = ['natural', atk.isPrimary ? 'primary' : 'secondary']
    if (atk.strMultiplier === 0.5) tags.push('half-str')
    if (atk.strMultiplier === 1.5) tags.push('one-and-half-str')
    if (atk.trip) tags.push('Trip')
    if (atk.grab) tags.push('Grab')
    return {
      id: `ws-${preset.id}-${atk.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: atk.attackCount > 1 ? `${atk.name} x${atk.attackCount}` : atk.name,
      type: 'melee' as const,
      attackBonus: Array.from({ length: atk.attackCount }, () => bonus),
      damageDice: atk.damageDice,
      damageBonus: scaleStrDamage(formStrMod, atk.strMultiplier),
      critRange: 20,
      critMultiplier: 2,
      tags,
    }
  })
}

/* -------------------------------------------------------------------------- */
/* Magus Spellstrike                                                          */
/* -------------------------------------------------------------------------- */

export interface SpellstrikeSpellDef {
  id: string
  name: string
  level: number
  damageType: string
  /** Dice rolled by the spell: per caster level (Shocking Grasp) or a fixed die. */
  dicePerCasterLevel: boolean
  maxDice: number
  dieSides: number
  /** Multi-charge touch spells keep one charge per caster level. */
  chargesPerCasterLevel: boolean
  metalBonus: boolean
}

export const SPELLSTRIKE_SPELLS: Record<string, SpellstrikeSpellDef> = {
  'shocking-grasp': {
    id: 'shocking-grasp',
    name: 'Shocking Grasp',
    level: 1,
    damageType: 'electricity',
    dicePerCasterLevel: true,
    maxDice: 5,
    dieSides: 6,
    chargesPerCasterLevel: false,
    metalBonus: true,
  },
  'chill-touch': {
    id: 'chill-touch',
    name: 'Chill Touch',
    level: 1,
    damageType: 'negative energy',
    dicePerCasterLevel: false,
    maxDice: 1,
    dieSides: 6,
    chargesPerCasterLevel: true,
    metalBonus: false,
  },
  frostbite: {
    id: 'frostbite',
    name: 'Frostbite',
    level: 1,
    damageType: 'cold',
    dicePerCasterLevel: false,
    maxDice: 1,
    dieSides: 6,
    chargesPerCasterLevel: true,
    metalBonus: false,
  },
}

export function buildHeldSpellstrike(spellId: string, casterLevel: number): HeldSpellstrike | null {
  const def = SPELLSTRIKE_SPELLS[spellId]
  if (!def) return null
  const dice = def.dicePerCasterLevel ? Math.max(1, Math.min(def.maxDice, casterLevel)) : def.maxDice
  const charges = def.chargesPerCasterLevel ? Math.max(1, casterLevel) : 1
  return {
    spellId: def.id,
    spellName: def.name,
    spellLevel: def.level,
    damageDice: `${dice}d${def.dieSides}`,
    damageType: def.damageType,
    chargesRemaining: charges,
    chargesMax: charges,
    hasMetalBonusToggle: def.metalBonus,
    metalBonusActive: false,
    critMultiplier: 2,
  }
}

/** Attack roll bonus granted by the held spell (Shocking Grasp: +3 vs metal armor). */
export function calcSpellstrikeAttackBonus(held: HeldSpellstrike | null | undefined): number {
  return held?.hasMetalBonusToggle && held.metalBonusActive ? 3 : 0
}

/**
 * Extra attack penalty from Spell Combat that is not already represented by the
 * `spell-combat` buff on the character sheet (that buff already carries -2).
 */
export function calcSpellCombatExtraPenalty(
  sacrifice: number,
  spellCombatBuffActive: boolean
): number {
  const clamped = Math.max(0, Math.min(4, sacrifice))
  return -2 - clamped - (spellCombatBuffActive ? -2 : 0)
}

/* -------------------------------------------------------------------------- */
/* Witch hexes                                                                */
/* -------------------------------------------------------------------------- */

/** Hexes that grant the target a 24-hour immunity after being targeted. */
export const IMMUNITY_HEXES: HexType[] = ['misfortune', 'slumber', 'fortune']

/**
 * Duration in rounds of a hex on a target.
 * - Evil Eye: 3 + INT mod on a failed save, 1 round on a successful save.
 * - Misfortune: 1 round (no effect on a successful save).
 * - Slumber: rounds equal to the witch level (no effect on a successful save).
 * - Fortune: 1 round (always applies to a willing ally).
 */
export function calcHexDuration(
  hexType: HexType,
  intMod: number,
  witchLevel: number,
  saveOutcome: 'passed' | 'failed' = 'failed'
): number {
  switch (hexType) {
    case 'evil-eye':
      return saveOutcome === 'passed' ? 1 : Math.max(1, 3 + intMod)
    case 'misfortune':
      return saveOutcome === 'passed' ? 0 : 1
    case 'slumber':
      return saveOutcome === 'passed' ? 0 : Math.max(1, witchLevel)
    case 'fortune':
      return 1
  }
}

/* -------------------------------------------------------------------------- */
/* Bloodrager, Halfling                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Furious Focus: the first attack each turn made with a two-handed weapon while
 * Power Attacking ignores the Power Attack attack penalty (2-handed: -2 at BAB 4).
 */
export function calcFuriousFocusBonus(
  hasFeat: boolean,
  powerAttackActive: boolean,
  isTwoHanded: boolean,
  isFirstAttackOfTurn: boolean,
  powerAttackPenalty = 2
): number {
  if (!hasFeat || !powerAttackActive || !isTwoHanded || !isFirstAttackOfTurn) return 0
  return powerAttackPenalty
}

export function hasFeatNamed(feats: { name: string }[] | undefined, pattern: RegExp): boolean {
  return Boolean(feats?.some((f) => pattern.test(f.name)))
}

export function isTwoHandedWeapon(weapon: Weapon): boolean {
  return weapon.tags?.some((t) => /2-handed|two-handed/i.test(t)) ?? false
}

export { calcHalflingDaggerCritConfirm } from './class-mechanics'

export { abilityMod }
