import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDiceStore } from '../../store/useDiceStore'
import { rollDice } from '../../lib/dice-engine'
import { DiceRollingAnimation } from './DiceRollingAnimation'

export function DiceOverlayModal() {
  const { isOpen, isRolling, pendingRoll, lastResult, openRoll, setResult, close } = useDiceStore()
  const isConfirmingRef = useRef(false)
  const [critConfirmed, setCritConfirmed] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isOpen || !pendingRoll) return
    const timer = setTimeout(() => {
      const result = rollDice(pendingRoll)
      if (isConfirmingRef.current) {
        setCritConfirmed(result.naturalRolls[0] !== 1)
        isConfirmingRef.current = false
      }
      setResult(result)
    }, 1200)
    return () => clearTimeout(timer)
  }, [isOpen, pendingRoll])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); setCritConfirmed(null) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(16px)', background: 'rgba(10,10,18,0.85)' }}
          onClick={close}
        >
          <motion.section
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="relative w-full max-w-lg bg-surface-container/95 backdrop-blur-xl border border-white/10 shadow-[0_0_60px_rgba(0,240,255,0.15)] rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-tertiary hover:text-primary transition-colors z-10 p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              onClick={close}
              aria-label="Chiudi"
            >
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>

            {/* Header */}
            <div className="p-8 pb-0 text-center">
              <h2 className="font-headline text-xs uppercase tracking-[0.3em] text-secondary mb-2 neon-glow-accent font-bold">
                {pendingRoll?.label ?? lastResult?.label}
              </h2>
              <div className="h-0.5 w-16 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full" />
            </div>

            {/* Dice type display */}
            <div className="flex justify-center gap-6 mt-8">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 flex items-center justify-center bg-surface-container-high border border-primary/30 text-primary rounded-xl shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                  <span className="material-symbols-outlined text-4xl">casino</span>
                </div>
                <span className="font-label text-[10px] mt-2 text-tertiary uppercase tracking-widest">
                  d{pendingRoll?.diceType ?? lastResult?.diceType}
                </span>
              </div>
            </div>

            {/* Content area */}
            <div className="py-8 px-8 flex flex-col items-center min-h-[200px]">
              {isRolling ? (
                <DiceRollingAnimation diceType={pendingRoll?.diceType ?? 20} />
              ) : lastResult ? (
                <>
                  {/* Big result number */}
                  <div className="relative mb-4">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{ background: lastResult.isCriticalThreat ? 'rgba(217,70,239,0.15)' : 'rgba(0,240,255,0.15)', filter: 'blur(35px)' }}
                    />
                    <span
                      className="relative font-label text-[7rem] font-black leading-none"
                      style={{
                        color: lastResult.isCriticalThreat ? '#d946ef' : '#00f0ff',
                        textShadow: lastResult.isCriticalThreat
                          ? '0 0 35px rgba(217,70,239,0.6)'
                          : '0 0 35px rgba(0,240,255,0.45)'
                      }}
                    >
                      {lastResult.total}
                    </span>
                  </div>

                  {/* Crit result badge */}
                  {critConfirmed === true && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="px-4 py-1.5 bg-secondary/20 border border-secondary font-label text-xs uppercase tracking-widest text-secondary rounded-full mb-4 shadow-[0_0_15px_rgba(217,70,239,0.3)] font-bold"
                    >
                      Critical Hit Confirmed!
                    </motion.div>
                  )}
                  {critConfirmed === false && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="px-4 py-1.5 bg-error/15 border border-error font-label text-xs uppercase tracking-widest text-error rounded-full mb-4 font-bold"
                    >
                      Critical Failed — Natural 1
                    </motion.div>
                  )}
                  {critConfirmed === null && lastResult.isCriticalThreat && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="px-4 py-1.5 bg-secondary/20 border border-secondary font-label text-xs uppercase tracking-widest text-secondary rounded-full mb-4 shadow-[0_0_15px_rgba(217,70,239,0.3)] font-bold"
                    >
                      Critical Threat! — Confirm Roll
                    </motion.div>
                  )}

                  {/* Formula breakdown */}
                  <div className="w-full bg-surface-container-lowest border border-white/5 rounded-2xl p-4 font-label text-xs text-on-surface-variant text-center space-y-2">
                    <div>{lastResult.formula}</div>
                    {lastResult.breakdown && lastResult.breakdown.length > 0 && (
                      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                        {lastResult.breakdown.map((item, idx) => {
                          const isPositive = item.value > 0
                          const isNegative = item.value < 0
                          const badgeClass = isNegative
                            ? 'bg-error/15 border-error/40 text-error'
                            : isPositive
                            ? 'bg-primary/15 border-primary/40 text-primary'
                            : 'bg-surface-container-high border-white/10 text-tertiary'

                          return (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 border text-[10px] font-label font-bold tracking-wider rounded-md ${badgeClass}`}
                            >
                              {isPositive ? `+${item.value}` : item.value} {item.label}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Actions */}
            {!isRolling && lastResult && (
              <div className="p-8 pt-0 flex gap-4">
                {critConfirmed === null && lastResult.isCriticalThreat ? (
                  <button
                    className="flex-1 py-4 bg-gradient-to-r from-secondary to-secondary-container text-white font-label font-bold text-sm uppercase tracking-widest rounded-xl hover:shadow-[0_0_25px_rgba(217,70,239,0.45)] transition-all active:scale-95 cursor-pointer"
                    onClick={() => {
                      if (!pendingRoll) return
                      isConfirmingRef.current = true
                      openRoll({ ...pendingRoll, label: `Confirm: ${pendingRoll.label}` })
                    }}
                  >
                    Confirm Critical
                  </button>
                ) : (
                  <button
                    className="flex-1 py-4 bg-gradient-to-r from-primary to-primary-container text-black font-label font-bold text-sm uppercase tracking-widest rounded-xl hover:shadow-[0_0_25px_rgba(0,240,255,0.45)] transition-all active:scale-95 cursor-pointer"
                    onClick={() => { setCritConfirmed(null); if (pendingRoll) openRoll({ ...pendingRoll }) }}
                  >
                    Roll Again
                  </button>
                )}
                <button
                  className="flex-1 py-4 border border-white/15 text-tertiary font-label text-sm uppercase tracking-widest rounded-xl hover:bg-white/5 hover:text-white transition-all cursor-pointer"
                  onClick={() => { close(); setCritConfirmed(null) }}
                >
                  Dismiss
                </button>
              </div>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
