import type { InventoryItem } from '../../types/inventory'

const categoryColors: Record<string, string> = {
  weapon: 'text-primary border-primary/20',
  armor: 'text-secondary border-secondary/20',
  consumable: 'text-error border-error/20',
  gear: 'text-tertiary border-outline-variant/30',
  magic: 'text-primary border-primary/20',
}

export function InventoryItemCard({
  item,
  qty,
  isEquipped,
  onAdjust,
  onToggleEquip,
}: {
  item: InventoryItem
  qty: number
  isEquipped?: boolean
  onAdjust: (delta: number) => void
  onToggleEquip?: () => void
}) {
  const chipColor = categoryColors[item.category] ?? categoryColors.gear
  const isEquippable = Boolean(item.slot || item.category === 'weapon' || item.category === 'armor' || item.category === 'magic')

  return (
    <div
      className={`bg-surface-container/70 backdrop-blur-md p-2.5 sm:p-3.5 md:p-4 rounded-xl sm:rounded-2xl border border-white/5 border-l-4 ${
        isEquipped ? 'border-l-secondary shadow-[0_0_15px_rgba(217,70,239,0.15)]' : 'border-l-primary'
      } transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] flex flex-col justify-between gap-2 sm:gap-3 group ${qty === 0 ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
          <span className={`text-[8px] sm:text-[9px] font-label uppercase tracking-wider px-2 py-0.2 rounded-full border self-start ${chipColor}`}>
            {item.category}
          </span>
          <h3 className="font-headline text-sm sm:text-base md:text-lg font-bold text-white leading-tight truncate">{item.name}</h3>
        </div>

        {/* Quantity controls */}
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          <button
            onClick={() => onAdjust(-1)}
            disabled={qty <= 0}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-tertiary hover:text-white hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            aria-label={`Decrease ${item.name} quantity`}
          >
            <span className="material-symbols-outlined text-sm sm:text-base">remove</span>
          </button>
          <span className="font-label text-xs sm:text-sm text-white w-6 sm:w-8 text-center font-bold">×{qty}</span>
          <button
            onClick={() => onAdjust(1)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-tertiary hover:text-primary hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            aria-label={`Increase ${item.name} quantity`}
          >
            <span className="material-symbols-outlined text-sm sm:text-base">add</span>
          </button>
        </div>
      </div>

      {item.description && (
        <p className="font-body text-tertiary text-xs leading-relaxed line-clamp-2">{item.description}</p>
      )}

      {isEquippable && (
        <div className="flex items-center justify-between pt-2 sm:pt-2.5 mt-auto border-t border-white/5 gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {item.slot && (
              <span className="font-label text-[8px] sm:text-[9px] text-tertiary uppercase tracking-wider bg-white/5 px-1.5 py-0.2 rounded">
                {item.slot}
              </span>
            )}
            {item.armorBonus !== undefined && (
              <span className="font-label text-[8px] sm:text-[9px] text-secondary font-bold bg-secondary/10 px-1.5 py-0.2 rounded">
                +{item.armorBonus} AC
              </span>
            )}
            {item.armorCheckPenalty !== undefined && item.armorCheckPenalty < 0 && (
              <span className="font-label text-[8px] sm:text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.2 rounded">
                {item.armorCheckPenalty} ACP
              </span>
            )}
            {item.spellFailureChance !== undefined && item.spellFailureChance > 0 && (
              <span className="font-label text-[8px] sm:text-[9px] text-red-400 font-bold bg-red-400/10 px-1.5 py-0.2 rounded">
                {item.spellFailureChance}% ASF
              </span>
            )}
          </div>
          {onToggleEquip && (
            <button
              onClick={onToggleEquip}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer flex items-center gap-1 flex-shrink-0 ${
                isEquipped
                  ? 'bg-secondary/20 text-secondary border border-secondary/40 hover:bg-secondary/30'
                  : 'bg-white/5 text-tertiary border border-white/10 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-xs sm:text-sm">
                {isEquipped ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span>{isEquipped ? 'Equipped' : 'Equip'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
