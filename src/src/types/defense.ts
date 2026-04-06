export interface ArmorClass {
  total: number
  touch: number
  flatFooted: number
  armorBonus: number
  shieldBonus: number
  dexBonus: number
  naturalArmor: number
  deflection: number
  misc: number
  spellFailureChance: number
}

export interface SavingThrow {
  fort: number
  ref: number
  will: number
  fortBase: number
  refBase: number
  willBase: number
}
