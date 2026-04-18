import type { EquipmentSlot, InventoryItem } from '../../types/inventory'

const SLOT_META: Record<EquipmentSlot, { label: string; icon: string }> = {
  head:      { label: 'Head',      icon: 'military_tech' },
  headband:  { label: 'Headband',  icon: 'psychology' },
  eyes:      { label: 'Eyes',      icon: 'visibility' },
  neck:      { label: 'Neck',      icon: 'diamond' },
  shoulders: { label: 'Shoulders', icon: 'dry_cleaning' },
  chest:     { label: 'Chest',     icon: 'checkroom' },
  body:      { label: 'Body',      icon: 'shield' },
  belt:      { label: 'Belt',      icon: 'linear_scale' },
  wrists:    { label: 'Wrists',    icon: 'watch' },
  hands:     { label: 'Hands',     icon: 'pan_tool_alt' },
  feet:      { label: 'Feet',      icon: 'footprint' },
  ring1:     { label: 'Ring I',    icon: 'radio_button_unchecked' },
  ring2:     { label: 'Ring II',   icon: 'radio_button_unchecked' },
  mainHand:  { label: 'Main Hand', icon: 'swords' },
  offHand:   { label: 'Off Hand',  icon: 'security' },
}

export function EquipmentSlotCell({ slot, item }: { slot: EquipmentSlot; item?: InventoryItem }) {
  const { label, icon } = SLOT_META[slot]

  if (item) {
    return (
      <div className="bg-surface-container-high border-l-4 border-secondary p-3 min-h-[88px] flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-secondary text-base">{icon}</span>
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-secondary">{label}</span>
        </div>
        <span className="font-headline text-base text-on-surface leading-tight">{item.name}</span>
        {item.description && (
          <span className="font-body text-xs text-tertiary line-clamp-2 leading-snug">{item.description}</span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-surface-container border-l-4 border-outline-variant/20 p-3 min-h-[88px] flex flex-col gap-1 opacity-50">
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined text-tertiary text-base">{icon}</span>
        <span className="font-label text-[10px] uppercase tracking-[0.2em] text-tertiary">{label}</span>
      </div>
      <span className="font-headline text-base text-tertiary">—</span>
    </div>
  )
}
