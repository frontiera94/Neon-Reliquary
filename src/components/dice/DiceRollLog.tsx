import { useDiceStore } from '../../store/useDiceStore'

/**
 * Always-visible tactical roll feed used by the desktop bento dashboard.
 */
export function DiceRollLog({ compact = false }: { compact?: boolean }) {
  const history = useDiceStore((s) => s.history)
  const clearHistory = useDiceStore((s) => s.clearHistory)

  return (
    <section aria-label="Dice roll log" className="rounded-2xl border border-white/10 bg-[#11131c] overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-sm">casino</span>
          <h3 className="font-headline text-xs uppercase tracking-widest text-secondary font-bold">
            Roll Log
          </h3>
          <span className="font-label text-[10px] text-tertiary tabular-nums">({history.length})</span>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="min-h-[32px] px-2 rounded-lg border border-white/10 text-tertiary hover:text-error hover:border-error/40 font-label text-[9px] uppercase tracking-widest transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </header>

      {history.length === 0 ? (
        <p className="px-3.5 py-5 text-center font-label text-[10px] uppercase tracking-widest text-tertiary/60">
          No rolls yet
        </p>
      ) : (
        <ul className={`divide-y divide-white/5 overflow-y-auto ${compact ? 'max-h-44' : 'max-h-72'}`}>
          {history.map((roll) => (
            <li key={roll.id} className="px-3.5 py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-label text-[10px] text-on-surface truncate">{roll.label}</p>
                <p className="font-label text-[9px] text-tertiary truncate tabular-nums">{roll.formula}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {roll.isCriticalThreat && (
                  <span className="font-label text-[8px] uppercase tracking-widest text-secondary border border-secondary/50 bg-secondary/15 px-1.5 py-0.5 rounded-full">
                    CRIT
                  </span>
                )}
                <span
                  className="font-label text-lg font-black tabular-nums"
                  style={{ color: roll.isCriticalThreat ? '#d946ef' : '#00daf3' }}
                >
                  {roll.total}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
