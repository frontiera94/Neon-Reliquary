import { parseDiceFormula } from '../../lib/dice-engine'
import type { SummonOption } from '../../types/resources'
import type { DiceRoll } from '../../types/dice'

export function SummonedCreaturePanel({
  option,
  currentHp,
  onAdjustHp,
  onDismiss,
  openRoll,
}: {
  option: SummonOption
  currentHp: number
  onAdjustHp: (delta: number) => void
  onDismiss: () => void
  openRoll: (roll: DiceRoll) => void
}) {
  const percent = Math.max(0, Math.min(100, (currentHp / option.hp) * 100))

  return (
    <div className="bg-surface-container border-l-4 border-primary p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-label text-[10px] text-primary uppercase tracking-[0.2em] mb-1">
            {option.template ? `${option.template} ·` : ''} {option.size}
          </p>
          <h3 className="font-headline text-2xl font-bold text-on-surface">{option.name}</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-surface-container-high px-4 py-2 text-center">
            <p className="font-label text-[10px] text-tertiary uppercase tracking-widest">AC</p>
            <p className="font-label text-2xl font-bold text-on-surface">{option.ac}</p>
          </div>
          <button
            onClick={onDismiss}
            className="px-3 py-2 font-label text-[10px] uppercase tracking-widest text-tertiary border border-outline-variant/30 hover:text-error hover:border-error/50 transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* HP tracker */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onAdjustHp(-1)}
          className="w-10 h-10 bg-surface-container-high hover:bg-error-container text-primary hover:text-on-error transition-all active:scale-95 flex items-center justify-center flex-shrink-0"
        >
          <span className="material-symbols-outlined text-lg">remove</span>
        </button>
        <div className="bg-surface-container-high px-4 py-2 text-center flex-shrink-0">
          <p className="font-label text-[10px] text-tertiary uppercase tracking-widest">HP</p>
          <p className="font-label text-2xl font-bold text-primary">
            {currentHp}<span className="text-tertiary text-sm font-normal"> / {option.hp}</span>
          </p>
        </div>
        <div className="flex-1 space-y-1">
          <div className="h-2 bg-surface-container-lowest overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #00daf3 0%, #93000a 100%)' }}
            />
          </div>
        </div>
        <button
          onClick={() => onAdjustHp(1)}
          className="w-10 h-10 bg-surface-container-high hover:bg-primary-container text-primary hover:text-on-primary transition-all active:scale-95 flex items-center justify-center flex-shrink-0"
        >
          <span className="material-symbols-outlined text-lg">add</span>
        </button>
      </div>

      {/* Attack rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {option.attacks.map((attack) => (
          <div key={attack.name} className="bg-surface-container-high p-4 space-y-3">
            <p className="font-label text-[10px] text-secondary uppercase tracking-widest">{attack.name}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => openRoll({ diceType: 20, count: 1, modifier: attack.bonus, label: `${option.name} — ${attack.name}`, critRange: 20 })}
                className="py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary hover:shadow-[0_0_20px_rgba(0,218,243,0.2)] transition-all active:scale-95 flex flex-col items-center"
              >
                <span className="font-label text-[9px] uppercase tracking-widest opacity-80 mb-0.5">Attack</span>
                <span className="font-label text-2xl font-black">{attack.bonus >= 0 ? `+${attack.bonus}` : attack.bonus}</span>
              </button>
              <button
                onClick={() => {
                  const { count, sides, bonus } = parseDiceFormula(attack.damageDice)
                  openRoll({ diceType: sides, count, modifier: attack.damageBonus + bonus, label: `${option.name} — ${attack.name} Dmg` })
                }}
                className="py-4 bg-surface-container-lowest border border-outline-variant/30 text-secondary hover:bg-surface-container-highest transition-all flex flex-col items-center"
              >
                <span className="font-label text-[9px] uppercase tracking-widest opacity-60 mb-0.5">Damage</span>
                <span className="font-label text-xl font-bold">
                  {attack.damageDice}{attack.damageBonus > 0 ? `+${attack.damageBonus}` : attack.damageBonus < 0 ? attack.damageBonus : ''}
                </span>
              </button>
            </div>
            {attack.notes && (
              <p className="font-label text-[10px] text-tertiary">{attack.notes}</p>
            )}
          </div>
        ))}
      </div>

      {/* Special abilities */}
      {option.specialAbilities && (
        <p className="font-label text-[10px] text-tertiary leading-relaxed border-t border-outline-variant/20 pt-3">
          {option.specialAbilities}
        </p>
      )}
    </div>
  )
}
