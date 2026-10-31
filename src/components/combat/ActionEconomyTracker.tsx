import { useState } from 'react'
import { motion } from 'framer-motion'
import type { ActionEconomyState } from '../../types/combat'
import { defaultActionEconomy, computeNextActionEconomy } from '../../store/useSessionStore'
import { SNAPPY_SPRING } from '../../lib/motion-presets'

export interface ActionEconomyTrackerProps {
  actionEconomy?: ActionEconomyState
  currentRound?: number
  initialRound?: number
  onToggleAction?: (action: keyof ActionEconomyState) => void
  onResetActions?: () => void
  onNewTurn?: () => void
  onResetRound?: () => void
  /** Single-line turn strip for the combat cockpit. */
  compact?: boolean
}

export function ActionEconomyTracker({
  actionEconomy: propActionEconomy,
  currentRound: propCurrentRound,
  initialRound = 1,
  onToggleAction,
  onResetActions,
  onNewTurn,
  onResetRound,
  compact = false,
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

  if (compact) {
    return (
      <section
        aria-label="Round action economy"
        className="rounded-2xl border border-white/10 bg-surface-container/80 px-3 py-2.5 backdrop-blur-sm"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Round + remaining actions */}
          <div className="order-1 flex items-center gap-2.5 pr-3 md:border-r md:border-white/10">
            <span
              data-testid="round-counter"
              className="font-label text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1"
            >
              Round{' '}
              <motion.span
                key={currentRound}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SNAPPY_SPRING}
                className="text-primary inline-block"
              >
                {currentRound}
              </motion.span>
            </span>
            <span className="font-label text-[10px] text-tertiary">
              {spentCount === 0 ? 'All actions ready' : `${5 - spentCount}/5 ready`}
            </span>
          </div>

          {/* Turn controls: same row as the round on small screens */}
          <div className="order-2 ml-auto flex items-center gap-1.5 md:order-3 md:ml-0">
            <motion.button
              type="button"
              onClick={handleResetRound}
              whileTap={{ scale: 0.92 }}
              aria-label="Reset Round"
              title="Reset combat to Round 1"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-surface-container-high text-tertiary transition-colors hover:border-amber-400/40 hover:text-amber-300 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
            </motion.button>
            <motion.button
              type="button"
              onClick={handleNewTurn}
              whileTap={{ scale: 0.95 }}
              title="Reset actions and advance to the next round"
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/15 px-3 py-1.5 font-label text-[11px] font-bold uppercase tracking-wider text-primary transition-all hover:bg-primary/25 hover:text-white cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              <span>New Turn</span>
            </motion.button>
          </div>

          {/* Action slots: 3-up grid on phones, inline row on desktop */}
          <div className="order-3 grid w-full grid-cols-3 gap-1.5 md:order-2 md:flex md:min-w-0 md:flex-1 md:flex-wrap md:items-center">
            {actions.map((act) => {
              const isSpent = Boolean(economy[act.key])
              return (
                <motion.button
                  key={act.key}
                  type="button"
                  onClick={() => handleToggle(act.key)}
                  whileTap={{ scale: 0.96 }}
                  aria-pressed={isSpent}
                  title={`${act.label}: ${act.sublabel}`}
                  className={`group flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 font-label text-[11px] font-bold uppercase tracking-wider transition-all md:justify-start md:px-2.5 cursor-pointer ${
                    isSpent
                      ? 'border-white/5 bg-surface-container-lowest/50 text-tertiary/50 line-through'
                      : 'border-white/10 bg-surface-container-high text-on-surface hover:border-primary/40 hover:text-primary'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-base ${
                      isSpent ? 'text-tertiary/40' : 'text-primary'
                    }`}
                  >
                    {act.icon}
                  </span>
                  <span className="truncate">{act.label}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-label="Round action economy"
      className="p-5 rounded-2xl bg-surface-container/90 backdrop-blur-sm border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.35)] flex flex-col gap-4"
    >
      {/* Tracker Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-container-high border border-white/10 flex items-center justify-center text-primary">
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
                  Round{' '}
                  <motion.span
                    key={currentRound}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={SNAPPY_SPRING}
                    className="text-primary font-bold inline-block"
                  >
                    {currentRound}
                  </motion.span>
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
          <motion.button
            type="button"
            onClick={handleResetRound}
            whileTap={{ scale: 0.92 }}
            className="px-2.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-white/10 border border-white/10 hover:border-amber-400/40 text-tertiary hover:text-amber-300 font-label text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(0,0,0,0.2)]"
            title="Reset combat to Round 1"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            <span>Reset Round</span>
          </motion.button>

          {/* New Turn button */}
          <motion.button
            type="button"
            onClick={handleNewTurn}
            whileTap={{ scale: 0.95 }}
            className="px-3.5 py-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/40 hover:border-primary text-primary hover:text-white font-label text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.2)] hover:shadow-[0_0_18px_rgba(0,240,255,0.4)]"
            title="Reset actions and advance to next round"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span>New Turn</span>
          </motion.button>
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

          const readyBadgeColor =
            act.glowColor === 'magenta'
              ? 'bg-secondary/15 text-secondary border border-secondary/30'
              : act.glowColor === 'amber'
              ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
              : 'bg-primary/15 text-primary border border-primary/30'

          return (
            <motion.button
              key={act.key}
              type="button"
              onClick={() => handleToggle(act.key)}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.97 }}
              aria-pressed={isSpent}
              className={`p-3.5 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer select-none ${
                isSpent
                  ? 'bg-surface-container-lowest/60 border-white/5 opacity-60'
                  : `bg-surface-container-high ${readyBorder} ${hoverGlow}`
              }`}
            >
              <div className="flex items-start justify-between w-full mb-3">
                <span className={`material-symbols-outlined text-2xl ${iconColor}`}>
                  {act.icon}
                </span>
                <span
                  className={`font-label text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    isSpent
                      ? 'bg-white/5 text-tertiary border border-white/5'
                      : readyBadgeColor
                  }`}
                >
                  {isSpent ? 'Spent' : 'Ready'}
                </span>
              </div>

              <div>
                <p
                  className={`font-headline text-sm font-bold tracking-wide ${
                    isSpent ? 'text-tertiary line-through' : 'text-white'
                  }`}
                >
                  {act.label}
                </p>
                <p className="font-label text-[10px] text-tertiary mt-0.5 line-clamp-1">
                  {act.sublabel}
                </p>
                {act.badgeSub && (
                  <span className="inline-block mt-1 font-label text-[9px] text-amber-400/80 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                    {act.badgeSub}
                  </span>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}
