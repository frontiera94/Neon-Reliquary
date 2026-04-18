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
  onAdjust,
}: {
  item: InventoryItem
  qty: number
  onAdjust: (delta: number) => void
}) {
  const chipColor = categoryColors[item.category] ?? categoryColors.gear

  return (
    <div
      className={`bg-surface-container p-4 border-l-4 border-primary transition-all hover:bg-surface-container-high hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] flex flex-col gap-3 ${qty === 0 ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <span className={`text-[10px] font-label uppercase tracking-[0.2em] bg-surface-container-lowest px-2 py-0.5 border self-start ${chipColor}`}>
            {item.category}
          </span>
          <h3 className="font-headline text-xl font-bold text-on-surface leading-tight">{item.name}</h3>
        </div>

        {/* Quantity controls */}
        <div className="flex items-center gap-1 flex-shrink-0 mt-1">
          <button
            onClick={() => onAdjust(-1)}
            disabled={qty <= 0}
            className="w-7 h-7 flex items-center justify-center text-tertiary hover:text-white hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined text-base">remove</span>
          </button>
          <span className="font-label text-base text-on-surface w-8 text-center">×{qty}</span>
          <button
            onClick={() => onAdjust(1)}
            className="w-7 h-7 flex items-center justify-center text-tertiary hover:text-primary hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-base">add</span>
          </button>
        </div>
      </div>

      {item.description && (
        <p className="font-body text-tertiary text-sm leading-relaxed">{item.description}</p>
      )}
    </div>
  )
}
