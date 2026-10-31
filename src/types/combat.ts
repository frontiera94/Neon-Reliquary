export interface Weapon {
  id: string
  name: string
  type: 'melee' | 'ranged'
  attackBonus: number[]
  damageDice: string
  damageBonus: number
  critRange: number
  critMultiplier: number
  tags: string[]
  maxAmmo?: number
  currentAmmo?: number
}

export type AcBonusType =
  | 'dodge'
  | 'natural'
  | 'size'
  | 'deflection'
  | 'armor'
  | 'shield'
  | 'other'
  | 'untyped'

export interface BuffToggle {
  id: string
  name: string
  active: boolean
  attackMod: number
  damageMod: number
  acMod: number
  /** Classification of the AC bonus for Touch / Flat-Footed / CMD calculations */
  acType?: AcBonusType
  color?: 'primary' | 'secondary' | 'error'
  /** When true, attackMod/damageMod are not applied to ranged weapons */
  meleeOnly?: boolean
  /** When true, the combat UI shows an off-hand attack button at attackBonus - 4 */
  isTwf?: boolean
  /** Extra damage dice rolled separately when this buff is active (e.g. "2d6") */
  extraDamageDice?: string
  /** Global or per-save modifiers */
  saveMod?: number | { fort?: number; ref?: number; will?: number }
  /** Direct ability score modifiers (e.g. +4 STR from Bull's Strength) */
  abilityMods?: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
  description?: string
  isCustom?: boolean
  duration?: string
  /** Optional explicit link to a DailyResource id (e.g. arcane-pool, ki-pool). */
  resourceId?: string
  /** Optional cost in resource points when the buff is engaged. Defaults to 1. */
  resourceCost?: number
  /** For buffs created from a spell, the originating spell id. */
  spellId?: string
}

export type ConditionType =
  | 'shaken' | 'sickened' | 'fatigued' | 'exhausted'
  | 'blinded' | 'confused' | 'dazed' | 'frightened'
  | 'nauseated' | 'paralyzed' | 'prone' | 'stunned'

export interface AmmoTracker {
  weaponId: string
  current: number
  max: number
}

export type CombatManeuverType =
  | 'grapple'
  | 'trip'
  | 'disarm'
  | 'bullRush'
  | 'sunder'
  | 'overrun'
  | 'dirtyTrick'
  | 'reposition'
  | 'steal'

export interface ManeuverDetail {
  type: CombatManeuverType
  name: string
  bonus: number
  provokesAoO: boolean
  breakdown: { label: string; value: number }[]
  featApplied?: string
  description?: string
  cmdBonus?: number
}

export interface CombatManeuversCalculated {
  cmb: number
  cmd: number
  maneuvers: Record<CombatManeuverType, ManeuverDetail>
  breakdownCmb: { label: string; value: number }[]
  breakdownCmd: { label: string; value: number }[]
}

export interface ActionEconomyState {
  standard: boolean
  move: boolean
  swift: boolean
  immediate: boolean
  fullRound: boolean
}
