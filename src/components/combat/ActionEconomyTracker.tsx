import { useState } from 'react'
import type { ActionEconomyState } from '../../types/combat'
import { defaultActionEconomy, computeNextActionEconomy } from '../../store/useSessionStore'

export interface ActionEconomyTrackerProps {
  actionEconomy?: ActionEconomyState
  currentRound?: number
  initialRound?: number
  onToggleAction?: (action: keyof ActionEconomyState) => void
  onResetActions?: () => void
  onNewTurn?: () => void
  onResetRound?: () => void
}

export function ActionEconomyTracker({
  actionEconomy: propActionEconomy,
  currentRound: propCurrentRound,
  initialRound = 1,
  onToggleAction,
  onResetActions,
  onNewTurn,
  onResetRound,
}: ActionEconomyTrackerProps) {
  const [internalEconomy, setInternalEconomy] = useState<ActionEconomyState>(defaultActionEconomy())
  const [internalRound, setInternalRound] = useState<number>(initialRound)

  const isEconomyControlled = propActionEconomy !== undefined
  const isRoundControlled = propCurrentRound !== undefined

  const economy = isEconomyControlled ? propActionEconomy : internalEconomy
  const currentRound = isRoundControlled ? propCurrentRound : internalRound

  const handleToggle = (actionKey: keyof ActionEconomyState) => {
    onToggleAction?.(actionKey)
    if (!isEconomyControlled) {
      setInternalEconomy((prev) => computeNextActionEconomy(prev, actionKey))
    }
  }

  const handleNewTurn = () => {
    if (onNewTurn) {
      onNewTurn()
    } else if (onResetActions) {
      onResetActions()
    }
    if (!isEconomyControlled) {
      setInternalEconomy(defaultActionEconomy())
    }
    if (!isRoundControlled) {
      setInternalRound((r) => r + 1)
    }
  }

  const handleResetRound = () => {
    if (onResetRound) {
      onResetRound()
    }
    if (!isEconomyControlled) {
      setInternalEconomy(defaultActionEconomy())
    }
    if (!isRoundControlled) {
      setInternalRound(1)
    }
  }

  const actions: {
    key: keyof ActionEconomyState
    label: string
    sublabel: string
    badgeSub?: string
    icon: string
    glowColor: 'cyan' | 'magenta' | 'amber'
  }[] = [
    {
      key: 'standard',
      label: 'Standard',
      sublabel: 'Attack, Cast, Maneuver',
      icon: 'swords',
      glowColor: 'cyan',
    },
    {
      key: 'move',
      label: 'Movement',
      sublabel: 'Move speed, Draw weapon',
      icon: 'directions_run',
      glowColor: 'cyan',
    },
    {
      key: 'swift',
      label: 'Swift',
      sublabel: 'Quickened spell, Stance',
      icon: 'bolt',
      glowColor: 'magenta',
    },
    {
      key: 'immediate',
      label: 'Immediate',
      sublabel: 'Reaction (Feather Fall)',
      icon: 'shield',
      glowColor: 'magenta',
    },
    {
      key: 'fullRound',
      label: 'Full-Round',
      sublabel: 'Full Attack, Charge, Run',
      badgeSub: 'Standard + Move',
      icon: 'sync_alt',
      glowColor: 'amber',
    },
  ]

  const spentCount = Object.values(economy).filter(Boolean).length

  return (
    <div className="bg-surface-container/90 backdrop-blur-sm p-5 rounded-2xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.35)] space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_12px_rgba(0,240,255,0.2)]">
            <span className="material-symbols-outlined text-xl">hourglass_empty</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-headline text-sm uppercase tracking-widest text-white font-bold">
                Round Action Economy
              </h3>
              {/* Glowing Round Badge */}
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-surface-container-highest border border-primary/30 shadow-[0_0_10px_rgba(0,240,255,0.15)]"
                aria-label={`Round ${currentRound}`}
              >
                <span className="material-symbols-outlined text-primary text-xs">timer</span>
                <span
                  data-testid="round-counter"
                  className="font-headline text-xs font-black tracking-wider text-white"
                >
                  Round <span className="text-primary font-bold">{currentRound}</span>
                </span>
              </div>
            </div>
            <p className="font-label text-[10px] text-tertiary tracking-wider mt-0.5">
              {spentCount === 0
                ? 'All actions available for this turn'
                : `${spentCount} of 5 actions committed`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Reset Combat button */}
          <button
            type="button"
            onClick={handleResetRound}
            className="px-2.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-white/10 border border-white/10 hover:border-amber-400/40 text-tertiary hover:text-amber-300 font-label text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-[0_0_10px_rgba(0,0,0,0.2)]"
            title="Reset combat to Round 1"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            <span>Reset Round</span>
          </button>

          {/* New Turn button */}
          <button
            type="button"
            onClick={handleNewTurn}
            className="px-3.5 py-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/40 hover:border-primary text-primary hover:text-white font-label text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(0,240,255,0.2)] hover:shadow-[0_0_18px_rgba(0,240,255,0.4)]"
            title="Reset actions and advance to next round"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span>New Turn</span>
          </button>
        </div>
      </div>

      {/* Action Chips Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((act) => {
          const isSpent = Boolean(economy[act.key])

          // Dynamic glow and border classes depending on theme color
          const hoverGlow =
            act.glowColor === 'magenta'
              ? 'hover:border-secondary/60 hover:shadow-[0_0_20px_rgba(217,70,239,0.25)]'
              : act.glowColor === 'amber'
              ? 'hover:border-amber-400/60 hover:shadow-[0_0_20px_rgba(251,191,36,0.25)]'
              : 'hover:border-primary/60 hover:shadow-[0_0_20px_rgba(0,240,255,0.25)]'

          const readyBorder =
            act.glowColor === 'magenta'
              ? 'border-secondary/30'
              : act.glowColor === 'amber'
              ? 'border-amber-400/30'
              : 'border-primary/30'

          const iconColor =
            isSpent
              ? 'text-tertiary/40'
              : act.glowColor === 'magenta'
              ? 'text-secondary'
              : act.glowColor === 'amber'
              ? 'text-amber-400'
              : 'text-primary'

          const badgeReadyStyle =
            act.glowColor === 'magenta'
              ? 'bg-secondary/15 text-secondary border-secondary/40 shadow-[0_0_8px_rgba(217,70,239,0.25)]'
              : act.glowColor === 'amber'
              ? 'bg-amber-400/15 text-amber-300 border-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.25)]'
              : 'bg-primary/15 text-primary border-primary/40 shadow-[0_0_8px_rgba(0,240,255,0.25)]'

          return (
            <button
              key={act.key}
              type="button"
              onClick={() => handleToggle(act.key)}
              className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden group active:scale-95 ${
                isSpent
                  ? 'bg-surface-container-lowest/60 border-white/5 opacity-60 hover:opacity-85 hover:border-white/20'
                  : `bg-surface-container-high/90 ${readyBorder} ${hoverGlow} hover:scale-[1.02]`
              }`}
            >
              {/* Top row with icon & status */}
              <div className="flex items-center justify-between mb-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    isSpent ? 'bg-white/5' : 'bg-surface-container-highest border border-white/10'
                  }`}
                >
                  <span className={`material-symbols-outlined text-lg ${iconColor}`}>
                    {act.icon}
                  </span>
                </div>

                <span
                  className={`text-[9px] font-label uppercase tracking-widest px-2.5 py-0.5 rounded-full font-bold border transition-all flex items-center gap-1 ${
                    isSpent
                      ? 'bg-error/10 text-error border-error/30'
                      : badgeReadyStyle
                  }`}
                >
                  {!isSpent && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                  {isSpent ? 'Spent' : 'Ready'}
                </span>
              </div>

              {/* Title & description */}
              <div>
                <div className="flex items-center gap-1.5">
                  <p
                    className={`font-headline text-xs font-bold uppercase tracking-wider transition-colors ${
                      isSpent ? 'text-tertiary line-through' : 'text-white'
                    }`}
                  >
                    {act.label}
                  </p>
                  {act.badgeSub && !isSpent && (
                    <span className="text-[8px] font-mono text-amber-400/80 px-1 py-0.2 rounded bg-amber-400/10 border border-amber-400/20">
                      2-in-1
                    </span>
                  )}
                </div>
                <p
                  className={`font-label text-[9px] truncate mt-0.5 transition-colors ${
                    isSpent ? 'text-tertiary/60' : 'text-tertiary'
                  }`}
                >
                  {act.sublabel}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

