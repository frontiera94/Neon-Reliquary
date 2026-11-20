import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Weapon } from '../../types/combat'
import type { EffectiveWeaponCalculated } from '../../lib/stat-calc'
import { parseDiceFormula, rollDie } from '../../lib/dice-engine'
import { useTranslation, type Locale } from '../../i18n'

export interface AttackResult {
  index: number
  label: string
  bonus: number
  naturalRoll: number
  total: number
  isCritThreat: boolean
  isNat1: boolean
  isNat20: boolean
  isHaste?: boolean
  isOffhand?: boolean
  isSecondary?: boolean
  damageOverride?: { dice: string; bonus: number }
  critConfirmation?: {
    naturalRoll: number
    total: number
    critConfirmBonus?: number
  }
}

interface FullAttackModalProps {
  isOpen: boolean
  onClose: () => void
  weapon: Weapon
  effective: EffectiveWeaponCalculated
  twfActive: boolean
  offhandPenalty: number
  hasteActive?: boolean
  kiExtraAttackActive?: boolean
  onToggleKiExtraAttack?: () => void
  kiRemaining?: number
  kiMax?: number
  secondaryAttack?: {
    name: string
    bonus: number
    damageDice: string
    damageBonus: number
    critRange?: number
    critMultiplier?: number
  }
  critConfirmBonus?: number
  sneakAttackDice?: string
  extraDiceLabel?: string
  animated?: boolean
  rollDuration?: number
  onRollDamage: (label: string, bonus: number, isCritical?: boolean, damageDiceOverride?: string) => void
  onRollExtraDice?: () => void
}

function getRandomD20(): number {
  return rollDie(20)
}

function generateAttackResults(
  weapon: Weapon,
  effective: EffectiveWeaponCalculated,
  twfActive: boolean,
  offhandPenalty: number,
  hasteActive: boolean = false,
  options?: {
    kiExtraAttackActive?: boolean
    secondaryAttack?: {
      name: string
      bonus: number
      damageDice: string
      damageBonus: number
      critRange?: number
      critMultiplier?: number
    }
  },
  locale: Locale = 'en'
): AttackResult[] {
  const isIt = locale === 'it'
  const attacks: {
    label: string
    bonus: number
    critRange?: number
    critMultiplier?: number
    isHaste?: boolean
    isOffhand?: boolean
    isSecondary?: boolean
    damageOverride?: { dice: string; bonus: number }
  }[] = effective.attackBonus.map((bonus, i) => ({
    label: `${i + 1}° ${isIt ? 'Attacco' : 'Attack'}`,
    bonus,
  }))

  if (hasteActive) {
    attacks.splice(1, 0, {
      label: isIt ? 'Attacco Velocità' : 'Haste Attack',
      bonus: effective.attackBonus[0] ?? 0,
      isHaste: true,
    })
  }

  if (options?.kiExtraAttackActive) {
    attacks.push({
      label: 'Ki Flurry Attack',
      bonus: effective.attackBonus[0] ?? 0,
    })
  }

  if (twfActive && weapon.type === 'melee') {
    attacks.push({
      label: isIt ? 'Attacco Mano Secondaria' : 'Off-hand Attack',
      bonus: (effective.attackBonus[0] ?? 0) + offhandPenalty,
      isOffhand: true,
    })
  }

  if (options?.secondaryAttack) {
    attacks.push({
      label: options.secondaryAttack.name,
      bonus: options.secondaryAttack.bonus,
      critRange: options.secondaryAttack.critRange,
      critMultiplier: options.secondaryAttack.critMultiplier,
      isSecondary: true,
      damageOverride: {
        dice: options.secondaryAttack.damageDice,
        bonus: options.secondaryAttack.damageBonus,
      },
    })
  }

  return attacks.map((atk, index) => {
    const nat = getRandomD20()
    const total = nat + atk.bonus
    const isNat1 = nat === 1
    const isNat20 = nat === 20
    const critRange = atk.critRange ?? weapon.critRange
    const isCrit = !isNat1 && nat >= critRange
    return {
      index,
      label: atk.label,
      bonus: atk.bonus,
      naturalRoll: nat,
      total,
      isCritThreat: isCrit,
      isNat1,
      isNat20,
      isHaste: atk.isHaste,
      isOffhand: atk.isOffhand,
      isSecondary: atk.isSecondary,
      damageOverride: atk.damageOverride,
    }
  })
}

export function FullAttackModal({
  isOpen,
  onClose,
  weapon,
  effective,
  twfActive,
  offhandPenalty,
  hasteActive,
  kiExtraAttackActive,
  onToggleKiExtraAttack,
  kiRemaining,
  kiMax,
  secondaryAttack,
  critConfirmBonus = 0,
  sneakAttackDice,
  extraDiceLabel,
  animated,
  rollDuration = 550,
  onRollDamage,
  onRollExtraDice,
}: FullAttackModalProps) {
  const { locale, t } = useTranslation()
  const isIt = locale === 'it'

  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test'
  const isAnimated = animated ?? !isTestEnv

  const isHaste =
    hasteActive ?? effective.hasteActive ?? effective.activeBuffNames?.some((b) => /haste/i.test(b)) ?? false

  const [results, setResults] = useState<AttackResult[]>(() =>
generateAttackResults(weapon, effective, twfActive, offhandPenalty, isHaste, {
      kiExtraAttackActive,
      secondaryAttack,
    }, locale)
  )

  const [revealedCount, setRevealedCount] = useState<number>(() => (isAnimated ? 0 : 999))
  const [isPaused, setIsPaused] = useState(false)
  const [tickerNumber, setTickerNumber] = useState<number>(10)
  const [confirmingIndex, setConfirmingIndex] = useState<number | null>(null)

  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [prevOpen, setPrevOpen] = useState(isOpen)
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen)
    if (isOpen) {
setResults(
        generateAttackResults(weapon, effective, twfActive, offhandPenalty, isHaste, {
          kiExtraAttackActive,
          secondaryAttack,
        }, locale)
      )
      setRevealedCount(isAnimated ? 0 : 999)
      setIsPaused(false)
      setConfirmingIndex(null)
    }
  }

  const [prevKi, setPrevKi] = useState(kiExtraAttackActive)
  if (kiExtraAttackActive !== prevKi) {
    setPrevKi(kiExtraAttackActive)
    if (isOpen) {
      setResults(
        generateAttackResults(weapon, effective, twfActive, offhandPenalty, isHaste, {
          kiExtraAttackActive,
          secondaryAttack,
        })
      )
      setRevealedCount(isAnimated ? 0 : 999)
      setIsPaused(false)
      setConfirmingIndex(null)
    }
  }

  const rollSequence = useCallback(() => {
setResults(
      generateAttackResults(weapon, effective, twfActive, offhandPenalty, isHaste, {
        kiExtraAttackActive,
        secondaryAttack,
      }, locale)
    )
    setRevealedCount(isAnimated ? 0 : 999)
    setIsPaused(false)
    setConfirmingIndex(null)
  }, [weapon, effective, twfActive, offhandPenalty, isHaste, isAnimated, kiExtraAttackActive, secondaryAttack, locale, setResults, setRevealedCount, setIsPaused, setConfirmingIndex])

  const handleSkipAnimation = useCallback(() => {
    setRevealedCount(results.length)
    setIsPaused(false)
  }, [results.length, setRevealedCount, setIsPaused])

  const handleStepNext = useCallback(() => {
    setRevealedCount((prev) => Math.min(prev + 1, results.length))
  }, [results.length, setRevealedCount])

  // Sequential roll timer & rapid cycling ticker
  useEffect(() => {
    if (!isOpen || !isAnimated || revealedCount >= results.length || isPaused) return

    const tickerInterval = setInterval(() => {
      setTickerNumber(Math.floor(Math.random() * 20) + 1)
    }, 45)

    const timer = setTimeout(() => {
      setRevealedCount((prev) => prev + 1)
    }, rollDuration)

    return () => {
      clearInterval(tickerInterval)
      clearTimeout(timer)
    }
  }, [isOpen, isAnimated, revealedCount, results.length, isPaused, rollDuration])


  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
    }
  }, [])

function handleConfirmCrit(index: number) {
    const atk = results[index]
    if (!atk) return

    const confBonus = atk.bonus + (critConfirmBonus ?? 0)

    if (!isAnimated) {
      const confNat = getRandomD20()
      const confTotal = confNat + confBonus
      setResults((prev) =>
        prev.map((r, i) =>
          i === index
            ? {
                ...r,
                critConfirmation: {
                  naturalRoll: confNat,
                  total: confTotal,
                  critConfirmBonus: critConfirmBonus ?? 0,
                },
              }
            : r
        )
      )
      return
    }

    setConfirmingIndex(index)
    confirmTimeoutRef.current = setTimeout(() => {
      const confNat = getRandomD20()
      const confTotal = confNat + confBonus
      setResults((prev) =>
        prev.map((r, i) =>
          i === index
            ? {
                ...r,
                critConfirmation: {
                  naturalRoll: confNat,
                  total: confTotal,
                  critConfirmBonus: critConfirmBonus ?? 0,
                },
              }
            : r
        )
      )
      setConfirmingIndex(null)
    }, 450)
  }

  const { bonus: diceBonus } = parseDiceFormula(weapon.damageDice)
  const totalDmgMod = effective.damageBonus + diceBonus
  const isRollingSequence = isAnimated && revealedCount < results.length
  const currentRollingAttack = isRollingSequence ? results[revealedCount] : null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 22 }}
            className="relative w-full max-w-2xl bg-surface-container/95 backdrop-blur-xl border border-white/10 shadow-[0_0_60px_rgba(0,240,255,0.15)] rounded-3xl overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 text-[10px] font-label uppercase tracking-widest font-bold">
                    {t('combat.fullAttackSequence')}
                  </span>
                  {isHaste && (
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40 text-[10px] font-label font-bold uppercase tracking-wider shadow-[0_0_8px_rgba(0,240,255,0.25)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">bolt</span>
                      {isIt ? 'Velocità Attiva' : 'Haste Active'}
                    </span>
                  )}
                  {kiExtraAttackActive && (
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary/20 text-secondary border border-secondary/40 text-[10px] font-label font-bold uppercase tracking-wider shadow-[0_0_8px_rgba(217,70,239,0.25)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">sports_martial_arts</span>
                      Ki Flurry Active
                    </span>
                  )}
                  {onToggleKiExtraAttack && (
                    <button
                      type="button"
                      onClick={onToggleKiExtraAttack}
                      disabled={!kiExtraAttackActive && (kiRemaining !== undefined && kiRemaining <= 0)}
                      title={
                        kiExtraAttackActive
                          ? 'Ki Flurry attivo (1 Ki speso). Clicca per disattivare.'
                          : kiRemaining !== undefined && kiRemaining <= 0
                          ? 'Punti Ki esauriti'
                          : 'Spendi 1 Ki per un attacco extra nella raffica'
                      }
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-label font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                        kiExtraAttackActive
                          ? 'bg-secondary text-black shadow-[0_0_10px_rgba(217,70,239,0.4)]'
                          : 'bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary/25 disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[12px]">sports_martial_arts</span>
                      <span>
                        {kiExtraAttackActive
                          ? 'Ki Flurry (ON)'
                          : `+1 Ki Flurry${kiRemaining !== undefined && kiMax !== undefined ? ` (${kiRemaining}/${kiMax})` : ''}`}
                      </span>
                    </button>
                  )}
                  <span className="font-label text-xs text-tertiary">
                    Crit: {weapon.critRange < 20 ? `${weapon.critRange}-20` : '20'}/x{weapon.critMultiplier}
                  </span>
                </div>
                <h2 className="font-headline text-xl sm:text-2xl font-bold text-white mt-1 truncate">
                  {weapon.name}
                </h2>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {isRollingSequence && (
                  <button
                    onClick={handleSkipAnimation}
                    className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-white/10 border border-white/20 text-white font-label text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    aria-label={isIt ? 'Salta animazione dadi' : 'Skip dice animation'}
                  >
                    <span className="material-symbols-outlined text-sm">fast_forward</span>
                    <span className="hidden xs:inline">{isIt ? 'Salta' : 'Skip'}</span>
                  </button>
                )}
                <button
                  onClick={rollSequence}
                  className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-primary/20 border border-primary/40 text-primary font-label text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(0,240,255,0.15)]"
                  aria-label={isIt ? 'Ritira sequenza di attacco' : 'Re-roll attack sequence'}
                >
                  <span className="material-symbols-outlined text-sm">casino</span>
                  <span className="hidden xs:inline">{isIt ? 'Ritira' : 'Re-roll'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-tertiary hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                  aria-label={isIt ? 'Chiudi modale' : 'Close modal'}
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>
            </div>

            {/* Rolling Dice Showcase Arena */}
            {isAnimated && (
              <div className="px-4 sm:px-6 pt-4 pb-0">
                <div className="p-3.5 sm:p-4 rounded-2xl border bg-surface-container-high/60 backdrop-blur-md border-white/10 shadow-[0_0_20px_rgba(0,240,255,0.08)]">
                  {isRollingSequence && currentRollingAttack ? (
                    <div className="flex items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        {/* Spinning 3D / Cyber d20 */}
                        <motion.div
                          animate={{ rotate: 360, scale: [1, 1.15, 0.95, 1.08, 1] }}
                          transition={{
                            rotate: { duration: 0.6, repeat: Infinity, ease: 'linear' },
                            scale: { duration: 0.45, repeat: Infinity },
                          }}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/20 border border-primary/50 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.4)] flex-shrink-0"
                        >
                          <span className="material-symbols-outlined text-3xl sm:text-4xl text-primary drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]">
                            casino
                          </span>
                        </motion.div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40 font-label text-[10px] font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                              {isIt
                                ? `Tiro Attacco ${revealedCount + 1} di ${results.length}`
                                : `Rolling Attack ${revealedCount + 1} of ${results.length}`}
                            </span>
                          </div>
                          <h3 className="font-headline text-base sm:text-lg font-bold text-white mt-1 truncate">
                            {currentRollingAttack.label} ({currentRollingAttack.bonus >= 0 ? `+${currentRollingAttack.bonus}` : currentRollingAttack.bonus})
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-label text-xs text-primary/80">
                              {isIt ? 'Tiro d20:' : 'Rolling d20:'}
                            </span>
                            <span className="font-label text-xs font-black tabular-nums text-white bg-black/60 px-2 py-0.5 rounded-md border border-primary/40 shadow-[0_0_8px_rgba(0,240,255,0.3)]">
                              {tickerNumber}
                            </span>
                            <span className="font-label text-[11px] text-tertiary">
                              = {tickerNumber + currentRollingAttack.bonus}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsPaused((p) => !p)}
                          className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-surface-container hover:bg-white/10 border border-white/10 text-white font-label text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title={isPaused ? (isIt ? 'Riprendi tiro automatico' : 'Resume auto-roll') : (isIt ? 'Pausa sequenza' : 'Pause sequence')}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {isPaused ? 'play_arrow' : 'pause'}
                          </span>
                          <span className="hidden sm:inline">
                            {isPaused ? (isIt ? 'Riprendi' : 'Resume') : (isIt ? 'Pausa' : 'Pause')}
                          </span>
                        </button>
                        {isPaused && (
                          <button
                            type="button"
                            onClick={handleStepNext}
                            className="px-3 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-label text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                          >
                            <span className="material-symbols-outlined text-sm">skip_next</span>
                            <span className="hidden sm:inline">{isIt ? 'Avanti' : 'Next'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 text-xs font-label">
                      <div className="flex items-center gap-2 text-primary">
                        <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
                        <span className="font-bold">
                          {isIt
                            ? `Routine completata: ${results.length} attacchi eseguiti`
                            : `Routine Complete: ${results.length} attacks resolved`}
                        </span>
                      </div>
                      <span className="text-tertiary">
                        {isIt ? 'Clicca sotto per tirare i danni o confermare i critici' : 'Click below to roll damage or confirm threats'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Attacks List */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
              {results.map((r) => {
                const isRolling = isAnimated && revealedCount === r.index
                const isQueued = isAnimated && revealedCount < r.index
                const isConfirming = confirmingIndex === r.index
                const isCritConfirmed =
                  r.critConfirmation && r.critConfirmation.naturalRoll !== 1

                if (isRolling) {
                  return (
                    <motion.div
                      key={r.index}
                      initial={{ scale: 0.98, opacity: 0.8 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-3.5 sm:p-4 rounded-2xl border border-primary/50 bg-primary/5 shadow-[0_0_20px_rgba(0,240,255,0.2)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <motion.div
                          animate={{ rotate: [0, 15, -15, 0] }}
                          transition={{ repeat: Infinity, duration: 0.3 }}
                          className="w-12 h-12 rounded-xl flex items-center justify-center border border-primary/60 bg-primary/20 text-primary shadow-[0_0_12px_rgba(0,240,255,0.4)] flex-shrink-0"
                        >
                          <span className="font-label text-xl font-black tabular-nums">
                            {tickerNumber}
                          </span>
                        </motion.div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-headline text-base font-bold text-white truncate">
                              {r.label}
                            </h4>
                            {r.label === 'Ki Flurry Attack' && (
                              <span className="px-2 py-0.5 rounded-full bg-secondary/20 text-secondary border border-secondary/40 text-[10px] font-label font-bold uppercase tracking-wider flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px]">sports_martial_arts</span>
                                Ki Flurry
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40 text-[10px] font-label font-bold uppercase tracking-wider animate-pulse">
                              {isIt ? 'In corso...' : 'Rolling...'}
                            </span>
                          </div>
                          <p className="font-label text-xs text-primary/80 mt-0.5">
                            d20 ({tickerNumber}) {r.bonus >= 0 ? `+ ${r.bonus}` : `- ${Math.abs(r.bonus)}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                        <div className="text-left sm:text-right min-w-[54px] sm:min-w-[60px]">
                          <p className="font-label text-[10px] text-primary/70 uppercase tracking-widest">
                            {isIt ? 'Tiro' : 'Rolling'}
                          </p>
                          <p className="font-label text-2xl sm:text-3xl font-black text-primary/70 animate-pulse tabular-nums">
                            {tickerNumber + r.bonus}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )
                }

                if (isQueued) {
                  return (
                    <div
                      key={r.index}
                      className="p-3.5 sm:p-4 rounded-2xl border border-white/5 bg-surface-container-high/40 opacity-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/5 bg-surface-container-lowest text-tertiary flex-shrink-0">
                          <span className="material-symbols-outlined text-xl opacity-40">casino</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-headline text-base font-bold text-white/70 truncate">
                            {r.label}
                          </h4>
                          <p className="font-label text-xs text-tertiary mt-0.5">
                            {isIt ? 'In coda' : 'Queued'} ({r.bonus >= 0 ? `+${r.bonus}` : r.bonus})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                        <div className="text-left sm:text-right min-w-[54px] sm:min-w-[60px]">
                          <p className="font-label text-[10px] text-tertiary/60 uppercase tracking-widest">
                            {isIt ? 'Totale' : 'Total'}
                          </p>
                          <p className="font-label text-2xl sm:text-3xl font-black text-tertiary/40">
                            —
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                }

                // Revealed card
                return (
                  <motion.div
                    key={r.index}
                    initial={isAnimated ? { scale: 0.95, opacity: 0 } : false}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${
                      r.isCritThreat
                        ? 'bg-gradient-to-r from-secondary/15 via-secondary/10 to-surface-container-high/90 border-secondary/60 shadow-[0_0_25px_rgba(217,70,239,0.25)]'
                        : r.isNat1
                        ? 'bg-error/10 border-error/40'
                        : 'bg-surface-container-high/80 border-white/10'
                    }`}
                  >
                    {/* Attack info */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0 transition-all ${
                          r.isCritThreat
                            ? 'bg-secondary/20 border-secondary/60 shadow-[0_0_15px_rgba(217,70,239,0.35)]'
                            : r.isNat1
                            ? 'bg-error/20 border-error/50 shadow-[0_0_15px_rgba(255,75,96,0.3)]'
                            : 'bg-surface-container-lowest border-white/5'
                        }`}
                      >
                        <span
                          className={`font-label text-xl font-black ${
                            r.isCritThreat
                              ? 'text-secondary drop-shadow-[0_0_8px_rgba(217,70,239,0.6)]'
                              : r.isNat1
                              ? 'text-error'
                              : 'text-primary'
                          }`}
                        >
                          {r.naturalRoll}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <h4 className="font-headline text-base font-bold text-white truncate">
                            {r.label}
                          </h4>
                          {r.label === 'Ki Flurry Attack' && (
                            <span className="px-2 py-0.5 rounded-full bg-secondary/20 text-secondary border border-secondary/40 text-[10px] font-label font-bold uppercase tracking-wider flex items-center gap-1">
                              <span className="material-symbols-outlined text-[11px]">sports_martial_arts</span>
                              Ki Flurry
                            </span>
                          )}
                          {r.isCritThreat && (
                            <span className="px-2 py-0.5 rounded-full bg-secondary text-black font-label text-[10px] font-black uppercase tracking-wider shadow-[0_0_10px_#d946ef] animate-pulse">
                              {isIt ? 'Minaccia Critico!' : 'Crit Threat!'}
                            </span>
                          )}
                          {r.isNat1 && (
                            <span className="px-2 py-0.5 rounded-full bg-error/20 text-error border border-error/40 font-label text-[10px] font-bold uppercase tracking-wider">
                              {isIt ? 'Fallimento Critico' : 'Fumble'}
                            </span>
                          )}
                          {r.isNat20 && (
                            <span className="px-2 py-0.5 rounded-full bg-primary text-black font-label text-[10px] font-black uppercase tracking-wider shadow-[0_0_8px_#00f0ff]">
                              {isIt ? '20 Naturale' : 'Nat 20'}
                            </span>
                          )}
                          {r.isHaste && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40 font-label text-[10px] font-bold uppercase tracking-wider">
                              {isIt ? 'Bonus Velocità' : 'Haste Bonus'}
                            </span>
                          )}
                          {r.isOffhand && (
                            <span className="px-2 py-0.5 rounded-full bg-secondary/20 text-secondary border border-secondary/40 font-label text-[10px] font-bold uppercase tracking-wider">
                              {isIt ? 'Mano Secondaria' : 'Off-hand'}
                            </span>
                          )}
                        </div>
                        <p className="font-label text-xs text-tertiary mt-0.5">
                          d20 ({r.naturalRoll}) {r.bonus >= 0 ? `+ ${r.bonus}` : `- ${Math.abs(r.bonus)}`}
                        </p>

                        {/* Confirmation roll details */}
                        {isConfirming && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/20 border border-secondary/40 text-secondary font-label text-xs font-bold animate-pulse">
                              <span className="material-symbols-outlined text-sm animate-spin">
                                progress_activity
                              </span>
                              <span>{isIt ? 'Tiro dado di conferma...' : 'Rolling confirmation dice...'}</span>
                            </span>
                          </div>
                        )}
                        {!isConfirming && r.critConfirmation && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            {r.critConfirmation.naturalRoll === 1 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-error/20 border border-error/50 text-error font-label text-xs font-bold shadow-[0_0_12px_rgba(255,75,96,0.3)]">
                                <span className="material-symbols-outlined text-sm">cancel</span>
                                <span>{isIt ? 'Nat 1 — Non Confermato' : 'Nat 1 — Not Confirmed'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/20 border border-secondary/50 text-secondary font-label text-xs font-bold shadow-[0_0_12px_rgba(217,70,239,0.3)]">
                                <span className="material-symbols-outlined text-sm">verified</span>
                                <span>{isIt ? 'Tiro di Conferma:' : 'Confirm Roll:'} {r.critConfirmation.total}</span>
                              </span>
                            )}
                            <span className="text-xs font-label text-tertiary">
                              (d20: {r.critConfirmation.naturalRoll} {r.bonus >= 0 ? `+ ${r.bonus}` : `- ${Math.abs(r.bonus)}`}
                              {r.critConfirmation.critConfirmBonus ? ` + ${r.critConfirmation.critConfirmBonus} Favored Class` : ''})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total & Action buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                      <div className="text-left sm:text-right min-w-[54px] sm:min-w-[60px]">
                        <p className="font-label text-[10px] text-tertiary uppercase tracking-widest">
                          {isIt ? 'Totale' : 'Total'}
                        </p>
                        <p
                          className={`font-label text-2xl sm:text-3xl font-black ${
                            r.isCritThreat
                              ? 'text-secondary drop-shadow-[0_0_10px_rgba(217,70,239,0.5)]'
                              : 'text-white'
                          }`}
                        >
                          {r.total}
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5 flex-1 sm:flex-none">
                        {r.isCritThreat && !r.critConfirmation && !isConfirming && (
                          <button
                            onClick={() => handleConfirmCrit(r.index)}
                            className="w-full sm:w-auto px-3.5 py-1.5 bg-gradient-to-r from-secondary to-fuchsia-600 hover:from-secondary hover:to-pink-500 text-black font-label text-[11px] font-black uppercase tracking-wider rounded-lg shadow-[0_0_14px_rgba(217,70,239,0.5)] hover:shadow-[0_0_20px_rgba(217,70,239,0.8)] transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-xs font-bold">verified</span>
                            <span>{isIt ? 'Conferma Critico' : 'Confirm Crit'}</span>
                          </button>
                        )}
                        {isCritConfirmed ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
onClick={() => {
                                const dmgSuffix = isIt ? 'Danno' : 'Dmg'
                                const label = `${r.isSecondary ? r.label : weapon.name} (${r.label}) ${dmgSuffix}`
                                const bonus = r.damageOverride ? r.damageOverride.bonus : totalDmgMod
                                if (r.damageOverride?.dice) {
                                  onRollDamage(label, bonus, true, r.damageOverride.dice)
                                } else {
                                  onRollDamage(label, bonus, true)
                                }
                              }}
                              className="w-full sm:w-auto px-3 py-1.5 font-label text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 bg-secondary/25 hover:bg-secondary/35 border border-secondary text-secondary shadow-[0_0_12px_rgba(217,70,239,0.3)] hover:shadow-[0_0_18px_rgba(217,70,239,0.5)]"
                            >
                              <span className="material-symbols-outlined text-xs">swords</span>
                              <span>{isIt ? `Tira Danno Critico (x${weapon.critMultiplier})` : `Roll Crit Dmg (x${weapon.critMultiplier})`}</span>
                            </button>
                            <button
onClick={() => {
                                const dmgSuffix = isIt ? 'Danno' : 'Dmg'
                                const label = `${r.isSecondary ? r.label : weapon.name} (${r.label}) ${dmgSuffix}`
                                const bonus = r.damageOverride ? r.damageOverride.bonus : totalDmgMod
                                if (r.damageOverride?.dice) {
                                  onRollDamage(label, bonus, false, r.damageOverride.dice)
                                } else {
                                  onRollDamage(label, bonus, false)
                                }
                              }}
                              className="w-full sm:w-auto px-3 py-1.5 font-label text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 bg-surface-container-high hover:bg-surface-container-highest border border-white/10 hover:border-primary/40 text-primary"
                            >
                              <span className="material-symbols-outlined text-xs">swords</span>
                              <span>{isIt ? 'Tira Danno Normale' : 'Roll Normal Dmg'}</span>
                            </button>
                          </div>
                        ) : (
                          <button
onClick={() => {
                              const dmgSuffix = isIt ? 'Danno' : 'Dmg'
                              const label = `${r.isSecondary ? r.label : weapon.name} (${r.label}) ${dmgSuffix}`
                              const bonus = r.damageOverride ? r.damageOverride.bonus : totalDmgMod
                              if (r.damageOverride?.dice) {
                                onRollDamage(label, bonus, false, r.damageOverride.dice)
                              } else {
                                onRollDamage(label, bonus, false)
                              }
                            }}
                            className="w-full sm:w-auto px-3.5 py-1.5 font-label text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary hover:shadow-[0_0_12px_rgba(0,240,255,0.25)]"
                          >
                            <span className="material-symbols-outlined text-xs">swords</span>
                            <span>{isIt ? 'Tira Danno' : 'Roll Dmg'} ({r.damageOverride ? r.damageOverride.dice : weapon.damageDice}{(r.damageOverride ? r.damageOverride.bonus : totalDmgMod) >= 0 ? `+${r.damageOverride ? r.damageOverride.bonus : totalDmgMod}` : (r.damageOverride ? r.damageOverride.bonus : totalDmgMod)})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-surface-container-low border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {sneakAttackDice && onRollExtraDice && (
                  <button
                    onClick={onRollExtraDice}
                    className="px-3.5 py-1.5 rounded-xl bg-surface-container-high border border-secondary/40 text-secondary hover:bg-secondary/20 font-label text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">casino</span>
                    <span>{isIt ? `Tira ${extraDiceLabel ?? 'Extra'} (${sneakAttackDice})` : `Roll ${extraDiceLabel ?? 'Extra'} (${sneakAttackDice})`}</span>
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-label text-xs uppercase tracking-wider transition-all cursor-pointer ml-auto"
              >
                {isIt ? 'Chiudi Routine' : 'Close Routine'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
