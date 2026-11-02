import { formatAttackBonus, formatDamage } from '../../lib/combat-calc'
import { StatBreakdownTooltip } from '../ui/StatBreakdownTooltip'
import { useTranslation } from '../../lib/i18n'
import type { Weapon } from '../../types/combat'
import type { EffectiveWeaponCalculated } from '../../lib/stat-calc'

export interface SpellstrikeRider {
  spellName: string
  chargesRemaining: number
  chargesMax: number
  damageDice: string
  damageType?: string
  hasMetalBonusToggle?: boolean
  metalBonusActive?: boolean
  onToggleMetalBonus?: (active: boolean) => void
  onDischarge?: () => void
  onClear?: () => void
}

export interface QuickSpellstrikeArm {
  availableSpells: Array<{ id: string; name: string; preparedRemaining?: number; preparedTotal?: number }>
  onArm: (spellId: string) => void
}

export interface StunningFistRider {
  dc: number
  declared: 'stunned' | 'fatigued' | null
  onToggle: (condition: 'stunned' | 'fatigued' | null) => void
}

export interface JabbingStyleRider {
  onRoll: () => void
}

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
  spellstrikeRider,
  quickSpellstrikeArm,
  stunningFistRider,
  jabbingStyleRider,
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
  spellstrikeRider?: SpellstrikeRider
  quickSpellstrikeArm?: QuickSpellstrikeArm
  stunningFistRider?: StunningFistRider
  jabbingStyleRider?: JabbingStyleRider
  onAttackRoll: (attackIndex?: number) => void
  onOffhandRoll: () => void
  onDamageRoll: () => void
  onSneakAttackRoll?: () => void
  onAmmoChange?: (v: number) => void
  onFullAttackRoll?: () => void
}) {
  const { t } = useTranslation()
  const isHaste = hasteActive ?? effective.hasteActive ?? effective.activeBuffNames?.some((b) => /haste/i.test(b)) ?? false
  const isMelee = weapon.type === 'melee'
  const showOffhand = twfActive && isMelee
  const offhandBonus = effective.attackBonus[0] + offhandPenalty
  const hasMultipleAttacks = effective.attackBonus.length > 1 || showOffhand || isHaste
  const damageText = formatDamage(weapon.damageDice, effective.damageBonus)
  const critText = `${weapon.critRange < 20 ? `${weapon.critRange}-20` : '20'} / x${weapon.critMultiplier}`

  const actionClass =
    'group/action flex min-h-[52px] flex-col items-center justify-center rounded-xl border px-3 py-2 transition-all active:scale-95 cursor-pointer'
  const attackClass = `${actionClass} border-primary/35 bg-primary/10 text-white hover:border-primary/70 hover:bg-primary/20`
  const damageClass = `${actionClass} border-secondary/35 bg-secondary/10 text-white hover:border-secondary/70 hover:bg-secondary/20`

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-surface-container/70 backdrop-blur-sm transition-colors hover:border-white/15 relative">
      <div className="p-3.5 md:p-4">
        {/* Identity line */}
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="material-symbols-outlined text-lg text-primary/70">
                {isMelee ? 'swords' : 'my_location'}
              </span>
              <h3 className="truncate font-headline text-lg font-bold text-white md:text-xl">
                {weapon.name}
              </h3>
              <span
                className={`rounded-full border px-2 py-0.5 font-label text-[9px] font-bold uppercase tracking-[0.14em] ${
                  isMelee
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-secondary/30 bg-secondary/10 text-secondary'
                }`}
              >
                {isMelee ? 'Melee' : 'Ranged'}
              </span>
            </div>

            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-label text-[10px] text-tertiary">
              {weapon.tags.map((tag) => (
                <span key={tag} className="after:ml-2 after:text-white/15 after:content-['·'] last:after:content-['']">
                  {tag}
                </span>
              ))}
              <span>
                Critical <strong className="font-semibold text-secondary">{critText}</strong>
              </span>
            </p>
          </div>

          {/* Ranged ammo, inline */}
          {weapon.type === 'ranged' && maxAmmo !== undefined && (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface-container-lowest/60 px-2.5 py-1.5">
              <span className="font-label text-[9px] uppercase tracking-wider text-tertiary">Ammo</span>
              <span className="font-label text-[11px] font-bold tabular-nums text-secondary">
                {ammo ?? 0}/{maxAmmo}
              </span>
              {onAmmoChange &&
                (maxAmmo <= 10 ? (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: maxAmmo }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onAmmoChange(i < (ammo ?? 0) ? (ammo ?? 0) - 1 : (ammo ?? 0) + 1)}
                        className={`h-4 w-1.5 rounded-full transition-all cursor-pointer ${
                          i < (ammo ?? 0)
                            ? 'bg-secondary shadow-[0_0_6px_#d946ef]'
                            : 'bg-surface-container-highest hover:bg-secondary/40'
                        }`}
                        aria-label={`Ammo ${i + 1}`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onAmmoChange(Math.max(0, (ammo ?? 0) - 1))}
                      disabled={(ammo ?? 0) <= 0}
                      className="flex h-5 w-5 items-center justify-center rounded-md border border-white/5 bg-surface-container text-xs text-tertiary hover:text-white disabled:opacity-40 cursor-pointer"
                      aria-label="Decrease ammo"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => onAmmoChange(Math.min(maxAmmo, (ammo ?? 0) + 1))}
                      disabled={(ammo ?? 0) >= maxAmmo}
                      className="flex h-5 w-5 items-center justify-center rounded-md border border-white/5 bg-surface-container text-xs text-tertiary hover:text-white disabled:opacity-40 cursor-pointer"
                      aria-label="Increase ammo"
                    >
                      +
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 flex flex-wrap items-stretch gap-2">
          {/* Attack roll(s) */}
          {effective.attackBonus.length > 1 ? (
            effective.attackBonus.map((bonus, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onAttackRoll(idx)}
                title={`Roll attack ${idx + 1}`}
                className={`${attackClass} min-w-[78px]`}
              >
                <span className="font-label text-[9px] uppercase tracking-wider text-primary/80">
                  {idx + 1}° Attack
                </span>
                <span className="font-label text-lg font-black tabular-nums text-white">
                  {bonus >= 0 ? `+${bonus}` : bonus}
                </span>
              </button>
            ))
          ) : (
            <button
              type="button"
              onClick={() => onAttackRoll(0)}
              title={`Roll attack (${formatAttackBonus(effective.attackBonus)})`}
              className={`${attackClass} min-w-[108px]`}
            >
              <span className="font-label text-[9px] uppercase tracking-wider text-primary/80">
                {showOffhand ? 'Primary Attack' : 'Attack'}
              </span>
              <StatBreakdownTooltip
                title={`${weapon.name} — Attack`}
                total={formatAttackBonus(effective.attackBonus)}
                breakdown={effective.attackBreakdown}
              >
                <span className="font-label text-lg font-black tabular-nums text-white underline decoration-primary/20 decoration-dotted underline-offset-4">
                  {formatAttackBonus(effective.attackBonus)}
                </span>
              </StatBreakdownTooltip>
            </button>
          )}

          {showOffhand && (
            <button
              type="button"
              onClick={onOffhandRoll}
              title={`Roll off-hand attack (${offhandBonus >= 0 ? `+${offhandBonus}` : offhandBonus})`}
              className={`${actionClass} min-w-[84px] border-secondary/35 bg-secondary/10 text-white hover:border-secondary/70 hover:bg-secondary/20`}
            >
              <span className="font-label text-[9px] uppercase tracking-wider text-secondary/80">
                Off-hand
              </span>
              <StatBreakdownTooltip
                title={`${weapon.name} — Off-hand`}
                total={offhandBonus >= 0 ? `+${offhandBonus}` : `${offhandBonus}`}
                breakdown={[...effective.attackBreakdown, { label: 'Off-hand Penalty', value: offhandPenalty }]}
              >
                <span className="font-label text-lg font-black tabular-nums text-white underline decoration-secondary/20 decoration-dotted underline-offset-4">
                  {offhandBonus >= 0 ? `+${offhandBonus}` : offhandBonus}
                </span>
              </StatBreakdownTooltip>
            </button>
          )}

          {/* Damage roll */}
          <button
            type="button"
            onClick={onDamageRoll}
            title={`Roll damage (${damageText})`}
            className={`${damageClass} min-w-[104px]`}
          >
            <span className="font-label text-[9px] uppercase tracking-wider text-secondary/80">Damage</span>
            <StatBreakdownTooltip
              title={`${weapon.name} — Damage`}
              total={damageText}
              breakdown={effective.damageBreakdown}
            >
              <span className="font-label text-base font-black tabular-nums text-white underline decoration-secondary/20 decoration-dotted underline-offset-4 md:text-lg">
                {damageText}
              </span>
            </StatBreakdownTooltip>
          </button>

          {/* Extra damage dice (sneak attack, style bonuses, …) */}
          {sneakAttackDice && onSneakAttackRoll && (
            <button
              type="button"
              onClick={onSneakAttackRoll}
              title={`Roll ${extraDiceLabel ?? 'extra damage'}`}
              className={`${actionClass} min-w-[84px] border-error/35 bg-error/10 text-white hover:border-error/70 hover:bg-error/20`}
            >
              <span className="font-label text-[9px] uppercase tracking-wider text-error/90">
                {extraDiceLabel ?? 'Extra Dmg'}
              </span>
              <span className="font-label text-lg font-black tabular-nums text-white">
                {sneakAttackDice}
              </span>
            </button>
          )}
        </div>

        {/* Magus Spellstrike held charge rider */}
        {spellstrikeRider && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-secondary/40 bg-secondary/15 p-2 shadow-[0_0_12px_rgba(217,70,239,0.2)]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-base">electric_bolt</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-headline text-xs font-bold text-white">
                    Spellstrike: {spellstrikeRider.spellName}
                  </span>
                  <span className="rounded-full border border-secondary/40 bg-secondary/20 px-1.5 py-0.2 font-label text-[9px] font-bold text-secondary">
                    {spellstrikeRider.chargesRemaining}/{spellstrikeRider.chargesMax} cariche
                  </span>
                </div>
                <span className="font-label text-[10px] text-tertiary">
                  +{spellstrikeRider.damageDice} {spellstrikeRider.damageType ? `(${spellstrikeRider.damageType})` : ''}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {spellstrikeRider.hasMetalBonusToggle && (
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(spellstrikeRider.metalBonusActive)}
                    onChange={(e) => spellstrikeRider.onToggleMetalBonus?.(e.target.checked)}
                    className="rounded border-white/20 text-secondary focus:ring-0"
                  />
                  <span className="font-label text-[10px] text-secondary font-bold">
                    {t('combat.vsMetal')}
                  </span>
                </label>
              )}
              {spellstrikeRider.onDischarge && (
                <button
                  type="button"
                  onClick={spellstrikeRider.onDischarge}
                  className="rounded-lg border border-secondary/40 bg-secondary/25 px-2.5 py-1 font-label text-[10px] font-bold text-secondary hover:bg-secondary/35 transition-colors cursor-pointer"
                >
                  {t('combat.rollAndDischarge')}
                </button>
              )}
              {spellstrikeRider.onClear && (
                <button
                  type="button"
                  onClick={spellstrikeRider.onClear}
                  className="text-tertiary hover:text-white p-1 cursor-pointer"
                  title={t('combat.cancelSpellstrike')}
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick Spellstrike Arm (when no charge is held on a melee weapon) */}
        {!spellstrikeRider && quickSpellstrikeArm && quickSpellstrikeArm.availableSpells.length > 0 && isMelee && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-surface-container/60 px-2 py-1.5">
            <span className="flex items-center gap-1 font-label text-[9px] uppercase tracking-wider text-secondary font-bold">
              <span className="material-symbols-outlined text-xs">electric_bolt</span>
              Carica Spellstrike:
            </span>
            {quickSpellstrikeArm.availableSpells.map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => quickSpellstrikeArm.onArm(sp.id)}
                className="rounded border border-secondary/30 bg-secondary/10 px-1.5 py-0.5 font-label text-[9px] font-bold text-secondary hover:bg-secondary/25 transition-colors cursor-pointer"
              >
                {sp.name}
                {sp.preparedTotal ? ` (${sp.preparedRemaining}/${sp.preparedTotal})` : ''}
              </button>
            ))}
          </div>
        )}

        {/* Monk Stunning Fist & Jabbing Style riders */}
        {(stunningFistRider || jabbingStyleRider) && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/10 p-2">
            {stunningFistRider && (
              <div className="flex items-center gap-1.5">
                <span className="font-label text-[10px] font-bold uppercase text-primary">Stunning Fist:</span>
                <button
                  type="button"
                  onClick={() => stunningFistRider.onToggle(stunningFistRider.declared === 'stunned' ? null : 'stunned')}
                  className={`rounded px-2 py-0.5 font-label text-[10px] font-bold cursor-pointer transition-colors ${
                    stunningFistRider.declared === 'stunned'
                      ? 'border border-primary bg-primary text-black shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                      : 'border border-white/10 bg-surface-container text-tertiary hover:text-white'
                  }`}
                >
                  Stunned (CD {stunningFistRider.dc})
                </button>
                <button
                  type="button"
                  onClick={() => stunningFistRider.onToggle(stunningFistRider.declared === 'fatigued' ? null : 'fatigued')}
                  className={`rounded px-2 py-0.5 font-label text-[10px] font-bold cursor-pointer transition-colors ${
                    stunningFistRider.declared === 'fatigued'
                      ? 'border border-primary bg-primary text-black shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                      : 'border border-white/10 bg-surface-container text-tertiary hover:text-white'
                  }`}
                >
                  Fatigued (CD {stunningFistRider.dc})
                </button>
              </div>
            )}
            {jabbingStyleRider && (
              <button
                type="button"
                onClick={jabbingStyleRider.onRoll}
                className="rounded border border-secondary/30 bg-secondary/20 px-2 py-0.5 font-label text-[10px] font-bold text-secondary hover:bg-secondary/30 transition-colors cursor-pointer"
              >
                +1d6 Jabbing Style
              </button>
            )}
          </div>
        )}

        {/* Full attack routine */}
        {hasMultipleAttacks && onFullAttackRoll && (
          <button
            type="button"
            onClick={onFullAttackRoll}
            className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 font-label text-[10px] text-tertiary transition-colors hover:border-primary/30 hover:text-white cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-primary/80">fast_forward</span>
              <span>
                Full Attack Routine ({formatAttackBonus(effective.attackBonus)}
                {isHaste ? ` + Haste (${effective.attackBonus[0] >= 0 ? `+${effective.attackBonus[0]}` : effective.attackBonus[0]})` : ''}
                {showOffhand ? ` / Off ${offhandBonus >= 0 ? `+${offhandBonus}` : offhandBonus}` : ''})
              </span>
            </span>
            <span className="material-symbols-outlined text-sm text-tertiary">chevron_right</span>
          </button>
        )}
      </div>
    </article>
  )
}
