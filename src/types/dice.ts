export type DiceType = 4 | 6 | 8 | 10 | 12 | 20 | 100

export interface DiceRoll {
  diceType: DiceType
  count: number
  modifier: number
  label: string
  critRange?: number
}

export interface RollResult {
  id: string
  label: string
  diceType: DiceType
  naturalRolls: number[]
  modifier: number
  total: number
  isCriticalThreat: boolean
  isCriticalConfirmed: boolean
  formula: string
  timestamp: number
}
