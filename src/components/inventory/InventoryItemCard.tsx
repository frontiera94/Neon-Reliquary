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
      className={`bg-surface-container/70 backdrop-blur-md p-5 rounded-2xl border border-white/5 border-l-4 ${
        isEquipped ? 'border-l-secondary shadow-[0_0_15px_rgba(217,70,239,0.15)]' : 'border-l-primary'
      } transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_25px_rgba(0,240,255,0.15)] flex flex-col gap-3 group ${qty === 0 ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <span className={`text-[10px] font-label uppercase tracking-widest px-2.5 py-0.5 rounded-full border self-start ${chipColor}`}>
            {item.category}
          </span>
          <h3 className="font-headline text-xl font-bold text-white leading-tight">{item.name}</h3>
        </div>

        {/* Quantity controls */}
        <div className="flex items-center gap-1 flex-shrink-0 mt-1">
          <button
            onClick={() => onAdjust(-1)}
            disabled={qty <= 0}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-tertiary hover:text-white hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            aria-label={`Decrease ${item.name} quantity`}
          >
            <span className="material-symbols-outlined text-base">remove</span>
          </button>
          <span className="font-label text-base text-white w-8 text-center font-bold">×{qty}</span>
          <button
            onClick={() => onAdjust(1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-tertiary hover:text-primary hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            aria-label={`Increase ${item.name} quantity`}
          >
            <span className="material-symbols-outlined text-base">add</span>
          </button>
        </div>
      </div>

      {item.description && (
        <p className="font-body text-tertiary text-sm leading-relaxed">{item.description}</p>
      )}

      {isEquippable && (
        <div className="flex items-center justify-between pt-3 mt-auto border-t border-white/5">
          <div className="flex flex-wrap items-center gap-1.5">
            {item.slot && (
              <span className="font-label text-[10px] text-tertiary uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded">
                {item.slot}
              </span>
            )}
            {item.armorBonus !== undefined && (
              <span className="font-label text-[10px] text-secondary font-bold bg-secondary/10 px-2 py-0.5 rounded">
                +{item.armorBonus} AC
              </span>
            )}
            {item.armorCheckPenalty !== undefined && item.armorCheckPenalty < 0 && (
              <span className="font-label text-[10px] text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded">
                {item.armorCheckPenalty} ACP
              </span>
            )}
            {item.spellFailureChance !== undefined && item.spellFailureChance > 0 && (
              <span className="font-label text-[10px] text-red-400 font-bold bg-red-400/10 px-2 py-0.5 rounded">
                {item.spellFailureChance}% ASF
              </span>
            )}
          </div>
          {onToggleEquip && (
            <button
              onClick={onToggleEquip}
              className={`px-3 py-1 rounded-xl text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
                isEquipped
                  ? 'bg-secondary/20 text-secondary border border-secondary/40 hover:bg-secondary/30'
                  : 'bg-white/5 text-tertiary border border-white/10 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {isEquipped ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              {isEquipped ? 'Equipped' : 'Equip'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
