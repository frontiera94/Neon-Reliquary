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
    <div className="bg-surface-container/90 backdrop-blur-sm p-5 md:p-6 relative group transition-all hover:bg-surface-container-high rounded-2xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.35)] hover:border-primary/30">
      {/* Header & Specs Cluster */}
      <div className="flex justify-between items-start gap-3 mb-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`text-[10px] font-label uppercase tracking-[0.2em] inline-block px-2.5 py-0.5 rounded-full ${
                isMelee
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-secondary/15 text-secondary border border-secondary/30'
              }`}
            >
              {isMelee ? 'Melee' : 'Ranged'}
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-headline font-bold text-white tracking-wide truncate">
            {weapon.name}
          </h3>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {weapon.tags.map((tag) => (
              <span
                key={tag}
                className="bg-surface-container-highest px-2 py-0.5 text-[10px] font-label text-secondary border border-secondary/20 rounded-md uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Specs Cluster: Critical & Ammo Tracker */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Critical Badge */}
          <div className="bg-surface-container-high border border-white/10 px-3 py-2 text-center rounded-xl min-w-[70px]">
            <p className="font-label text-[9px] text-tertiary uppercase tracking-widest leading-none mb-1">
              Critical
            </p>
            <p className="font-label text-sm md:text-base font-bold text-secondary leading-tight">
              {weapon.critRange < 20 ? `${weapon.critRange}-20` : '20'} / x{weapon.critMultiplier}
            </p>
          </div>

          {/* Ammo Tracker for Ranged Weapons */}
          {weapon.type === 'ranged' && maxAmmo !== undefined && (
            <div className="bg-surface-container-high border border-white/10 px-3 py-2 text-center rounded-xl min-w-[76px]">
              <div className="flex items-center justify-between gap-1 mb-1">
                <p className="font-label text-[9px] text-tertiary uppercase tracking-widest leading-none">
                  Ammo
                </p>
                <p className="font-label text-xs text-secondary font-bold leading-none">
                  {ammo ?? 0}/{maxAmmo}
                </p>
              </div>
              {onAmmoChange && (
                maxAmmo <= 10 ? (
                  <div className="flex items-center gap-1 justify-center mt-1">
                    {Array.from({ length: maxAmmo }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onAmmoChange(i < (ammo ?? 0) ? (ammo ?? 0) - 1 : (ammo ?? 0) + 1)}
                        className={`w-2 h-4 rounded-xs transition-all cursor-pointer ${
                          i < (ammo ?? 0)
                            ? 'bg-secondary shadow-[0_0_6px_#d946ef]'
                            : 'bg-surface-container-lowest border border-white/10 hover:border-secondary/40'
                        }`}
                        aria-label={`Ammo ${i + 1}`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 justify-center mt-1">
                    <button
                      type="button"
                      onClick={() => onAmmoChange(Math.max(0, (ammo ?? 0) - 1))}
                      disabled={(ammo ?? 0) <= 0}
                      className="w-5 h-5 rounded bg-surface-container-lowest hover:bg-surface-container text-tertiary hover:text-white flex items-center justify-center text-xs cursor-pointer border border-white/5 disabled:opacity-40"
                      aria-label="Decrease ammo"
                    >
                      -
                    </button>
                    <div className="w-10 h-1.5 bg-surface-container-lowest rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-secondary shadow-[0_0_6px_#d946ef] rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((ammo ?? 0) / maxAmmo) * 100)}%` }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onAmmoChange(Math.min(maxAmmo, (ammo ?? 0) + 1))}
                      disabled={(ammo ?? 0) >= maxAmmo}
                      className="w-5 h-5 rounded bg-surface-container-lowest hover:bg-surface-container text-tertiary hover:text-white flex items-center justify-center text-xs cursor-pointer border border-white/5 disabled:opacity-40"
                      aria-label="Increase ammo"
                    >
                      +
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full Attack Routine Banner (if multiple attacks available) */}
      {hasMultipleAttacks && onFullAttackRoll && (
        <button
          type="button"
          onClick={onFullAttackRoll}
          className="w-full py-2 px-3 mb-3 bg-gradient-to-r from-primary/15 via-primary/25 to-secondary/15 hover:from-primary/25 hover:to-secondary/25 border border-primary/40 hover:border-primary/70 text-white font-label text-xs uppercase tracking-wider font-bold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.25)] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base text-primary">fast_forward</span>
          <span>
            Full Attack Routine ({formatAttackBonus(effective.attackBonus)}
            {isHaste ? ` + Haste (${effective.attackBonus[0] >= 0 ? `+${effective.attackBonus[0]}` : effective.attackBonus[0]})` : ''}
            {showOffhand ? ` / Off ${offhandBonus >= 0 ? `+${offhandBonus}` : offhandBonus}` : ''})
          </span>
        </button>
      )}

      {/* Balanced 2-Column Action Pod: [ ATTACK ] [ DAMAGE ] */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
        {/* Left Column: Attack Actions */}
        <div className="flex flex-col justify-center">
          {effective.attackBonus.length > 1 ? (
            /* Multiple Iterative Attacks */
            <div className={`grid gap-2 h-full ${effective.attackBonus.length + (showOffhand ? 1 : 0) > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {effective.attackBonus.map((bonus, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onAttackRoll(idx)}
                  className="py-2.5 px-3 bg-gradient-to-b from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 text-white border border-primary/40 hover:border-primary shadow-[0_0_12px_rgba(0,240,255,0.12)] hover:shadow-[0_0_20px_rgba(0,240,255,0.25)] rounded-xl transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center min-h-[58px]"
                >
                  <span className="text-[9px] font-label uppercase tracking-widest text-primary mb-0.5 font-semibold">
                    {idx + 1}° Attack
                  </span>
                  <span className="text-xl font-black font-label text-white">
                    {bonus >= 0 ? `+${bonus}` : bonus}
                  </span>
                </button>
              ))}

              {showOffhand && (
                <button
                  type="button"
                  onClick={onOffhandRoll}
                  className="py-2.5 px-3 bg-surface-container-high hover:bg-surface-container-highest border border-secondary/40 hover:border-secondary text-secondary shadow-[0_0_12px_rgba(217,70,239,0.12)] hover:shadow-[0_0_20px_rgba(217,70,239,0.25)] rounded-xl transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center min-h-[58px]"
                >
                  <span className="text-[9px] font-label uppercase tracking-widest mb-0.5 opacity-80 font-semibold">
                    Off-hand
                  </span>
                  <span className="text-xl font-black font-label">
                    {offhandBonus >= 0 ? `+${offhandBonus}` : offhandBonus}
                  </span>
                </button>
              )}
            </div>
          ) : showOffhand ? (
            /* Single Attack + Off-hand */
            <div className="grid grid-cols-2 gap-2 h-full">
              <button
                type="button"
                onClick={() => onAttackRoll(0)}
                className="p-3 bg-gradient-to-b from-primary/25 to-primary/10 hover:from-primary/35 hover:to-primary/20 text-white border border-primary/40 hover:border-primary shadow-[0_0_12px_rgba(0,240,255,0.15)] hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] rounded-xl transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center min-h-[58px]"
              >
                <span className="text-[9px] font-label uppercase tracking-widest text-primary mb-0.5 font-semibold">
                  Primary Attack
                </span>
                <span className="text-xl font-black font-label text-white">
                  {formatAttackBonus(effective.attackBonus)}
                </span>
              </button>

              <button
                type="button"
                onClick={onOffhandRoll}
                className="p-3 bg-surface-container-high hover:bg-surface-container-highest border border-secondary/40 hover:border-secondary text-secondary shadow-[0_0_12px_rgba(217,70,239,0.15)] hover:shadow-[0_0_20px_rgba(217,70,239,0.3)] rounded-xl transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center min-h-[58px]"
              >
                <span className="text-[9px] font-label uppercase tracking-widest mb-0.5 opacity-90 font-semibold">
                  Off-hand
                </span>
                <span className="text-xl font-black font-label">
                  {formatAttackBonus([offhandBonus])}
                </span>
              </button>
            </div>
          ) : (
            /* Standard Single Attack */
            <button
              type="button"
              onClick={() => onAttackRoll(0)}
              className="group/atk relative flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/20 via-primary/10 to-surface-container-high hover:from-primary/30 hover:to-surface-container-highest border border-primary/40 hover:border-primary text-white rounded-xl shadow-[0_0_15px_rgba(0,240,255,0.15)] hover:shadow-[0_0_25px_rgba(0,240,255,0.3)] transition-all cursor-pointer active:scale-[0.98] w-full min-h-[58px]"
            >
              <div className="text-left">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[9px] font-label font-bold text-primary/70 bg-primary/10 px-1 rounded">1</span>
                  <span className="text-[10px] font-label uppercase tracking-widest text-primary block font-bold leading-none">
                    Attack
                  </span>
                </div>
                <span className="text-[11px] font-label text-tertiary uppercase tracking-wider block leading-none">
                  To-Hit Roll
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black font-label text-white group-hover/atk:text-primary transition-colors">
                  {formatAttackBonus(effective.attackBonus)}
                </span>
                <span className="material-symbols-outlined text-primary/60 group-hover/atk:text-primary text-lg transition-colors">
                  casino
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Right Column: Damage Actions (and Sneak Attack) */}
        <div className="flex flex-col justify-center">
          {sneakAttackDice && onSneakAttackRoll ? (
            <div className="grid grid-cols-2 gap-2 h-full">
              <button
                type="button"
                onClick={onDamageRoll}
                className="group/dmg p-3 bg-surface-container-high hover:bg-surface-container-highest border border-white/10 hover:border-secondary/40 text-white rounded-xl shadow-[0_0_10px_rgba(217,70,239,0.1)] hover:shadow-[0_0_18px_rgba(217,70,239,0.25)] transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center min-h-[58px]"
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[9px] font-label font-bold text-secondary/70 bg-secondary/10 px-1 rounded">2</span>
                  <span className="text-[9px] font-label uppercase tracking-widest text-secondary font-bold">
                    Damage
                  </span>
                </div>
                <span className="text-lg font-black font-label text-white group-hover/dmg:text-secondary transition-colors truncate">
                  {formatDamage(weapon.damageDice, effective.damageBonus)}
                </span>
              </button>

              <button
                type="button"
                onClick={onSneakAttackRoll}
                className="group/sneak p-3 bg-error-container/20 hover:bg-error-container/35 border border-error/40 hover:border-error text-error rounded-xl shadow-[0_0_12px_rgba(255,75,96,0.15)] hover:shadow-[0_0_20px_rgba(255,75,96,0.3)] transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center min-h-[58px]"
              >
                <span className="text-[9px] font-label uppercase tracking-widest text-error mb-0.5 font-bold truncate max-w-full">
                  {extraDiceLabel ?? 'Extra Dmg'}
                </span>
                <span className="text-lg font-black font-label text-white group-hover/sneak:text-error transition-colors">
                  {sneakAttackDice}
                </span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onDamageRoll}
              className="group/dmg relative flex items-center justify-between px-4 py-3 bg-surface-container-high/90 hover:bg-surface-container-highest border border-white/10 hover:border-secondary/40 text-white rounded-xl shadow-[0_0_12px_rgba(217,70,239,0.1)] hover:shadow-[0_0_22px_rgba(217,70,239,0.25)] transition-all cursor-pointer active:scale-[0.98] w-full min-h-[58px]"
            >
              <div className="text-left">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[9px] font-label font-bold text-secondary/70 bg-secondary/10 px-1 rounded">2</span>
                  <span className="text-[10px] font-label uppercase tracking-widest text-secondary block font-bold leading-none">
                    Damage
                  </span>
                </div>
                <span className="text-[11px] font-label text-tertiary uppercase tracking-wider block leading-none">
                  Formula Roll
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl md:text-2xl font-black font-label text-white group-hover/dmg:text-secondary transition-colors">
                  {formatDamage(weapon.damageDice, effective.damageBonus)}
                </span>
                <span className="material-symbols-outlined text-secondary/60 group-hover/dmg:text-secondary text-lg transition-colors">
                  colorize
                </span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
