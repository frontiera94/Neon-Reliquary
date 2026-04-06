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
  isAttackSpell?: boolean
}
