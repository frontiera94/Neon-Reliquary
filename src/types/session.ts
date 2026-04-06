import type { ConditionType } from './combat'

export interface SessionState {
  characterId: string
  currentHp: number
  tempHp: number
  nonlethalDamage: number
  spentResources: Record<string, number>
  activeBuffIds: string[]
  conditions: ConditionType[]
  preparedSpellIds: string[]
  spentSpellSlots: Record<number, number>
  ammo: Record<string, number>
}
