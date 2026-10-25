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
  const totalGpEquivalent =
    (coins.pp ?? 0) * 10 +
    (coins.gp ?? 0) +
    (coins.sp ?? 0) / 10 +
    (coins.cp ?? 0) / 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-label">
        <span className="text-tertiary uppercase tracking-wider text-[10px] sm:text-xs">Valute correnti</span>
        <span className="text-amber-400 font-bold tracking-wider text-[10px] sm:text-xs">
          Totale stimato: <span className="font-mono">{totalGpEquivalent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span> GP
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {DENOMS.map(({ key, label, color }) => {
          const val = coins[key] ?? 0
          return (
            <div
              key={key}
              className="bg-surface-container-high/80 backdrop-blur-sm border border-white/10 rounded-xl p-2 sm:p-3 flex flex-col justify-between gap-1 sm:gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.2)]"
            >
              <div className="flex items-center justify-between">
                <span className={`font-label text-[8px] sm:text-[10px] uppercase tracking-wider font-bold ${color}`}>
                  {label}
                </span>
                <span className="font-mono text-[8px] sm:text-[9px] text-tertiary uppercase font-bold">
                  {key}
                </span>
              </div>
              <span className={`font-label text-lg sm:text-2xl md:text-3xl font-black ${color} leading-none`}>
                {val}
              </span>
              <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5">
                <button
                  onClick={() => onAdjust(key, -10)}
                  disabled={val < 10}
                  className="flex-1 py-0.5 sm:py-1 rounded text-[8px] sm:text-[10px] font-mono text-tertiary hover:text-white hover:bg-surface-container-highest disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer text-center"
                  title={`Decrease ${label} by 10`}
                  aria-label={`Decrease ${label} by 10`}
                >
                  -10
                </button>
                <button
                  onClick={() => onAdjust(key, -1)}
                  disabled={val <= 0}
                  className="flex-1 py-0.5 sm:py-1 rounded-md text-tertiary hover:text-white hover:bg-surface-container-highest disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer"
                  title={`Decrease ${label} by 1`}
                  aria-label={`Decrease ${label} by 1`}
                >
                  <span className="material-symbols-outlined text-xs sm:text-sm">remove</span>
                </button>
                <button
                  onClick={() => onAdjust(key, 1)}
                  className="flex-1 py-0.5 sm:py-1 rounded-md text-tertiary hover:text-primary hover:bg-surface-container-highest transition-colors flex items-center justify-center cursor-pointer"
                  title={`Increase ${label} by 1`}
                  aria-label={`Increase ${label} by 1`}
                >
                  <span className="material-symbols-outlined text-xs sm:text-sm">add</span>
                </button>
                <button
                  onClick={() => onAdjust(key, 10)}
                  className="flex-1 py-0.5 sm:py-1 rounded text-[8px] sm:text-[10px] font-mono text-tertiary hover:text-primary hover:bg-surface-container-highest transition-colors cursor-pointer text-center"
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
    </div>
  )
}

