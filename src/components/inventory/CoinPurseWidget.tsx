import type { CoinPurse } from '../../types/inventory'

const DENOMS: { key: keyof CoinPurse; label: string; color: string }[] = [
  { key: 'gp', label: 'Gold', color: 'text-secondary' },
  { key: 'sp', label: 'Silver', color: 'text-tertiary' },
  { key: 'cp', label: 'Copper', color: 'text-on-surface' },
]

export function CoinPurseWidget({
  coins,
  onAdjust,
}: {
  coins: CoinPurse
  onAdjust: (denom: keyof CoinPurse, delta: number) => void
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {DENOMS.map(({ key, label, color }) => (
        <div key={key} className="bg-surface-container-high border-l-4 border-primary p-4 flex flex-col gap-2">
          <span className={`font-label text-[10px] uppercase tracking-[0.2em] ${color}`}>{label}</span>
          <span className={`font-label text-4xl font-bold ${color}`}>{coins[key]}</span>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => onAdjust(key, -1)}
              disabled={coins[key] <= 0}
              className="flex-1 py-1 text-tertiary hover:text-white hover:bg-surface-container-highest disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-sm">remove</span>
            </button>
            <button
              onClick={() => onAdjust(key, 1)}
              className="flex-1 py-1 text-tertiary hover:text-primary hover:bg-surface-container-highest transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
