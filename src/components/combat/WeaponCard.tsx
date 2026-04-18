import { formatAttackBonus, formatDamage, calcEffectiveWeapon } from '../../lib/combat-calc'
import type { Weapon } from '../../types/combat'

export function WeaponCard({
  weapon,
  effective,
  ammo,
  maxAmmo,
  twfActive,
  offhandPenalty,
  sneakAttackDice,
  extraDiceLabel,
  onAttackRoll,
  onOffhandRoll,
  onDamageRoll,
  onSneakAttackRoll,
  onAmmoChange,
}: {
  weapon: Weapon
  effective: ReturnType<typeof calcEffectiveWeapon>
  ammo?: number
  maxAmmo?: number
  twfActive: boolean
  offhandPenalty: number
  sneakAttackDice?: string
  extraDiceLabel?: string
  onAttackRoll: () => void
  onOffhandRoll: () => void
  onDamageRoll: () => void
  onSneakAttackRoll?: () => void
  onAmmoChange?: (v: number) => void
}) {
  const borderColor = weapon.type === 'melee' ? 'border-primary' : 'border-secondary'
  const showOffhand = twfActive && weapon.type === 'melee'
  const offhandBonus = effective.attackBonus[0] + offhandPenalty

  return (
    <div className={`bg-surface-container p-6 relative group transition-all hover:bg-surface-container-high border-l-4 ${borderColor}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className={`text-[10px] font-label uppercase tracking-[0.2em] mb-1 block ${weapon.type === 'melee' ? 'text-primary' : 'text-secondary'}`}>
            {weapon.type === 'melee' ? 'Melee' : 'Ranged'}
          </span>
          <h3 className="text-2xl font-headline font-bold text-on-surface">{weapon.name}</h3>
          <div className="flex gap-2 mt-2 flex-wrap">
            {weapon.tags.map((tag) => (
              <span key={tag} className="bg-surface-container-lowest px-2 py-1 text-[10px] font-label text-secondary border border-secondary/20 uppercase tracking-widest">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-surface-container-high px-4 py-2 text-center flex-shrink-0">
          <p className="font-label text-[10px] text-tertiary uppercase tracking-widest mb-1">Critical</p>
          <p className="font-label text-lg font-bold text-secondary">
            {weapon.critRange < 20 ? `${weapon.critRange}-20` : '20'} / x{weapon.critMultiplier}
          </p>
        </div>
      </div>

      {/* Attack row */}
      <div className={`grid gap-4 mb-4 ${showOffhand ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <button
          onClick={onAttackRoll}
          className="flex flex-col items-center justify-center py-6 bg-gradient-to-br from-primary to-primary-container text-on-primary border border-white/70 shadow-[0_0_18px_rgba(0,218,243,0.25)] hover:shadow-[0_0_35px_rgba(0,218,243,0.5)] transition-all active:scale-95"
        >
          <span className="text-[10px] font-label uppercase tracking-widest mb-1 opacity-80">
            {showOffhand ? 'Primary' : 'Attack'}
          </span>
          <span className="text-3xl font-black font-label">{formatAttackBonus(effective.attackBonus)}</span>
        </button>

        {showOffhand && (
          <button
            onClick={onOffhandRoll}
            className="flex flex-col items-center justify-center py-6 bg-gradient-to-br from-primary/60 to-primary-container/60 text-on-primary border border-white/50 shadow-[0_0_12px_rgba(0,218,243,0.18)] hover:shadow-[0_0_28px_rgba(0,218,243,0.4)] transition-all active:scale-95"
          >
            <span className="text-[10px] font-label uppercase tracking-widest mb-1 opacity-80">Off-hand</span>
            <span className="text-3xl font-black font-label">{formatAttackBonus([offhandBonus])}</span>
          </button>
        )}
      </div>

      {/* Damage row */}
      <div className={`grid gap-4 ${
        weapon.type === 'ranged' && maxAmmo !== undefined && onAmmoChange
          ? sneakAttackDice ? 'grid-cols-3' : 'grid-cols-2'
          : sneakAttackDice ? 'grid-cols-2' : 'grid-cols-1'
      }`}>
        <button
          onClick={onDamageRoll}
          className="flex flex-col items-center justify-center py-6 bg-surface-container-lowest border border-white/40 text-secondary shadow-[0_0_12px_rgba(233,195,73,0.15)] hover:shadow-[0_0_25px_rgba(233,195,73,0.35)] hover:bg-surface-container-highest transition-all"
        >
          <span className="text-[10px] font-label uppercase tracking-widest mb-1 opacity-60">Damage</span>
          <span className="text-2xl font-bold font-label">
            {formatDamage(weapon.damageDice, effective.damageBonus)}
          </span>
        </button>

        {sneakAttackDice && onSneakAttackRoll && (
          <button
            onClick={onSneakAttackRoll}
            className="flex flex-col items-center justify-center py-6 bg-error-container/20 border border-white/40 text-error shadow-[0_0_12px_rgba(255,180,171,0.15)] hover:shadow-[0_0_25px_rgba(255,180,171,0.35)] hover:bg-error-container/40 transition-all active:scale-95"
          >
            <span className="text-[10px] font-label uppercase tracking-widest mb-1 opacity-80">{extraDiceLabel ?? 'Extra Dmg'}</span>
            <span className="text-2xl font-bold font-label">{sneakAttackDice}</span>
          </button>
        )}

        {/* Ammo tracker */}
        {weapon.type === 'ranged' && maxAmmo !== undefined && ammo !== undefined && onAmmoChange && (
          <div className="flex flex-col items-center justify-center bg-surface-container-lowest border border-outline-variant/20 py-2 px-3 gap-1">
            <p className="font-label text-[10px] text-tertiary uppercase tracking-widest mb-1">Ammo</p>
            <div className="flex flex-wrap gap-0.5 justify-center">
              {Array.from({ length: maxAmmo }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => onAmmoChange(i < ammo ? ammo - 1 : ammo + 1)}
                  className={`w-2 h-5 transition-all ${i < ammo ? 'bg-secondary' : 'bg-surface-container-high'}`}
                  aria-label={`Ammo ${i + 1}`}
                />
              ))}
            </div>
            <p className="font-label text-xs text-secondary mt-1">{ammo}/{maxAmmo}</p>
          </div>
        )}
      </div>
    </div>
  )
}
