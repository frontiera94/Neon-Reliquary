export type ItemCategory = 'weapon' | 'armor' | 'consumable' | 'gear' | 'magic'

export type EquipmentSlot =
  | 'head' | 'headband' | 'eyes'
  | 'neck' | 'shoulders' | 'chest'
  | 'body' | 'belt' | 'wrists'
  | 'hands' | 'feet' | 'ring1' | 'ring2'
  | 'mainHand' | 'offHand'

export interface InventoryItem {
  id: string
  name: string
  description: string
  category: ItemCategory
  quantity: number
  equipped?: boolean
  slot?: EquipmentSlot
  armorBonus?: number
  armorCheckPenalty?: number
  spellFailureChance?: number
}

export interface CoinPurse {
  pp?: number
  gp: number
  sp: number
  cp: number
}
