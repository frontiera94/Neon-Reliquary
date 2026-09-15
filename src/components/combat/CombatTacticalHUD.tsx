import type { ActionEconomyState } from '../../types/combat'

interface CombatTacticalHUDProps {
  hp: number
  maxHp: number
  ac: number
  cmb?: number
  cmd?: number
  currentRound?: number
  actionEconomy?: ActionEconomyState
  onAdjustHp: (delta: number) => void
  onToggleAction: (action: keyof ActionEconomyState) => void
  onNewTurn: () => void
  onResetRound?: () => void
}

export function CombatTacticalHUD({
  hp,
  maxHp,
  ac,
  cmb,
  cmd,
  currentRound = 1,
  actionEconomy = {
    standard: false,
    move: false,
    swift: false,
    immediate: false,
    fullRound: false,
  },
  onAdjustHp,
  onToggleAction,
  onNewTurn,
  onResetRound,
}: CombatTacticalHUDProps) {
  const percent = Math.max(0, Math.min(100, (hp / maxHp) * 100))

  const actions: {
    key: keyof ActionEconomyState
    label: string
    shortLabel: string
    icon: string
    color: string
  }[] = [
    {
      key: 'standard',
      label: 'Standard',
      shortLabel: 'Standard',
      icon: 'swords',
      color: '#00f0ff',
    },
    {
      key: 'move',
      label: 'Movement',
      shortLabel: 'Movement',
      icon: 'directions_run',
      color: '#00f0ff',
    },
    {
      key: 'swift',
      label: 'Swift',
      shortLabel: 'Swift',
      icon: 'bolt',
      color: '#d946ef',
    },
    {
      key: 'immediate',
      label: 'Immediate',
      shortLabel: 'Immediate',
      icon: 'shield',
      color: '#d946ef',
    },
    {
      key: 'fullRound',
      label: 'Full-Round',
      shortLabel: 'Full-Round',
      icon: 'sync_alt',
      color: '#ffb800',
    },
  ]

  return (
    <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
      {/* Left Section: Vitality Core & Defenses */}
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        {/* HP Adjusters & Display */}
        <div className="flex items-center gap-1.5 bg-surface-container-high/90 border border-white/10 p-1.5 rounded-xl">
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
        </div>

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

      {/* Subtle Vertical Divider on XL */}
      <div className="hidden xl:block h-8 w-px bg-white/10" />

      {/* Right Section: Round Action Economy Deck */}
      <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
        <span className="sr-only">Round Action Economy</span>
        {/* Round Badge */}
        <div className="flex items-center gap-1.5 bg-surface-container-high/90 px-3 py-1.5 rounded-xl border border-white/10">
          <span className="material-symbols-outlined text-sm text-secondary">timer</span>
          <span className="font-label text-xs font-bold text-white uppercase tracking-wider">
            Round {currentRound}
          </span>
          {onResetRound && (
            <button
              onClick={onResetRound}
              className="ml-1 text-tertiary hover:text-error transition-colors cursor-pointer p-0.5"
              title="Reset Combat to Round 1"
            >
              <span className="material-symbols-outlined text-xs">restart_alt</span>
            </button>
          )}
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {actions.map((act) => {
            const isSpent = actionEconomy[act.key]
            return (
              <button
                key={act.key}
                onClick={() => onToggleAction(act.key)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-label uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  isSpent
                    ? 'bg-surface-container-lowest/80 border-white/5 text-tertiary opacity-60 hover:opacity-85'
                    : 'bg-surface-container-high/90 border-white/10 hover:border-primary/50 text-white hover:shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                }`}
                title={`${act.label} Action: ${isSpent ? 'Spent (click to restore)' : 'Ready (click to consume)'}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all"
                  style={{
                    backgroundColor: isSpent ? '#ef4444' : act.color,
                    boxShadow: isSpent ? 'none' : `0 0 6px ${act.color}`,
                  }}
                />
                <span className={isSpent ? 'line-through text-tertiary' : 'font-bold'}>
                  {act.shortLabel}
                </span>
              </button>
            )
          })}
        </div>

        {/* New Turn Button */}
        <button
          onClick={onNewTurn}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 border border-primary/40 text-primary font-label text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(0,240,255,0.2)] hover:shadow-[0_0_20px_rgba(0,240,255,0.35)]"
          title="End turn, reset actions, and advance to next round"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          <span>New Turn</span>
        </button>
      </div>
    </div>
  )
}
