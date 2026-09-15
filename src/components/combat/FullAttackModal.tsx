import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Weapon } from '../../types/combat'
import type { EffectiveWeaponCalculated } from '../../lib/stat-calc'
import { parseDiceFormula } from '../../lib/dice-engine'

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
  critConfirmation?: {
    naturalRoll: number
    total: number
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
  sneakAttackDice?: string
  extraDiceLabel?: string
  onRollDamage: (label: string, bonus: number, isCritical?: boolean) => void
  onRollExtraDice?: () => void
}

function getRandomD20(): number {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return (arr[0] % 20) + 1
}

function generateAttackResults(
  weapon: Weapon,
  effective: EffectiveWeaponCalculated,
  twfActive: boolean,
  offhandPenalty: number,
  hasteActive: boolean = false
): AttackResult[] {
  const attacks: { label: string; bonus: number; isHaste?: boolean; isOffhand?: boolean }[] =
    effective.attackBonus.map((bonus, i) => ({
      label: `${i + 1}° Attack`,
      bonus,
    }))

  if (hasteActive) {
    attacks.splice(1, 0, {
      label: 'Haste Attack',
      bonus: effective.attackBonus[0] ?? 0,
      isHaste: true,
    })
  }

  if (twfActive && weapon.type === 'melee') {
    attacks.push({
      label: 'Off-hand Attack',
      bonus: (effective.attackBonus[0] ?? 0) + offhandPenalty,
      isOffhand: true,
    })
  }

  return attacks.map((atk, index) => {
    const nat = getRandomD20()
    const total = nat + atk.bonus
    const isNat1 = nat === 1
    const isNat20 = nat === 20
    const isCrit = !isNat1 && nat >= weapon.critRange
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
  sneakAttackDice,
  extraDiceLabel,
  onRollDamage,
  onRollExtraDice,
}: FullAttackModalProps) {
  const isHaste =
    hasteActive ?? effective.hasteActive ?? effective.activeBuffNames?.some((b) => /haste/i.test(b)) ?? false

  const [results, setResults] = useState<AttackResult[]>(() =>
    generateAttackResults(weapon, effective, twfActive, offhandPenalty, isHaste)
  )

  const [prevOpen, setPrevOpen] = useState(isOpen)
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen)
    if (isOpen) {
      setResults(generateAttackResults(weapon, effective, twfActive, offhandPenalty, isHaste))
    }
  }

  const rollSequence = useCallback(() => {
    setResults(generateAttackResults(weapon, effective, twfActive, offhandPenalty, isHaste))
  }, [weapon, effective, twfActive, offhandPenalty, isHaste])

  function handleConfirmCrit(index: number) {
    const atk = results[index]
    if (!atk) return
    const confNat = getRandomD20()
    const confTotal = confNat + atk.bonus

    setResults((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
              ...r,
              critConfirmation: {
                naturalRoll: confNat,
                total: confTotal,
              },
            }
          : r
      )
    )
  }

  const { bonus: diceBonus } = parseDiceFormula(weapon.damageDice)
  const totalDmgMod = effective.damageBonus + diceBonus

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
          style={{ backdropFilter: 'blur(16px)', background: 'rgba(10,10,18,0.85)' }}
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
                    Full Attack Sequence
                  </span>
                  {isHaste && (
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40 text-[10px] font-label font-bold uppercase tracking-wider shadow-[0_0_8px_rgba(0,240,255,0.25)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">bolt</span>
                      Haste Active
                    </span>
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
                <button
                  onClick={rollSequence}
                  className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-primary/20 border border-primary/40 text-primary font-label text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(0,240,255,0.15)]"
                  aria-label="Re-roll attack sequence"
                >
                  <span className="material-symbols-outlined text-sm">casino</span>
                  <span className="hidden xs:inline">Re-roll</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-tertiary hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>
            </div>

            {/* Attack Cards List */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
              {results.map((r) => {
                const isCritConfirmed = r.isCritThreat && !!r.critConfirmation
                return (
                  <div
                    key={r.index}
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
                          {r.isCritThreat && (
                            <span className="px-2 py-0.5 rounded-full bg-secondary text-black font-label text-[10px] font-black uppercase tracking-wider shadow-[0_0_10px_#d946ef] animate-pulse">
                              Crit Threat!
                            </span>
                          )}
                          {r.isNat1 && (
                            <span className="px-2 py-0.5 rounded-full bg-error/20 text-error border border-error/40 font-label text-[10px] font-bold uppercase tracking-wider">
                              Fumble
                            </span>
                          )}
                          {r.isNat20 && (
                            <span className="px-2 py-0.5 rounded-full bg-primary text-black font-label text-[10px] font-black uppercase tracking-wider shadow-[0_0_8px_#00f0ff]">
                              Nat 20
                            </span>
                          )}
                          {r.isHaste && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40 font-label text-[10px] font-bold uppercase tracking-wider">
                              Haste Bonus
                            </span>
                          )}
                          {r.isOffhand && (
                            <span className="px-2 py-0.5 rounded-full bg-secondary/20 text-secondary border border-secondary/40 font-label text-[10px] font-bold uppercase tracking-wider">
                              Off-hand
                            </span>
                          )}
                        </div>
                        <p className="font-label text-xs text-tertiary mt-0.5">
                          d20 ({r.naturalRoll}) {r.bonus >= 0 ? `+ ${r.bonus}` : `- ${Math.abs(r.bonus)}`}
                        </p>

                        {/* Confirmation badge in Cyber Glass style */}
                        {r.critConfirmation && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/20 border border-secondary/50 text-secondary font-label text-xs font-bold shadow-[0_0_12px_rgba(217,70,239,0.3)]">
                              <span className="material-symbols-outlined text-sm">verified</span>
                              <span>Confirm Roll: {r.critConfirmation.total}</span>
                            </span>
                            <span className="text-xs font-label text-tertiary">
                              (d20: {r.critConfirmation.naturalRoll} {r.bonus >= 0 ? `+ ${r.bonus}` : `- ${Math.abs(r.bonus)}`})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total & Action buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                      <div className="text-left sm:text-right min-w-[54px] sm:min-w-[60px]">
                        <p className="font-label text-[10px] text-tertiary uppercase tracking-widest">
                          Total
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
                        {r.isCritThreat && !r.critConfirmation && (
                          <button
                            onClick={() => handleConfirmCrit(r.index)}
                            className="w-full sm:w-auto px-3.5 py-1.5 bg-gradient-to-r from-secondary to-fuchsia-600 hover:from-secondary hover:to-pink-500 text-black font-label text-[11px] font-black uppercase tracking-wider rounded-lg shadow-[0_0_14px_rgba(217,70,239,0.5)] hover:shadow-[0_0_20px_rgba(217,70,239,0.8)] transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-xs font-bold">verified</span>
                            <span>Confirm Crit</span>
                          </button>
                        )}
                        <button
                          onClick={() =>
                            onRollDamage(
                              `${weapon.name} (${r.label}) Dmg`,
                              totalDmgMod,
                              isCritConfirmed
                            )
                          }
                          className={`w-full sm:w-auto px-3.5 py-1.5 font-label text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                            isCritConfirmed
                              ? 'bg-secondary/25 hover:bg-secondary/35 border border-secondary text-secondary shadow-[0_0_12px_rgba(217,70,239,0.3)] hover:shadow-[0_0_18px_rgba(217,70,239,0.5)]'
                              : 'bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary hover:shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs">swords</span>
                          {isCritConfirmed ? (
                            <span>Roll Crit Dmg (x{weapon.critMultiplier})</span>
                          ) : (
                            <span>Roll Dmg ({weapon.damageDice}{totalDmgMod >= 0 ? `+${totalDmgMod}` : totalDmgMod})</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
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
                    <span>Roll {extraDiceLabel ?? 'Extra'} ({sneakAttackDice})</span>
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-label text-xs uppercase tracking-wider transition-all cursor-pointer ml-auto"
              >
                Close Routine
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
