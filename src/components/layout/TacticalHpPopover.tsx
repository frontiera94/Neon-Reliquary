import { useState, useRef, useEffect } from 'react'
import { useSessionStore } from '../../store/useSessionStore'

export interface TacticalHpPopoverProps {
  isOpen: boolean
  onClose: () => void
  characterId: string
  currentHp: number
  maxHp: number
  tempHp: number
  nonlethalDamage: number
  conScore: number
}

function applyDamage(characterId: string, damage: number, conScore: number) {
  useSessionStore.getState().applyDamage(characterId, damage, conScore)
}

function applyHealing(characterId: string, healing: number, maxHp: number) {
  useSessionStore.getState().applyHealing(characterId, healing, maxHp)
}

export function TacticalHpPopover({
  isOpen,
  onClose,
  characterId,
  currentHp,
  maxHp,
  tempHp,
  nonlethalDamage,
  conScore,
}: TacticalHpPopoverProps) {
  const [customAmount, setCustomAmount] = useState<string>('5')
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const parsedAmount = Math.max(1, parseInt(customAmount, 10) || 1)

  const handleCustomDamage = () => {
    applyDamage(characterId, parsedAmount, conScore)
  }

  const handleCustomHeal = () => {
    applyHealing(characterId, parsedAmount, maxHp)
  }

  const handleAddTemp = (amount: number) => {
    const sess = useSessionStore.getState().getSession(characterId)
    useSessionStore.getState().setTempHp(characterId, sess.tempHp + amount)
  }

  const handleClearTemp = () => {
    useSessionStore.getState().setTempHp(characterId, 0)
  }

  const handleAddNonlethal = (amount: number) => {
    const sess = useSessionStore.getState().getSession(characterId)
    useSessionStore.getState().setNonlethal(characterId, sess.nonlethalDamage + amount)
  }

  const handleClearNonlethal = () => {
    useSessionStore.getState().setNonlethal(characterId, 0)
  }

  // Vital condition check
  const isDead = currentHp <= -conScore
  const isDying = !isDead && currentHp < 0
  const isDisabled = currentHp === 0
  const isUnconscious = currentHp > 0 && nonlethalDamage > currentHp
  const isStaggered = currentHp > 0 && nonlethalDamage === currentHp

  return (
    <div
      ref={popoverRef}
      data-testid="hp-popover"
      className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50 w-80 sm:w-96 p-4 rounded-2xl backdrop-blur-xl bg-surface-container/95 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.85)] shadow-primary/10 animate-in fade-in zoom-in-95"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-sm">favorite</span>
          <h3 className="font-headline text-xs font-bold uppercase tracking-wider text-white">
            Tactical HP Adjust
          </h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Close HP popover"
          className="text-tertiary hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Vitals Summary Pill Row */}
      <div className="flex items-center justify-between py-2.5 px-3 my-3 rounded-xl bg-surface-container-lowest/70 border border-white/5">
        <div className="flex flex-col">
          <span className="font-label text-[10px] text-tertiary uppercase tracking-wider">Current HP</span>
          <span className="font-label text-base font-bold text-white">
            <span className={currentHp <= 0 ? 'text-error' : currentHp < maxHp / 2 ? 'text-amber-400' : 'text-primary'}>
              {currentHp}
            </span>
            <span className="text-tertiary text-xs"> / {maxHp}</span>
          </span>
        </div>
        {tempHp > 0 && (
          <div className="flex flex-col items-center">
            <span className="font-label text-[10px] text-cyan-300 uppercase tracking-wider">Temp</span>
            <span className="font-label text-xs font-bold text-cyan-300">+{tempHp}</span>
          </div>
        )}
        {nonlethalDamage > 0 && (
          <div className="flex flex-col items-center">
            <span className="font-label text-[10px] text-[#ffb4ab] uppercase tracking-wider">Nonlethal</span>
            <span className="font-label text-xs font-bold text-[#ffb4ab]">{nonlethalDamage} NL</span>
          </div>
        )}
        <div className="flex flex-col items-end">
          <span className="font-label text-[10px] text-tertiary uppercase tracking-wider">Death At</span>
          <span className="font-label text-xs font-medium text-error">-{conScore} HP</span>
        </div>
      </div>

      {/* Critical Status Banners */}
      {isDead && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-error text-white font-label text-xs font-black uppercase tracking-wider text-center animate-pulse">
          💀 Character is Dead (≤ -{conScore} HP)
        </div>
      )}
      {isDying && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-error/80 text-white font-label text-xs font-bold uppercase tracking-wider text-center animate-pulse">
          🩸 Character is Dying ({currentHp} HP)
        </div>
      )}
      {isDisabled && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-amber-500/80 text-black font-label text-xs font-bold uppercase tracking-wider text-center">
          ⚠ Character is Disabled (0 HP)
        </div>
      )}
      {isUnconscious && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-[#ffb4ab] text-black font-label text-xs font-bold uppercase tracking-wider text-center animate-pulse">
          💤 Unconscious (NL Damage {nonlethalDamage} &gt; Current HP {currentHp})
        </div>
      )}
      {isStaggered && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-amber-400 text-black font-label text-xs font-bold uppercase tracking-wider text-center">
          ⚡ Staggered (NL Damage {nonlethalDamage} = Current HP {currentHp})
        </div>
      )}

      {/* Preset Quick Buttons */}
      <div className="space-y-2 mb-3">
        {/* Damage Presets */}
        <div className="flex items-center gap-2">
          <span className="font-label text-[10px] uppercase tracking-wider text-error font-semibold w-14">
            Damage
          </span>
          <div className="flex-1 grid grid-cols-3 gap-2">
            {[1, 5, 10].map((dmg) => (
              <button
                key={dmg}
                onClick={() => applyDamage(characterId, dmg, conScore)}
                aria-label={`Damage ${dmg}`}
                className="py-1.5 px-2 rounded-xl bg-error/15 border border-error/30 text-error hover:bg-error/30 hover:border-error/60 active:scale-95 transition-all font-label text-xs font-bold cursor-pointer text-center"
              >
                -{dmg}
              </button>
            ))}
          </div>
        </div>

        {/* Healing Presets */}
        <div className="flex items-center gap-2">
          <span className="font-label text-[10px] uppercase tracking-wider text-primary font-semibold w-14">
            Heal
          </span>
          <div className="flex-1 grid grid-cols-3 gap-2">
            {[1, 5, 10].map((hl) => (
              <button
                key={hl}
                onClick={() => applyHealing(characterId, hl, maxHp)}
                aria-label={`Heal ${hl}`}
                className="py-1.5 px-2 rounded-xl bg-primary/15 border border-primary/30 text-primary hover:bg-primary/30 hover:border-primary/60 active:scale-95 transition-all font-label text-xs font-bold cursor-pointer text-center"
              >
                +{hl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Amount Form */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/10 mb-3">
        <input
          type="number"
          min="1"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCustomDamage()
          }}
          aria-label="Custom HP delta amount"
          placeholder="Amt"
          className="w-20 px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-white/10 text-white font-label text-sm text-center focus:border-primary focus:outline-none"
        />
        <button
          onClick={handleCustomDamage}
          aria-label="Damage custom amount"
          className="flex-1 py-1.5 px-3 rounded-xl bg-error/20 border border-error/40 text-error hover:bg-error/30 active:scale-95 transition-all font-label text-xs font-bold cursor-pointer"
        >
          Damage
        </button>
        <button
          onClick={handleCustomHeal}
          aria-label="Heal custom amount"
          className="flex-1 py-1.5 px-3 rounded-xl bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 active:scale-95 transition-all font-label text-xs font-bold cursor-pointer"
        >
          Heal
        </button>
      </div>

      {/* Temp HP and Nonlethal Direct Controls */}
      <div className="pt-2 border-t border-white/5 space-y-2">
        <div className="flex items-center justify-between gap-1 text-[11px] font-label">
          <span className="text-cyan-300 font-semibold w-16">Temp HP</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleAddTemp(5)}
              className="px-2 py-0.5 rounded-lg bg-surface-container-high border border-white/10 hover:border-cyan-400 text-cyan-300 transition-all cursor-pointer"
            >
              +5 Temp
            </button>
            <button
              onClick={() => handleAddTemp(10)}
              className="px-2 py-0.5 rounded-lg bg-surface-container-high border border-white/10 hover:border-cyan-400 text-cyan-300 transition-all cursor-pointer"
            >
              +10 Temp
            </button>
            <button
              onClick={handleClearTemp}
              className="px-2 py-0.5 rounded-lg bg-surface-container-high border border-white/10 hover:border-error/40 text-tertiary hover:text-error transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1 text-[11px] font-label">
          <span className="text-[#ffb4ab] font-semibold w-16">Nonlethal</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleAddNonlethal(5)}
              className="px-2 py-0.5 rounded-lg bg-surface-container-high border border-white/10 hover:border-[#ffb4ab] text-[#ffb4ab] transition-all cursor-pointer"
            >
              +5 NL
            </button>
            <button
              onClick={() => handleAddNonlethal(10)}
              className="px-2 py-0.5 rounded-lg bg-surface-container-high border border-white/10 hover:border-[#ffb4ab] text-[#ffb4ab] transition-all cursor-pointer"
            >
              +10 NL
            </button>
            <button
              onClick={handleClearNonlethal}
              className="px-2 py-0.5 rounded-lg bg-surface-container-high border border-white/10 hover:border-error/40 text-tertiary hover:text-error transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
