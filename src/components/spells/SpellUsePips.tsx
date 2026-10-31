import { motion } from 'framer-motion'
import { SNAPPY_SPRING } from '../../lib/motion-presets'

export interface SpellUsePipsProps {
  label: string
  prefix?: string
  total: number
  spent: number
  compact?: boolean
  disabled?: boolean
  onSpend?: () => void
  onSetSpent?: (amount: number) => void
}

/**
 * Touch-friendly spell usage tracker with glowing pips.
 * Adheres to 44x44px touch targets on mobile with glowing cyber cyan visual cores.
 */
export function SpellUsePips({
  label,
  prefix,
  total,
  spent,
  compact = false,
  disabled = false,
  onSpend,
  onSetSpent,
}: SpellUsePipsProps) {
  const remaining = Math.max(0, total - spent)

  const handleClick = (index: number) => {
    if (disabled) return
    if (!onSetSpent && !onSpend) return

    if (index < spent) {
      if (onSetSpent) onSetSpent(index)
    } else if (index === spent) {
      if (onSpend) onSpend()
      else if (onSetSpent) onSetSpent(index + 1)
    } else {
      if (onSetSpent) onSetSpent(index + 1)
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      onClick={(event) => event.stopPropagation()}
      role="group"
      aria-label={`${label}: ${remaining} of ${total} remaining`}
      title={label}
    >
      <span className="inline-flex items-center gap-1 font-label text-[9px] uppercase tracking-wider mr-1">
        {prefix ? (
          <>
            <span className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-secondary text-[8px] font-bold shrink-0">
              {prefix}
            </span>
            <span className="text-tertiary font-semibold truncate max-w-[140px] sm:max-w-[200px]">
              {label}
            </span>
          </>
        ) : (
          <span className="text-tertiary truncate max-w-[140px] sm:max-w-[200px]">{label}</span>
        )}
      </span>
      <div className={`flex flex-wrap items-center ${compact ? 'gap-0.5' : 'gap-1'}`}>
        {Array.from({ length: total }).map((_, index) => {
          const isSpent = index < spent
          const isInteractive = !disabled && (Boolean(onSetSpent) || Boolean(onSpend))
          return (
            <motion.button
              key={index}
              type="button"
              disabled={disabled || !isInteractive}
              onClick={() => handleClick(index)}
              whileTap={isInteractive ? { scale: 0.88 } : undefined}
              aria-label={`${isSpent ? 'Recover' : 'Spend'} ${label} ${index + 1} of ${total}`}
              aria-pressed={isSpent}
              className={`${
                compact ? 'min-h-[32px] min-w-[32px]' : 'min-h-[44px] min-w-[44px]'
              } flex items-center justify-center ${
                isInteractive ? 'cursor-pointer group' : 'cursor-default'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60`}
            >
              <motion.span
                layout
                animate={{ scale: isSpent ? 0.95 : 1 }}
                transition={SNAPPY_SPRING}
                className={`block transition-all ${isInteractive ? 'group-hover:scale-110' : ''} ${
                  isSpent
                    ? 'w-2.5 h-2.5 rounded-full border border-white/20 bg-surface-container-highest'
                    : 'w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,240,255,0.55)]'
                }`}
              />
            </motion.button>
          )
        })}
      </div>
      <span
        className={`font-label text-[10px] font-bold tabular-nums ml-1 ${
          remaining === 0 ? 'text-error' : 'text-on-surface-variant'
        }`}
      >
        {remaining}/{total}
      </span>
    </div>
  )
}
