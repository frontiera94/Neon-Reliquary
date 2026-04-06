export interface AbilityScore {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
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
}
