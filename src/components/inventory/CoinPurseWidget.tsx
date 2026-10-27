import type { CoinPurse } from '../../types/inventory'

const DENOMS: { key: keyof CoinPurse; label: string; color: string }[] = [
  { key: 'pp', label: 'Platinum', color: 'text-cyan-400' },
  { key: 'gp', label: 'Gold', color: 'text-amber-400' },
  { key: 'sp', label: 'Silver', color: 'text-tertiary' },
  { key: 'cp', label: 'Copper', color: 'text-orange-400' },
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
      {DENOMS.map(({ key, label, color }) => {
        const val = coins[key] ?? 0
        return (
          <div key={key} className="bg-surface-container-high/80 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex flex-col gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
            <span className={`font-label text-[10px] uppercase tracking-[0.2em] font-bold ${color}`}>{label}</span>
            <span className={`font-label text-3xl sm:text-4xl font-black ${color}`}>{val}</span>
            <div className="flex items-center gap-1 mt-1">
              <button
                onClick={() => onAdjust(key, -10)}
                disabled={val < 10}
                className="flex-1 py-1 rounded text-[10px] font-mono text-tertiary hover:text-white hover:bg-surface-container-highest disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer text-center"
                title={`Decrease ${label} by 10`}
                aria-label={`Decrease ${label} by 10`}
              >
                -10
              </button>
              <button
                onClick={() => onAdjust(key, -1)}
                disabled={val <= 0}
                className="flex-1 py-1 rounded-lg text-tertiary hover:text-white hover:bg-surface-container-highest disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer"
                title={`Decrease ${label} by 1`}
                aria-label={`Decrease ${label} by 1`}
              >
                <span className="material-symbols-outlined text-sm">remove</span>
              </button>
              <button
                onClick={() => onAdjust(key, 1)}
                className="flex-1 py-1 rounded-lg text-tertiary hover:text-primary hover:bg-surface-container-highest transition-colors flex items-center justify-center cursor-pointer"
                title={`Increase ${label} by 1`}
                aria-label={`Increase ${label} by 1`}
              >
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
              <button
                onClick={() => onAdjust(key, 10)}
                className="flex-1 py-1 rounded text-[10px] font-mono text-tertiary hover:text-primary hover:bg-surface-container-highest transition-colors cursor-pointer text-center"
                title={`Increase ${label} by 10`}
                aria-label={`Increase ${label} by 10`}
              >
                +10
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
