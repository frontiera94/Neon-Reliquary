import type { ActionEconomyState } from '../../types/combat'
import { evaluateVitalStatus } from '../../lib/stat-calc'

interface CombatTacticalHUDProps {
  hp: number
  maxHp: number
  ac: number
  conScore?: number
  cmb?: number
  cmd?: number
  currentRound?: number
  actionEconomy?: ActionEconomyState
  onAdjustHp: (delta: number) => void
  onToggleAction?: (action: keyof ActionEconomyState) => void
  onNewTurn?: () => void
  onResetRound?: () => void
}

export function CombatTacticalHUD({
  hp,
  maxHp,
  ac,
  conScore,
  cmb,
  cmd,
  onAdjustHp,
}: CombatTacticalHUDProps) {
  const percent = Math.max(0, Math.min(100, (hp / maxHp) * 100))
  const vitalStatus = conScore !== undefined
    ? evaluateVitalStatus(hp, conScore)
    : hp <= 0
    ? (hp === 0 ? 'disabled' : 'dying')
    : 'conscious'

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Vitality Core & Defenses */}
      <div className="flex items-center gap-1.5 bg-surface-container-high/90 border border-white/10 p-1.5 rounded-xl">
        <button
          onClick={() => onAdjustHp(-10)}
          className="px-1.5 h-8 rounded-lg bg-surface-container-lowest hover:bg-error-container text-tertiary hover:text-white transition-all active:scale-95 flex items-center justify-center cursor-pointer border border-white/5 font-mono text-[10px] font-bold"
          aria-label="Subtract 10 HP"
          title="-10 HP"
        >
          -10
        </button>
        <button
          onClick={() => onAdjustHp(-5)}
          className="px-1.5 h-8 rounded-lg bg-surface-container-lowest hover:bg-error-container text-tertiary hover:text-white transition-all active:scale-95 flex items-center justify-center cursor-pointer border border-white/5 font-mono text-[10px] font-bold"
          aria-label="Subtract 5 HP"
          title="-5 HP"
        >
          -5
        </button>
        <button
          onClick={() => onAdjustHp(-1)}
          className="w-8 h-8 rounded-lg bg-surface-container-lowest hover:bg-error-container text-primary hover:text-white transition-all active:scale-95 flex items-center justify-center cursor-pointer border border-white/5"
          aria-label="Decrease HP"
        >
          <span className="material-symbols-outlined text-base">remove</span>
        </button>

        <div className="px-3 py-1 text-center min-w-[90px]">
          <div className="flex items-baseline justify-center gap-1">
            <span className="font-label text-xl font-black text-primary leading-none">
              {hp}
            </span>
            <span className="font-label text-xs text-tertiary">
              /{maxHp}
            </span>
          </div>
          {/* Mini Health Bar */}
          <div className="w-full h-1.5 bg-surface-container-lowest rounded-full overflow-hidden mt-1 border border-white/5">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${percent}%`,
                background: 'linear-gradient(90deg, #00f0ff 0%, #d946ef 70%, #ff4b60 100%)',
              }}
            />
          </div>
        </div>

        <button
          onClick={() => onAdjustHp(1)}
          className="w-8 h-8 rounded-lg bg-surface-container-lowest hover:bg-primary-container text-primary hover:text-black transition-all active:scale-95 flex items-center justify-center cursor-pointer border border-white/5"
          aria-label="Increase HP"
        >
          <span className="material-symbols-outlined text-base">add</span>
        </button>
        <button
          onClick={() => onAdjustHp(5)}
          className="px-1.5 h-8 rounded-lg bg-surface-container-lowest hover:bg-primary-container text-tertiary hover:text-black transition-all active:scale-95 flex items-center justify-center cursor-pointer border border-white/5 font-mono text-[10px] font-bold"
          aria-label="Add 5 HP"
          title="+5 HP"
        >
          +5
        </button>
        <button
          onClick={() => onAdjustHp(10)}
          className="px-1.5 h-8 rounded-lg bg-surface-container-lowest hover:bg-primary-container text-tertiary hover:text-black transition-all active:scale-95 flex items-center justify-center cursor-pointer border border-white/5 font-mono text-[10px] font-bold"
          aria-label="Add 10 HP"
          title="+10 HP"
        >
          +10
        </button>
      </div>

      {/* Vital Status Indicator if below conscious threshold */}
      {vitalStatus !== 'conscious' && (
        <div>
          {vitalStatus === 'disabled' && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-label font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">warning</span>
              Disabled (0 HP)
            </span>
          )}
          {vitalStatus === 'dying' && (
            <span className="px-2.5 py-1 rounded-lg bg-red-600/25 text-red-400 border border-red-500/50 text-[10px] font-label font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">heart_broken</span>
              Dying ({hp} HP)
            </span>
          )}
          {vitalStatus === 'dead' && (
            <span className="px-2.5 py-1 rounded-lg bg-black/60 text-tertiary border border-white/20 text-[10px] font-label font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">skull</span>
              Dead
            </span>
          )}
        </div>
      )}

      {/* Defense Badges: AC, CMB, CMD */}
      <div className="flex items-center gap-2">
        {/* AC */}
        <div className="bg-surface-container-high/90 px-3 py-1.5 rounded-xl border border-white/10 text-center min-w-[56px]" title="Armor Class">
          <span className="font-label text-[9px] text-tertiary uppercase tracking-widest block leading-none">
            AC
          </span>
          <span className="font-label text-base font-bold text-white leading-tight">
            {ac}
          </span>
        </div>

        {/* CMB */}
        {cmb !== undefined && (
          <div className="bg-surface-container-high/90 px-3 py-1.5 rounded-xl border border-secondary/20 text-center min-w-[56px]" title="Combat Maneuver Bonus">
            <span className="font-label text-[9px] text-secondary uppercase tracking-widest block leading-none font-semibold">
              CMB
            </span>
            <span className="font-label text-base font-bold text-secondary leading-tight">
              {cmb >= 0 ? `+${cmb}` : cmb}
            </span>
          </div>
        )}

        {/* CMD */}
        {cmd !== undefined && (
          <div className="bg-surface-container-high/90 px-3 py-1.5 rounded-xl border border-primary/20 text-center min-w-[56px]" title="Combat Maneuver Defense">
            <span className="font-label text-[9px] text-primary uppercase tracking-widest block leading-none font-semibold">
              CMD
            </span>
            <span className="font-label text-base font-bold text-primary leading-tight">
              {cmd}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
