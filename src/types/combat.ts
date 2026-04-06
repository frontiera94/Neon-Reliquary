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

export interface BuffToggle {
  id: string
  name: string
  active: boolean
  attackMod: number
  damageMod: number
  acMod: number
  color?: 'primary' | 'secondary' | 'error'
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
