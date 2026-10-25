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

export function EquipmentSlotCell({
  slot,
  item,
  onUnequip,
}: {
  slot: EquipmentSlot
  item?: InventoryItem
  onUnequip?: (itemId: string) => void
}) {
  const { label, icon } = SLOT_META[slot]

  if (item) {
    return (
      <div className="bg-surface-container/70 backdrop-blur-md border border-white/10 border-l-4 border-l-secondary rounded-xl p-2 sm:p-2.5 md:p-3 min-h-[64px] sm:min-h-[76px] flex flex-col justify-between gap-1 hover:border-secondary/40 hover:shadow-[0_0_15px_rgba(217,70,239,0.15)] transition-all group">
        <div>
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              <span className="material-symbols-outlined text-secondary text-sm sm:text-base flex-shrink-0">{icon}</span>
              <span className="font-label text-[9px] sm:text-[10px] uppercase tracking-wider text-secondary font-semibold truncate">{label}</span>
            </div>
            {onUnequip && (
              <button
                onClick={() => onUnequip(item.id)}
                className="opacity-70 sm:opacity-0 group-hover:opacity-100 sm:hover:opacity-100 focus:opacity-100 transition-opacity text-tertiary hover:text-error p-0.5 rounded cursor-pointer flex-shrink-0"
                title={`Unequip ${item.name}`}
                aria-label={`Unequip ${item.name}`}
              >
                <span className="material-symbols-outlined text-xs sm:text-sm">close</span>
              </button>
            )}
          </div>
          <span className="font-headline text-xs sm:text-sm md:text-base text-white font-bold leading-tight block mt-0.5 truncate">{item.name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1 mt-0.5">
          {item.armorBonus !== undefined && (
            <span className="font-label text-[8px] sm:text-[9px] text-secondary font-bold bg-secondary/10 px-1 rounded">
              +{item.armorBonus} AC
            </span>
          )}
          {item.armorCheckPenalty !== undefined && item.armorCheckPenalty < 0 && (
            <span className="font-label text-[8px] sm:text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1 rounded">
              {item.armorCheckPenalty} ACP
            </span>
          )}
          {item.description && (
            <span className="font-body text-[10px] sm:text-xs text-tertiary line-clamp-1 leading-tight">{item.description}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-container/30 border border-white/5 border-l-4 border-l-outline-variant/30 rounded-xl p-2 sm:p-2.5 md:p-3 min-h-[64px] sm:min-h-[76px] flex flex-col justify-between gap-0.5 opacity-40">
      <div className="flex items-center gap-1 sm:gap-1.5">
        <span className="material-symbols-outlined text-tertiary text-sm sm:text-base">{icon}</span>
        <span className="font-label text-[9px] sm:text-[10px] uppercase tracking-wider text-tertiary truncate">{label}</span>
      </div>
      <span className="font-headline text-xs sm:text-sm text-tertiary">—</span>
    </div>
  )
}
