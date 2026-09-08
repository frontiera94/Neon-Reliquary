import type { ConditionType, BuffToggle } from './combat'
import type { CoinPurse } from './inventory'

export interface ActiveSummon {
  spellId: string
  optionId: string
  currentHp: number
}

export interface SessionState {
  characterId: string
  currentHp: number
  tempHp: number
  nonlethalDamage: number
  spentResources: Record<string, number>
  activeBuffIds: string[]
  conditions: ConditionType[]
  customBuffs?: BuffToggle[]
  preparedSpellIds: string[]
  spentSpellSlots: Record<number, number>
  ammo: Record<string, number>
  activeSummon: ActiveSummon | null
  itemQuantities: Record<string, number>
  coins: CoinPurse
}
