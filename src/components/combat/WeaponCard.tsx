import { formatAttackBonus, formatDamage } from '../../lib/combat-calc'
import type { Weapon } from '../../types/combat'
import type { EffectiveWeaponCalculated } from '../../lib/stat-calc'

export function WeaponCard({
  weapon,
  effective,
  ammo,
  maxAmmo,
  twfActive,
  offhandPenalty,
  hasteActive,
  sneakAttackDice,
  extraDiceLabel,
  onAttackRoll,
  onOffhandRoll,
  onDamageRoll,
  onSneakAttackRoll,
  onAmmoChange,
  onFullAttackRoll,
}: {
  weapon: Weapon
  effective: EffectiveWeaponCalculated
  ammo?: number
  maxAmmo?: number
  twfActive: boolean
  offhandPenalty: number
  hasteActive?: boolean
  sneakAttackDice?: string
  extraDiceLabel?: string
  onAttackRoll: (attackIndex?: number) => void
  onOffhandRoll: () => void
  onDamageRoll: () => void
  onSneakAttackRoll?: () => void
  onAmmoChange?: (v: number) => void
  onFullAttackRoll?: () => void
}) {
  const isHaste = hasteActive ?? effective.hasteActive ?? effective.activeBuffNames?.some((b) => /haste/i.test(b)) ?? false
  const isMelee = weapon.type === 'melee'
  const showOffhand = twfActive && isMelee
  const offhandBonus = effective.attackBonus[0] + offhandPenalty
  const hasMultipleAttacks = effective.attackBonus.length > 1 || showOffhand || isHaste

  return (
    <div className={`bg-surface-container/90 backdrop-blur-sm p-6 relative group transition-all hover:bg-surface-container-high rounded-2xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.35)] hover:border-primary/30`}>
      {/* Accent corner pill */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className={`text-[10px] font-label uppercase tracking-[0.2em] mb-1.5 inline-block px-2.5 py-0.5 rounded-full ${
            isMelee ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-secondary/15 text-secondary border border-secondary/30'
          }`}>
            {isMelee ? 'Melee' : 'Ranged'}
          </span>
          <h3 className="text-2xl font-headline font-bold text-white mt-1">{weapon.name}</h3>
          <div className="flex gap-2 mt-2.5 flex-wrap">
            {weapon.tags.map((tag) => (
              <span key={tag} className="bg-surface-container-highest px-2 py-0.5 text-[10px] font-label text-secondary border border-secondary/20 rounded-md uppercase tracking-widest">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-surface-container-high border border-white/10 px-4 py-2 text-center flex-shrink-0 rounded-xl">
          <p className="font-label text-[10px] text-tertiary uppercase tracking-widest mb-1">Critical</p>
          <p className="font-label text-lg font-bold text-secondary">
            {weapon.critRange < 20 ? `${weapon.critRange}-20` : '20'} / x{weapon.critMultiplier}
          </p>
        </div>
      </div>

      {/* Attack Section */}
      <div className="space-y-2.5 mb-4">
        {/* Full Attack trigger button when multiple attacks or TWF active */}
        {hasMultipleAttacks && onFullAttackRoll && (
          <button
            onClick={onFullAttackRoll}
            className="w-full py-2.5 bg-gradient-to-r from-primary/20 via-primary/30 to-secondary/20 hover:from-primary/30 hover:to-secondary/30 border border-primary/50 text-white font-label text-xs uppercase tracking-widest font-bold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base text-primary">fast_forward</span>
            <span>
              Full Attack Routine ({formatAttackBonus(effective.attackBonus)}
              {isHaste ? ` + Haste (${effective.attackBonus[0] >= 0 ? `+${effective.attackBonus[0]}` : effective.attackBonus[0]})` : ''}
              {showOffhand ? ` / Off ${offhandBonus >= 0 ? `+${offhandBonus}` : offhandBonus}` : ''})
            </span>
          </button>
        )}

        {/* Individual Iterative Attacks */}
        {effective.attackBonus.length > 1 ? (
          <div className={`grid gap-2 ${effective.attackBonus.length + (showOffhand ? 1 : 0) > 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {effective.attackBonus.map((bonus, idx) => (
              <button
                key={idx}
                onClick={() => onAttackRoll(idx)}
                className="py-3 px-2 bg-gradient-to-b from-primary/25 to-primary/10 hover:from-primary/35 hover:to-primary/20 text-white font-bold border border-primary/40 shadow-[0_0_12px_rgba(0,240,255,0.15)] hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] rounded-xl transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center"
              >
                <span className="text-[9px] font-label uppercase tracking-widest text-primary mb-0.5">
                  {idx + 1}° Attack
                </span>
                <span className="text-xl font-black font-label text-white">
                  {bonus >= 0 ? `+${bonus}` : bonus}
                </span>
              </button>
            ))}

            {showOffhand && (
              <button
                onClick={onOffhandRoll}
                className="py-3 px-2 bg-surface-container-high border border-secondary/40 text-secondary shadow-[0_0_12px_rgba(217,70,239,0.15)] hover:shadow-[0_0_20px_rgba(217,70,239,0.3)] rounded-xl transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center"
              >
                <span className="text-[9px] font-label uppercase tracking-widest mb-0.5 opacity-80">
                  Off-hand
                </span>
                <span className="text-xl font-black font-label">
                  {offhandBonus >= 0 ? `+${offhandBonus}` : offhandBonus}
                </span>
              </button>
            )}
          </div>
        ) : (
          /* Single Attack or Single + Off-hand */
          <div className={`grid gap-4 ${showOffhand ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <button
              onClick={() => onAttackRoll(0)}
              className="flex flex-col items-center justify-center py-5 bg-gradient-to-r from-primary to-primary-container text-black font-bold border border-white/40 shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:shadow-[0_0_35px_rgba(0,240,255,0.45)] rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <span className="text-[10px] font-label uppercase tracking-widest mb-1 opacity-90">
                {showOffhand ? 'Primary Attack' : 'Attack'}
              </span>
              <span className="text-3xl font-black font-label">
                {formatAttackBonus(effective.attackBonus)}
              </span>
            </button>

            {showOffhand && (
              <button
                onClick={onOffhandRoll}
                className="flex flex-col items-center justify-center py-5 bg-surface-container-high border border-primary/40 text-primary shadow-[0_0_15px_rgba(0,240,255,0.15)] hover:shadow-[0_0_28px_rgba(0,240,255,0.35)] rounded-xl transition-all active:scale-95 cursor-pointer"
              >
                <span className="text-[10px] font-label uppercase tracking-widest mb-1 opacity-80">Off-hand</span>
                <span className="text-3xl font-black font-label">{formatAttackBonus([offhandBonus])}</span>
              </button>
            )}
          </div>
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
          className="flex flex-col items-center justify-center py-5 bg-surface-container-lowest border border-white/15 text-white hover:text-secondary shadow-[0_0_15px_rgba(217,70,239,0.12)] hover:shadow-[0_0_25px_rgba(217,70,239,0.3)] hover:bg-surface-container-high rounded-xl transition-all cursor-pointer"
        >
          <span className="text-[10px] font-label uppercase tracking-widest mb-1 opacity-70">Damage</span>
          <span className="text-2xl font-bold font-label">
            {formatDamage(weapon.damageDice, effective.damageBonus)}
          </span>
        </button>

        {sneakAttackDice && onSneakAttackRoll && (
          <button
            onClick={onSneakAttackRoll}
            className="flex flex-col items-center justify-center py-5 bg-error-container/20 border border-error/40 text-error shadow-[0_0_15px_rgba(255,75,96,0.15)] hover:shadow-[0_0_25px_rgba(255,75,96,0.35)] hover:bg-error-container/40 rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            <span className="text-[10px] font-label uppercase tracking-widest mb-1 opacity-90">{extraDiceLabel ?? 'Extra Dmg'}</span>
            <span className="text-2xl font-bold font-label">{sneakAttackDice}</span>
          </button>
        )}

        {/* Ammo tracker */}
        {weapon.type === 'ranged' && maxAmmo !== undefined && ammo !== undefined && onAmmoChange && (
          <div className="flex flex-col items-center justify-center bg-surface-container-lowest border border-white/10 rounded-xl py-2 px-3 gap-1">
            <p className="font-label text-[10px] text-tertiary uppercase tracking-widest mb-1">Ammo</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {Array.from({ length: maxAmmo }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => onAmmoChange(i < ammo ? ammo - 1 : ammo + 1)}
                  className={`w-2.5 h-5 rounded-xs transition-all cursor-pointer ${i < ammo ? 'bg-secondary shadow-[0_0_6px_#d946ef]' : 'bg-surface-container-high'}`}
                  aria-label={`Ammo ${i + 1}`}
                />
              ))}
            </div>
            <p className="font-label text-xs text-secondary mt-1 font-bold">{ammo}/{maxAmmo}</p>
          </div>
        )}
      </div>
    </div>
  )
}
