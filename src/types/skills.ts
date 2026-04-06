export interface Skill {
  id: string
  name: string
  ability: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
  ranks: number
  classSkill: boolean
  miscBonus: number
  trained: boolean
  armorCheckPenalty: boolean
}
