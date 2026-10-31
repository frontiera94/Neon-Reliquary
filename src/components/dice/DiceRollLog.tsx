import { useState } from 'react'
import { useDiceStore } from '../../store/useDiceStore'
import type { DiceType } from '../../types/dice'

const QUICK_DICE: DiceType[] = [4, 6, 8, 10, 12, 20, 100]

/**
 * Always-visible tactical roll feed used by the desktop bento dashboard and Combat page.
 */
export function DiceRollLog({ compact = false }: { compact?: boolean }) {
  const history = useDiceStore((s) => s.history)
  const clearHistory = useDiceStore((s) => s.clearHistory)
  const openRoll = useDiceStore((s) => s.openRoll)
  const [customMod, setCustomMod] = useState<number>(0)

  const handleQuickRoll = (d: DiceType) => {
    openRoll({
      diceType: d,
      count: 1,
      modifier: customMod,
      label: `Quick d${d}${customMod !== 0 ? ` (${customMod >= 0 ? `+${customMod}` : customMod})` : ''}`,
      breakdown: customMod !== 0 ? [{ label: 'Modifier', value: customMod }] : undefined,
    })
  }

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
            className="min-h-[28px] px-2 rounded-lg border border-white/10 text-tertiary hover:text-error hover:border-error/40 font-label text-[9px] uppercase tracking-widest transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </header>

      {/* Quick Dice Bar */}
      <div className="px-3 py-2 bg-surface-container-high/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 flex-wrap">
          {QUICK_DICE.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleQuickRoll(d)}
              className="px-2 py-1 rounded-lg bg-surface-container border border-white/10 hover:border-primary/50 hover:bg-primary/10 text-on-surface hover:text-primary font-label text-[11px] font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              title={`Roll d${d}${customMod !== 0 ? ` + ${customMod}` : ''}`}
            >
              d{d}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="font-label text-[9px] uppercase tracking-wider text-tertiary">Mod:</span>
          <input
            type="number"
            value={customMod || ''}
            placeholder="+0"
            onChange={(e) => setCustomMod(parseInt(e.target.value) || 0)}
            className="w-12 px-1.5 py-0.5 rounded bg-surface-container-lowest border border-white/10 font-label text-xs text-center text-primary focus:outline-none focus:border-primary"
            title="Modifier to apply to quick roll"
          />
        </div>
      </div>

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
