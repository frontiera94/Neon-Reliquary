export interface DailyResource {
  id: string
  name: string
  total: number
  label?: string
}

export interface SpellSlot {
  level: number
  total: number
}

export interface SummonAttack {
  name: string
  bonus: number
  damageDice: string
  damageBonus: number
  notes?: string
}

export interface SummonOption {
  id: string
  name: string
  size: string
  ac: number
  hp: number
  attacks: SummonAttack[]
  specialAbilities?: string
  template?: string
}

export type SpellAttackType = 'rangedTouch' | 'meleeTouch' | 'ray'

export type SpellSource = 'class' | 'domain' | 'sla' | 'bloodline' | 'item'

export interface Spell {
  id: string
  name: string
  level: number
  school: string
  subschool?: string
  castingTime: string
  range: string
  duration: string
  savingThrow?: string
  spellResistance: boolean
  components: string
  description: string
  /** @deprecated use attackType instead */
  isAttackSpell?: boolean
  attackType?: SpellAttackType
  damageDice?: string
  damageBonus?: number
  summonOptions?: SummonOption[]
  /** Where the spell comes from. Defaults to 'class'. */
  source?: SpellSource
  /** Domain/bloodline/class feature spells that never need preparation. */
  alwaysPrepared?: boolean
  /** Spell-like abilities or cantrips that do not consume slots. */
  atWill?: boolean
  /** Daily resource that powers an SLA (e.g. Mariano's Vanish). */
  resourceId?: string
}
