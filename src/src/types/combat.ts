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
  /** When true, attackMod/damageMod are not applied to ranged weapons */
  meleeOnly?: boolean
  /** When true, the combat UI shows an off-hand attack button at attackBonus - 4 */
  isTwf?: boolean
  /** Extra damage dice rolled separately when this buff is active (e.g. "2d6") */
  extraDamageDice?: string
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
