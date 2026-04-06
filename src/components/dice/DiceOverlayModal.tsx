import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDiceStore } from '../../store/useDiceStore'
import { rollDice } from '../../lib/dice-engine'
import { DiceRollingAnimation } from './DiceRollingAnimation'

export function DiceOverlayModal() {
  const { isOpen, isRolling, pendingRoll, lastResult, openRoll, setResult, close } = useDiceStore()

  useEffect(() => {
    if (!isOpen || !pendingRoll) return
    const timer = setTimeout(() => {
      const result = rollDice(pendingRoll)
      setResult(result)
    }, 1200)
    return () => clearTimeout(timer)
  }, [isOpen, pendingRoll])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
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
          style={{ backdropFilter: 'blur(12px)', background: 'rgba(19,19,24,0.7)' }}
          onClick={close}
        >
          <motion.section
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="relative w-full max-w-lg bg-surface-container border border-outline-variant/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-tertiary hover:text-primary transition-colors z-10"
              onClick={close}
            >
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>

            {/* Header */}
            <div className="p-8 pb-0 text-center">
              <h2 className="font-headline text-xs uppercase tracking-[0.3em] text-secondary mb-2">
                {pendingRoll?.label ?? lastResult?.label}
              </h2>
              <div className="h-px w-16 bg-secondary/30 mx-auto" />
            </div>

            {/* Dice type display */}
            <div className="flex justify-center gap-6 mt-8">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 flex items-center justify-center bg-surface-container-high border border-primary/30 text-primary">
                  <span className="material-symbols-outlined text-4xl">casino</span>
                </div>
                <span className="font-label text-[10px] mt-2 text-tertiary/70 uppercase tracking-widest">
                  d{pendingRoll?.diceType ?? lastResult?.diceType}
                </span>
              </div>
            </div>

            {/* Content area */}
            <div className="py-10 px-8 flex flex-col items-center min-h-[200px]">
              {isRolling ? (
                <DiceRollingAnimation diceType={pendingRoll?.diceType ?? 20} />
              ) : lastResult ? (
                <>
                  {/* Big result number */}
                  <div className="relative mb-4">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{ background: 'rgba(0,218,243,0.1)', filter: 'blur(30px)' }}
                    />
                    <span
                      className="relative font-label text-[7rem] font-black leading-none"
                      style={{ color: lastResult.isCriticalThreat ? '#e9c349' : '#00daf3',
                               textShadow: lastResult.isCriticalThreat
                                 ? '0 0 30px rgba(233,195,73,0.6)'
                                 : '0 0 30px rgba(0,218,243,0.4)' }}
                    >
                      {lastResult.total}
                    </span>
                  </div>

                  {/* Critical badge */}
                  {lastResult.isCriticalThreat && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="px-4 py-1 bg-secondary/20 border border-secondary font-label text-xs uppercase tracking-widest text-secondary mb-4"
                    >
                      Critical Threat! — Confirm Roll
                    </motion.div>
                  )}

                  {/* Formula breakdown */}
                  <div className="w-full bg-surface-container-lowest p-4 font-label text-xs text-on-surface-variant text-center">
                    {lastResult.formula}
                  </div>
                </>
              ) : null}
            </div>

            {/* Actions */}
            {!isRolling && lastResult && (
              <div className="p-8 pt-0 flex gap-4">
                <button
                  className="flex-1 py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-label text-sm uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-all active:scale-95"
                  onClick={() => pendingRoll && openRoll(pendingRoll)}
                >
                  Roll Again
                </button>
                <button
                  className="flex-1 py-4 border border-outline-variant/30 text-tertiary font-label text-sm uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  onClick={close}
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
