import type { EquipmentSlot, InventoryItem } from '../../types/inventory'
import { useTranslation } from '../../i18n'

const SLOT_META: Record<EquipmentSlot, { labelEn: string; labelIt: string; icon: string }> = {
  head:      { labelEn: 'Head',      labelIt: 'Testa',          icon: 'military_tech' },
  headband:  { labelEn: 'Headband',  labelIt: 'Fascia',         icon: 'psychology' },
  eyes:      { labelEn: 'Eyes',      labelIt: 'Occhi',          icon: 'visibility' },
  neck:      { labelEn: 'Neck',      labelIt: 'Collo',          icon: 'diamond' },
  shoulders: { labelEn: 'Shoulders', labelIt: 'Spalle',         icon: 'dry_cleaning' },
  chest:     { labelEn: 'Chest',     labelIt: 'Torace',         icon: 'checkroom' },
  body:      { labelEn: 'Body',      labelIt: 'Corpo',          icon: 'shield' },
  belt:      { labelEn: 'Belt',      labelIt: 'Cintura',        icon: 'linear_scale' },
  wrists:    { labelEn: 'Wrists',    labelIt: 'Polsi',          icon: 'watch' },
  hands:     { labelEn: 'Hands',     labelIt: 'Mani',           icon: 'pan_tool_alt' },
  feet:      { labelEn: 'Feet',      labelIt: 'Piedi',          icon: 'footprint' },
  ring1:     { labelEn: 'Ring I',    labelIt: 'Anello I',       icon: 'radio_button_unchecked' },
  ring2:     { labelEn: 'Ring II',   labelIt: 'Anello II',      icon: 'radio_button_unchecked' },
  mainHand:  { labelEn: 'Main Hand', labelIt: 'Mano Primaria',  icon: 'swords' },
  offHand:   { labelEn: 'Off Hand',  labelIt: 'Mano Secondaria',icon: 'security' },
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
  const { locale } = useTranslation()
  const meta = SLOT_META[slot]
  const label = locale === 'it' ? meta.labelIt : meta.labelEn
  const icon = meta.icon

  if (item) {
    return (
      <div className="bg-surface-container/70 backdrop-blur-md border border-white/10 border-l-4 border-l-secondary rounded-xl p-3 min-h-[88px] flex flex-col justify-between gap-1 hover:border-secondary/40 hover:shadow-[0_0_15px_rgba(217,70,239,0.15)] transition-all group">
        <div>
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-base">{icon}</span>
              <span className="font-label text-[10px] uppercase tracking-wider text-secondary font-semibold">{label}</span>
            </div>
            {onUnequip && (
              <button
                onClick={() => onUnequip(item.id)}
                className="opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 transition-opacity text-tertiary hover:text-error p-0.5 rounded cursor-pointer"
                title={locale === 'it' ? `Rimuovi ${item.name}` : `Unequip ${item.name}`}
                aria-label={`Unequip ${item.name}`}
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
          <span className="font-headline text-base text-white font-bold leading-tight block mt-1">{item.name}</span>
        </div>
        {item.description && (
          <span className="font-body text-xs text-tertiary line-clamp-2 leading-snug">{item.description}</span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-surface-container/55 border border-white/10 border-l-4 border-l-outline-variant/50 rounded-xl p-3 min-h-[88px] flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined text-tertiary text-base">{icon}</span>
        <span className="font-label text-[11px] uppercase tracking-wider text-tertiary">{label}</span>
      </div>
      <span className="font-headline text-base text-tertiary/80">—</span>
    </div>
  )
}
