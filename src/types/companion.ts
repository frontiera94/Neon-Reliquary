import type { AbilityScore } from './character'
import type { ConditionType } from './combat'

export type CompanionType = 'familiar' | 'animal_companion' | 'eidolon' | 'mount' | 'other'

export type CreatureSize = 'Fine' | 'Diminutive' | 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan' | 'Colossal'

export interface CompanionAttack {
  name: string
  bonus: number
  damageDice: string
  damageBonus?: number
  critRange?: number
  critMultiplier?: number
  damageType?: string
  notes?: string
}

export interface CompanionSkill {
  name: string
  bonus: number
  ability?: keyof AbilityScore
  notes?: string
}

export interface CompanionSpecialAbility {
  name: string
  description: string
  type?: 'ex' | 'su' | 'sp' | 'trick' | 'passive'
}

export interface CompanionArmorClass {
  total: number
  touch: number
  flatFooted: number
  naturalArmor?: number
  dexBonus?: number
  sizeBonus?: number
  misc?: number
}

export interface CompanionSavingThrows {
  fort: number
  ref: number
  will: number
}

export interface CompanionMasterLink {
  alertnessToMaster?: boolean
  deliverTouchSpells?: boolean
  empathicLink?: boolean
  shareSpells?: boolean
  linkBonus?: number
  notes?: string
}

export interface Companion {
  id: string
  name: string
  type: CompanionType
  species: string
  portrait?: string
  size: CreatureSize
  hitDice?: string
  level?: number
  maxHp: number
  speed: string
  initiativeBonus: number
  armorClass: CompanionArmorClass
  savingThrows: CompanionSavingThrows
  abilities: AbilityScore
  baseAttackBonus: number
  attacks: CompanionAttack[]
  skills: CompanionSkill[]
  specialQualities: CompanionSpecialAbility[]
  tricks?: string[]
  senses?: string
  masterLink?: CompanionMasterLink
}

export interface CompanionSessionState {
  currentHp: number
  tempHp: number
  conditions: ConditionType[]
}
