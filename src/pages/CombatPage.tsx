import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import {
  calcEffectiveAbilities,
  calcEffectiveArmorClass,
  calcEffectiveSaves,
  calcEffectiveWeaponStats,
  getActiveActionRestrictions,
  resolveBuffResource,
} from '../lib/stat-calc'
import { abilityMod, parseDiceFormula } from '../lib/dice-engine'
import { CombatHPWidget } from '../components/combat/CombatHPWidget'
import { SummonSection } from '../components/combat/SummonSection'
import { SummonedCreaturePanel } from '../components/combat/SummonedCreaturePanel'
import { WeaponCard } from '../components/combat/WeaponCard'
import { ActionAlertBanner } from '../components/combat/ActionAlertBanner'
import { BuffManagerModal } from '../components/combat/BuffManagerModal'
import { ContextualCombatFeatures, DefensiveBadges } from '../components/combat/ContextualCombatFeatures'
import { CombatSpellsSection } from '../components/combat/CombatSpellsSection'
import { StatBreakdownTooltip } from '../components/ui/StatBreakdownTooltip'
import type { BuffToggle } from '../types/combat'

function buffModifierParts(buff: BuffToggle) {
  const parts: { label: string; value: number }[] = []
  if (buff.attackMod !== 0) parts.push({ label: `${buff.attackMod > 0 ? '+' : ''}${buff.attackMod} ATK`, value: buff.attackMod })
  if (buff.damageMod !== 0) parts.push({ label: `${buff.damageMod > 0 ? '+' : ''}${buff.damageMod} DMG`, value: buff.damageMod })
  if (buff.acMod !== 0) parts.push({ label: `${buff.acMod > 0 ? '+' : ''}${buff.acMod} AC`, value: buff.acMod })
  if (typeof buff.saveMod === 'number' && buff.saveMod !== 0) {
    parts.push({ label: `${buff.saveMod > 0 ? '+' : ''}${buff.saveMod} SAVES`, value: buff.saveMod })
  } else if (typeof buff.saveMod === 'object' && buff.saveMod) {
    const total = (buff.saveMod.fort ?? 0) + (buff.saveMod.ref ?? 0) + (buff.saveMod.will ?? 0)
    if (total !== 0) parts.push({ label: `${total > 0 ? '+' : ''}${total} SAVES`, value: total })
  }
  if (buff.abilityMods) {
    for (const [key, value] of Object.entries(buff.abilityMods) as [string, number][]) {
      if (value) parts.push({ label: `${value > 0 ? '+' : ''}${value} ${key.toUpperCase()}`, value })
    }
  }
  if (buff.extraDamageDice) parts.push({ label: `+${buff.extraDamageDice}`, value: 1 })
  return parts
}

export function CombatPage({ embedded = false }: { embedded?: boolean }) {
  const char = useCharacterStore((s) => s.activeCharacter())
  const session = useSessionStore((s) => (char ? s.getSession(char.id) : null))
  const {
    toggleBuff,
    adjustHp,
    initSession,
    setAmmo,
    setSummon,
    adjustSummonHp,
    clearSummon,
    adjustCompanionHp,
    spendResource,
    recoverResource,
  } = useSessionStore()
  const openRoll = useDiceStore((s) => s.openRoll)

  const [showBuffModal, setShowBuffModal] = useState(false)

  if (!char) {
    return (
      <div className="flex items-center justify-center h-64 text-tertiary font-label text-sm uppercase tracking-widest">
        No character selected
      </div>
    )
  }
  if (!session) {
    initSession(char.id, char.maxHp)
    return null
  }

  const activeBuffIds = session.activeBuffIds
  const customBuffs = session.customBuffs ?? []
  const allBuffs = [...char.buffs, ...customBuffs]
  const activeBuffs = allBuffs.filter((b) => activeBuffIds.includes(b.id))

  const effectiveAbilities = calcEffectiveAbilities(
    char.abilities,
    session.conditions,
    activeBuffs
  )

  const effectiveAc = calcEffectiveArmorClass(
    char.armorClass,
    abilityMod(char.abilities.dex),
    effectiveAbilities.mods.dex,
    session.conditions,
    activeBuffs
  )

  const effectiveSaves = calcEffectiveSaves(
    char.savingThrows,
    char.abilities,
    effectiveAbilities,
    session.conditions,
    activeBuffs
  )

  const restrictions = getActiveActionRestrictions(session.conditions)

  const twfActive = allBuffs.some((b) => b.isTwf && activeBuffIds.includes(b.id))
  const hasTwfFeat = char.feats.some((f) => /two.weapon fighting/i.test(f.name))
  const offhandPenalty = hasTwfFeat ? 0 : -4
  const extraDiceBuff = allBuffs.find((b) => b.extraDamageDice && activeBuffIds.includes(b.id))
  const sneakAttackDice = extraDiceBuff?.extraDamageDice
  const extraDiceLabel = extraDiceBuff
    ? extraDiceBuff.name.split(' ').slice(0, 2).join(' ')
    : 'Extra Dmg'

  const summonableSpells = char.spells.filter((s) => s.summonOptions && s.summonOptions.length > 0)
  const activeSummon = session.activeSummon
  const activeSummonOption = activeSummon
    ? summonableSpells.flatMap((s) => s.summonOptions ?? []).find((o) => o.id === activeSummon.optionId) ?? null
    : null

  return (
    <div className={embedded ? 'space-y-4' : 'p-4 md:p-8 space-y-6'}>
      {/* Tactical Restrictions Banner */}
      <ActionAlertBanner restrictions={restrictions} />

      {/* Defensive cockpit: AC / Saves with inspectable breakdowns + badges */}
      <section className="rounded-2xl border border-white/10 bg-[#11131c] p-3 md:p-4">
        <div className="flex flex-wrap items-stretch gap-2">
          {(
            [
              { id: 'ac-total', label: 'AC', value: effectiveAc.total, base: char.armorClass.total },
              { id: 'ac-touch', label: 'TOUCH', value: effectiveAc.touch, base: char.armorClass.touch },
              { id: 'ac-flat', label: 'FLAT', value: effectiveAc.flatFooted, base: char.armorClass.flatFooted },
            ] as const
          ).map((entry) => (
            <StatBreakdownTooltip
              key={entry.id}
              title={entry.label === 'AC' ? 'Armor Class (Total)' : entry.label === 'TOUCH' ? 'Touch Armor Class' : 'Flat-Footed Armor Class'}
              total={entry.value}
              breakdown={effectiveAc.breakdown}
              notes={effectiveAc.notes}
              trigger="click"
            >
              <div
                data-testid={`combat-${entry.id}`}
                className="min-h-[44px] min-w-[64px] px-3 py-1.5 rounded-xl border border-white/10 bg-[#181b26] hover:border-primary/40 transition-colors flex flex-col justify-center cursor-pointer tabular-nums"
              >
                <span className="font-label text-[9px] uppercase tracking-[0.2em] text-tertiary">{entry.label}</span>
                <span
                  className="font-label text-lg leading-none font-black tabular-nums"
                  style={{ color: entry.value > entry.base ? '#00daf3' : entry.value < entry.base ? '#ffb4ab' : '#f1f5f9' }}
                >
                  {entry.value}
                </span>
              </div>
            </StatBreakdownTooltip>
          ))}

          <div className="hidden sm:block w-px self-stretch bg-white/10 mx-1" />

          {(
            [
              { key: 'fort', label: 'FORT', full: 'Fortitude Save', value: effectiveSaves.fort, base: char.savingThrows.fort, breakdown: effectiveSaves.breakdowns.fortitude },
              { key: 'ref', label: 'REF', full: 'Reflex Save', value: effectiveSaves.ref, base: char.savingThrows.ref, breakdown: effectiveSaves.breakdowns.reflex },
              { key: 'will', label: 'WILL', full: 'Will Save', value: effectiveSaves.will, base: char.savingThrows.will, breakdown: effectiveSaves.breakdowns.will },
            ] as const
          ).map((save) => (
            <button
              key={save.key}
              type="button"
              onClick={() =>
                openRoll({
                  diceType: 20,
                  count: 1,
                  modifier: save.value,
                  label: save.full,
                  breakdown: save.breakdown,
                })
              }
              aria-label={`Roll ${save.full}`}
              className="min-h-[44px] min-w-[64px] px-3 py-1.5 rounded-xl border border-white/10 bg-[#181b26] hover:border-secondary/50 hover:bg-secondary/10 transition-colors flex flex-col justify-center cursor-pointer active:scale-95 tabular-nums"
            >
              <span className="font-label text-[9px] uppercase tracking-[0.2em] text-secondary">{save.label}</span>
              <StatBreakdownTooltip
                title={save.full}
                total={save.value >= 0 ? `+${save.value}` : `${save.value}`}
                breakdown={save.breakdown}
                trigger="click"
              >
                <span
                  className="font-label text-lg leading-none font-black tabular-nums text-left"
                  style={{ color: save.value > save.base ? '#00daf3' : save.value < save.base ? '#ffb4ab' : '#f1f5f9' }}
                >
                  {save.value >= 0 ? `+${save.value}` : save.value}
                </span>
              </StatBreakdownTooltip>
            </button>
          ))}
        </div>
        <DefensiveBadges compact />
      </section>

      {/* Global Buff Bar */}
      <section className="w-full">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-headline text-sm uppercase tracking-widest text-secondary font-bold">
              Combat Buff Protocols
            </h3>
            <span className="font-label text-xs text-tertiary tabular-nums">
              ({activeBuffIds.length} Active)
            </span>
          </div>
          <button
            onClick={() => setShowBuffModal(true)}
            className="px-3 py-2 bg-primary/10 border border-primary/40 text-primary font-label text-xs uppercase tracking-wider rounded-xl hover:bg-primary/20 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            <span className="hidden sm:inline">Manage Buffs & Presets</span>
            <span className="sm:hidden">Buffs</span>
          </button>
        </div>

        <div className={`grid grid-cols-1 ${embedded ? 'xl:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-3`}>
          {allBuffs.map((buff) => {
            const isActive = activeBuffIds.includes(buff.id)
            const hex =
              { primary: '#00f0ff', secondary: '#d946ef', error: '#ff4b60' }[buff.color ?? 'primary'] ??
              '#00f0ff'
            const modifiers = buffModifierParts(buff)
            const resource = resolveBuffResource(buff, char.dailyResources)
            const spent = resource ? session.spentResources[resource.id] ?? 0 : 0
            const remaining = resource ? Math.max(0, resource.total - spent) : 0

            return (
              <div
                key={buff.id}
                className="flex flex-col border rounded-xl transition-all bg-[#11131c] hover:bg-[#181b26]"
                style={
                  isActive
                    ? {
                        borderColor: hex,
                        backgroundColor: `${hex}1a`,
                        boxShadow: `0 0 20px ${hex}40`,
                      }
                    : { borderColor: 'rgba(255,255,255,0.08)' }
                }
              >
                <button
                  type="button"
                  onClick={() => toggleBuff(char.id, buff.id)}
                  className="flex items-center justify-between p-3.5 rounded-xl backdrop-blur-sm transition-all cursor-pointer text-left"
                  style={isActive ? { boxShadow: `0 0 18px ${hex}40` } : undefined}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all"
                      style={
                        isActive
                          ? { backgroundColor: hex, boxShadow: `0 0 8px ${hex}` }
                          : { backgroundColor: 'rgba(255,255,255,0.2)' }
                      }
                    />
                    <div className="min-w-0">
                      <p
                        className="font-headline text-sm font-bold uppercase tracking-wider truncate"
                        style={{ color: isActive ? hex : undefined }}
                      >
                        {buff.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
                        {modifiers.length > 0 ? modifiers.map((mod, index) => (
                          <span key={mod.label} className="contents">
                            {index > 0 && <span className="font-label text-[10px] text-tertiary/40">|</span>}
                            <span
                              className="font-label text-[10px] font-bold tabular-nums"
                              style={{ color: mod.value > 0 ? '#00daf3' : '#ffb4ab' }}
                            >
                              {mod.label}
                            </span>
                          </span>
                        )) : (
                          <span className="font-label text-[10px] text-tertiary">No numeric modifiers</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span
                    className="font-label text-[10px] uppercase tracking-widest px-2.5 py-0.5 flex-shrink-0 border rounded-full transition-all ml-2 font-bold"
                    style={
                      isActive
                        ? { color: hex, borderColor: hex, boxShadow: `0 0 8px ${hex}` }
                        : { color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.1)' }
                    }
                  >
                    {isActive ? 'ON' : 'OFF'}
                  </span>
                </button>

                {resource && (
                  <div className="flex items-center justify-between gap-2 px-3.5 pb-3 pt-0.5 border-t border-white/5">
                    <div className="min-w-0">
                      <p className="font-label text-[9px] uppercase tracking-[0.16em] text-tertiary truncate">
                        {resource.name}
                      </p>
                      <div className="flex items-center gap-1 mt-1" aria-label={`${resource.name} pips`}>
                        {Array.from({ length: resource.total }).map((_, index) => (
                          <span
                            key={index}
                            className={`h-1.5 w-2 rounded-sm tabular-nums ${
                              index < remaining ? 'bg-primary shadow-[0_0_5px_rgba(0,240,255,0.5)]' : 'bg-white/10'
                            }`}
                          />
                        ))}
                        <span className="font-label text-[9px] text-tertiary ml-1 tabular-nums">
                          {remaining}/{resource.total}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        disabled={remaining >= resource.total}
                        onClick={() => recoverResource(char.id, resource.id)}
                        aria-label={`Recover ${resource.name}`}
                        className="min-h-[44px] min-w-[36px] rounded-lg border border-white/10 text-tertiary hover:text-primary hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                      <button
                        type="button"
                        disabled={remaining <= 0}
                        onClick={() => spendResource(char.id, resource.id, resource.total)}
                        aria-label={`Spend ${resource.name}`}
                        className="min-h-[44px] min-w-[36px] rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* HP Widget (desktop cockpit keeps it; embedded mode relies on HUD) */}
      {!embedded && (
        <CombatHPWidget
          hp={session.currentHp}
          maxHp={char.maxHp}
          ac={effectiveAc.total}
          onAdjust={(d) => adjustHp(char.id, d, char.maxHp)}
        />
      )}

      {/* Contextual combat features by action economy */}
      <ContextualCombatFeatures compact={embedded} limit={embedded ? 8 : undefined} />

      {/* Summon Ally Picker */}
      {summonableSpells.length > 0 && (
        <SummonSection
          spells={summonableSpells}
          activeSummonId={activeSummon?.optionId ?? null}
          onSelect={(spellId, opt) => {
            if (activeSummon?.optionId === opt.id) {
              clearSummon(char.id)
            } else {
              setSummon(char.id, { spellId, optionId: opt.id, currentHp: opt.hp })
            }
          }}
        />
      )}

      {/* Weapon Cards */}
      <div className={`grid grid-cols-1 ${embedded ? '' : 'xl:grid-cols-2'} gap-6`}>
        {char.weapons.map((weapon) => {
          const effective = calcEffectiveWeaponStats(
            weapon,
            char.abilities,
            effectiveAbilities,
            session.conditions,
            allBuffs,
            activeBuffIds
          )
          const ammo =
            weapon.type === 'ranged'
              ? (session.ammo[weapon.id] ?? weapon.currentAmmo ?? weapon.maxAmmo ?? 0)
              : undefined
          return (
            <WeaponCard
              key={weapon.id}
              weapon={weapon}
              effective={effective}
              ammo={ammo}
              maxAmmo={weapon.maxAmmo}
              twfActive={twfActive}
              offhandPenalty={offhandPenalty}
              sneakAttackDice={sneakAttackDice}
              extraDiceLabel={extraDiceLabel}
              onAttackRoll={() =>
                openRoll({
                  diceType: 20,
                  count: 1,
                  modifier: effective.attackBonus[0],
                  label: `${weapon.name} Attack`,
                  critRange: weapon.critRange,
                  breakdown: effective.attackBreakdown,
                })
              }
              onOffhandRoll={() =>
                openRoll({
                  diceType: 20,
                  count: 1,
                  modifier: effective.attackBonus[0] + offhandPenalty,
                  label: `${weapon.name} Off-hand`,
                  critRange: weapon.critRange,
                  breakdown: [
                    ...effective.attackBreakdown,
                    { label: 'Off-hand Penalty', value: offhandPenalty },
                  ],
                })
              }
              onDamageRoll={() => {
                const { count, sides, bonus } = parseDiceFormula(weapon.damageDice)
                openRoll({
                  diceType: sides,
                  count,
                  modifier: effective.damageBonus + bonus,
                  label: `${weapon.name} Damage`,
                  breakdown: effective.damageBreakdown,
                })
              }}
              onSneakAttackRoll={
                sneakAttackDice
                  ? () => {
                      const { count, sides } = parseDiceFormula(sneakAttackDice)
                      openRoll({
                        diceType: sides,
                        count,
                        modifier: 0,
                        label: `${extraDiceLabel} Roll`,
                      })
                    }
                  : undefined
              }
              onAmmoChange={
                weapon.type === 'ranged' ? (v) => setAmmo(char.id, weapon.id, v) : undefined
              }
            />
          )
        })}
      </div>

      {/* Combat spell matrix + spell-to-buff activation */}
      {char.spells.length > 0 && (
        <CombatSpellsSection compact={embedded} limit={embedded ? 6 : undefined} />
      )}

      {/* Summoned Creature Panel */}
      {activeSummonOption && activeSummon && (
        <>
          <div className="relative flex items-center gap-4">
            <div className="flex-1 h-px bg-primary/40" />
            <span className="font-label text-[10px] text-primary uppercase tracking-[0.25em] flex-shrink-0">
              Summoned Ally
            </span>
            <div className="flex-1 h-px bg-primary/40" />
          </div>

          <SummonedCreaturePanel
            option={activeSummonOption}
            currentHp={activeSummon.currentHp}
            onAdjustHp={(d) => adjustSummonHp(char.id, d)}
            onDismiss={() => clearSummon(char.id)}
            openRoll={openRoll}
          />
        </>
      )}

      {/* Bonded Companion Combat Section */}
      {char.companions && char.companions.length > 0 && (
        (() => {
          const comp = char.companions[0]
          const compHp = session.companionHp?.[comp.id] ?? comp.maxHp
          const hpPct = Math.max(0, Math.min(100, (compHp / comp.maxHp) * 100))

          return (
            <div className="space-y-3">
              <div className="relative flex items-center gap-4">
                <div className="flex-1 h-px bg-primary/30" />
                <span className="font-label text-[10px] text-primary uppercase tracking-[0.25em] flex-shrink-0 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">pets</span>
                  Bonded Companion — {comp.name}
                </span>
                <div className="flex-1 h-px bg-primary/30" />
              </div>

              <div className="bg-surface-container/90 backdrop-blur-sm border border-white/10 rounded-2xl p-5 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-surface-container-high border border-primary/30 rounded-xl overflow-hidden flex-shrink-0">
                      {comp.portrait ? (
                        <img src={comp.portrait} alt={comp.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-primary flex items-center justify-center h-full w-full">
                          pets
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-headline text-lg font-bold text-white">{comp.name}</h4>
                      <p className="font-label text-[10px] text-tertiary uppercase tracking-wider">
                        {comp.type.replace('_', ' ')} • {comp.species} • AC {comp.armorClass.total}
                      </p>
                    </div>
                  </div>

                  {/* HP bar and adjusters */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => adjustCompanionHp(char.id, comp.id, -1, comp.maxHp)}
                      className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-error-container text-primary hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer border border-white/5 transition-colors"
                      title="-1 HP"
                    >
                      -
                    </button>
                    <div className="text-center min-w-[70px]">
                      <span className="font-label text-base font-bold text-primary">{compHp}</span>
                      <span className="font-label text-xs text-tertiary"> / {comp.maxHp} HP</span>
                      <div className="w-full h-1.5 bg-surface-container-lowest rounded-full overflow-hidden mt-1 border border-white/5">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-200"
                          style={{ width: `${hpPct}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => adjustCompanionHp(char.id, comp.id, 1, comp.maxHp)}
                      className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-primary-container text-primary hover:text-black flex items-center justify-center font-bold text-sm cursor-pointer border border-white/5 transition-colors"
                      title="+1 HP"
                    >
                      +
                    </button>

                    <Link
                      to="/companion"
                      className="ml-2 px-3 py-1.5 bg-primary/10 border border-primary text-primary font-label text-[10px] uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-1"
                    >
                      Sheet
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </Link>
                  </div>
                </div>

                {/* Natural Attacks quick roll */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-outline-variant/10">
                  {comp.attacks.map((atk) => {
                    const parsed = parseDiceFormula(atk.damageDice)
                    const totalDmgMod = (atk.damageBonus ?? 0) + parsed.bonus
                    const isTouch = atk.damageDice.toLowerCase().includes('spell')

                    return (
                      <div
                        key={atk.name}
                        className="bg-surface-container-high p-3 flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-headline text-xs font-bold text-on-surface">{atk.name}</p>
                          <p className="font-label text-[10px] text-tertiary">
                            {atk.damageDice}{!isTouch && totalDmgMod > 0 ? `+${totalDmgMod}` : ''}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              openRoll({
                                diceType: 20,
                                count: 1,
                                modifier: atk.bonus,
                                label: `${comp.name} — ${atk.name} Atk`,
                                critRange: atk.critRange ?? 20,
                              })
                            }
                            className="px-2.5 py-1 bg-primary text-on-primary font-label text-xs font-bold uppercase hover:shadow-[0_0_10px_rgba(0,218,243,0.3)] transition-all cursor-pointer"
                          >
                            +{atk.bonus}
                          </button>
                          <button
                            onClick={() => {
                              if (isTouch) {
                                openRoll({
                                  diceType: 20,
                                  count: 1,
                                  modifier: atk.bonus,
                                  label: `${comp.name} — Touch Attack`,
                                })
                              } else {
                                openRoll({
                                  diceType: parsed.sides,
                                  count: parsed.count,
                                  modifier: totalDmgMod,
                                  label: `${comp.name} — ${atk.name} Dmg`,
                                })
                              }
                            }}
                            className="px-2.5 py-1 bg-surface-container-lowest border border-outline-variant/30 text-secondary hover:bg-surface-container-highest font-label text-xs font-bold transition-all cursor-pointer"
                          >
                            Dmg
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })()
      )}

      {/* Unified Buff Manager Modal */}
      <BuffManagerModal
        isOpen={showBuffModal}
        onClose={() => setShowBuffModal(false)}
        initialTab="presets"
      />
    </div>
  )
}
