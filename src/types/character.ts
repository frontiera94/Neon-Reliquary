export interface AbilityScore {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export type SpellcastingMode = 'prepared' | 'spontaneous' | 'none'

export interface SpellcastingProfile {
  mode: SpellcastingMode
  ability: keyof AbilityScore
}

export interface Character {
  id: string
  name: string
  class: string
  level: number
  race: string
  alignment: string
  portrait?: string
  abilities: AbilityScore
  maxHp: number
  baseAttackBonus: number[]
  initiativeBonus: number
  speed: number
  spellResistance?: number
  damageReduction?: string
  /** Explicit casting model. When omitted it is inferred from `class`. */
  spellcasting?: SpellcastingProfile
}
