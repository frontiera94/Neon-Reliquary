import type { EquipmentSlot, InventoryItem } from '../../types/inventory'
import { EquipmentSlotCell } from './EquipmentSlotCell'

const SLOT_ORDER: EquipmentSlot[] = [
  'head',     'headband', 'eyes',
  'neck',     'shoulders','chest',
  'body',     'belt',     'wrists',
  'hands',    'feet',     'ring1',
  'ring2',    'mainHand', 'offHand',
]

export function EquipmentSlotGrid({
  items,
  equippedIds,
  onUnequip,
}: {
  items: InventoryItem[]
  equippedIds?: string[]
  onUnequip?: (itemId: string) => void
}) {
  const slotMap = new Map<EquipmentSlot, InventoryItem>()
  for (const item of items) {
    const isEquipped = equippedIds ? equippedIds.includes(item.id) : (item.equipped ?? false)
    if (isEquipped && item.slot) slotMap.set(item.slot, item)
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {SLOT_ORDER.map((slot) => (
        <EquipmentSlotCell
          key={slot}
          slot={slot}
          item={slotMap.get(slot)}
          onUnequip={onUnequip}
        />
      ))}
    </div>
  )
}
