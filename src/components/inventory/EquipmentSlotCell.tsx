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
      <div className="bg-surface-container/70 backdrop-blur-md border border-white/10 border-l-4 border-l-secondary rounded-xl p-3 min-h-[88px] flex flex-col gap-1 hover:border-secondary/40 hover:shadow-[0_0_15px_rgba(217,70,239,0.15)] transition-all">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-secondary text-base">{icon}</span>
          <span className="font-label text-[10px] uppercase tracking-wider text-secondary font-semibold">{label}</span>
        </div>
        <span className="font-headline text-base text-white font-bold leading-tight">{item.name}</span>
        {item.description && (
          <span className="font-body text-xs text-tertiary line-clamp-2 leading-snug">{item.description}</span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-surface-container/30 border border-white/5 border-l-4 border-l-outline-variant/30 rounded-xl p-3 min-h-[88px] flex flex-col gap-1 opacity-40">
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined text-tertiary text-base">{icon}</span>
        <span className="font-label text-[10px] uppercase tracking-wider text-tertiary">{label}</span>
      </div>
      <span className="font-headline text-base text-tertiary">—</span>
    </div>
  )
}
