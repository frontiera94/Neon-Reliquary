import { useState } from 'react'
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
  const [hideEmpty, setHideEmpty] = useState(false)
  const slotMap = new Map<EquipmentSlot, InventoryItem>()
  for (const item of items) {
    const isEquipped = equippedIds ? equippedIds.includes(item.id) : (item.equipped ?? false)
    if (isEquipped && item.slot) slotMap.set(item.slot, item)
  }

  const equippedCount = slotMap.size
  const slotsToDisplay = hideEmpty
    ? SLOT_ORDER.filter((slot) => slotMap.has(slot))
    : SLOT_ORDER

  return (
    <div className="space-y-2">
      {equippedCount > 0 && equippedCount < SLOT_ORDER.length && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setHideEmpty(!hideEmpty)}
            className="text-[10px] sm:text-xs font-label uppercase tracking-wider text-tertiary hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">
              {hideEmpty ? 'visibility' : 'visibility_off'}
            </span>
            <span>{hideEmpty ? `Mostra tutti i 15 slot` : `Nascondi vuoti (${SLOT_ORDER.length - equippedCount})`}</span>
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
        {slotsToDisplay.map((slot) => (
          <EquipmentSlotCell
            key={slot}
            slot={slot}
            item={slotMap.get(slot)}
            onUnequip={onUnequip}
          />
        ))}
      </div>
    </div>
  )
}
