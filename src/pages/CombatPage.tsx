import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import {
  calcEffectiveAbilities,
  calcEffectiveArmorClass,
  calcEffectiveWeaponStats,
  calcCombatManeuvers,
  getActiveActionRestrictions,
} from '../lib/stat-calc'
import { abilityMod, parseDiceFormula } from '../lib/dice-engine'
import { formatDamage } from '../lib/combat-calc'
import { SummonSection } from '../components/combat/SummonSection'
import { SummonedCreaturePanel } from '../components/combat/SummonedCreaturePanel'
import { WeaponCard } from '../components/combat/WeaponCard'
import { ActionAlertBanner } from '../components/combat/ActionAlertBanner'
import { BuffManagerModal } from '../components/combat/BuffManagerModal'
import { CombatManeuversPanel } from '../components/combat/CombatManeuversPanel'
import { FullAttackModal } from '../components/combat/FullAttackModal'
import { CombatSpellsSection } from '../components/combat/CombatSpellsSection'
import { CombatTacticalHUD } from '../components/combat/CombatTacticalHUD'
import type { Weapon } from '../types/combat'

export function CombatPage() {
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
    toggleRoundAction,
    resetRoundActions,
    resetCombatRound,
    nextRound,
    spendSpellSlot,
    recoverSpellSlot,
  } = useSessionStore()
  const openRoll = useDiceStore((s) => s.openRoll)

  const [showBuffModal, setShowBuffModal] = useState(false)
  const [fullAttackWeapon, setFullAttackWeapon] = useState<Weapon | null>(null)

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

  const effectiveAbilities = calcEffectiveAbilities(
    char.abilities,
    session.conditions,
    allBuffs.filter((b) => activeBuffIds.includes(b.id))
  )

  const effectiveAc = calcEffectiveArmorClass(
    char.armorClass,
    abilityMod(char.abilities.dex),
    effectiveAbilities.mods.dex,
    session.conditions,
    allBuffs.filter((b) => activeBuffIds.includes(b.id))
  )

  const restrictions = getActiveActionRestrictions(session.conditions)

  const activeBuffsList = allBuffs.filter((b) => activeBuffIds.includes(b.id))

  const maneuversCalc = calcCombatManeuvers(
    char,
    effectiveAbilities,
    session.conditions,
    activeBuffsList
  )

  const twfActive = allBuffs.some((b) => b.isTwf && activeBuffIds.includes(b.id))
  const hasteActive = allBuffs.some(
    (b) => (b.id === 'haste' || b.id === 'preset-haste' || /haste/i.test(b.name)) && activeBuffIds.includes(b.id)
  )
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
    <div className="space-y-6">
      {/* Sticky Tactical Cockpit HUD */}
      <div className="sticky top-[65px] md:top-[69px] z-30 bg-surface/95 backdrop-blur-xl border-b border-white/10 px-4 md:px-8 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <CombatTacticalHUD
          hp={session.currentHp}
          maxHp={char.maxHp}
          ac={effectiveAc.total}
          cmb={maneuversCalc.cmb}
          cmd={maneuversCalc.cmd}
          currentRound={session.currentRound ?? 1}
          actionEconomy={session.actionEconomy}
          onAdjustHp={(d) => adjustHp(char.id, d, char.maxHp)}
          onToggleAction={(act) => toggleRoundAction(char.id, act)}
          onNewTurn={() => {
            resetRoundActions(char.id)
            nextRound(char.id)
          }}
          onResetRound={() => resetCombatRound(char.id)}
        />
      </div>

      <div className="p-4 md:p-8 pt-0 space-y-6">
        {/* Tactical Restrictions Banner */}
        <ActionAlertBanner restrictions={restrictions} />

        {/* 2-Column Tactical Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Equipped Arsenal & Attacks, Summoned Ally, Companion */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">swords</span>
                <h3 className="font-headline text-sm uppercase tracking-widest text-primary font-bold">
                  Equipped Arsenal & Attacks
                </h3>
              </div>
              <span className="font-label text-xs text-tertiary">
                ({char.weapons.length} Ready)
              </span>
            </div>

            {/* Weapon Cards */}
            <div className="space-y-6">
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
                    hasteActive={hasteActive}
                    sneakAttackDice={sneakAttackDice}
                    extraDiceLabel={extraDiceLabel}
                    onAttackRoll={(attackIndex = 0) => {
                      const bonus = effective.attackBonus[attackIndex] ?? effective.attackBonus[0]
                      const label =
                        effective.attackBonus.length > 1
                          ? `${weapon.name} ${attackIndex + 1}° Attack`
                          : `${weapon.name} Attack`

                      const { count: dmgCount, sides: dmgSides, bonus: dmgBonus } = parseDiceFormula(weapon.damageDice)
                      const followUpRoll = {
                        diceType: dmgSides as any,
                        count: dmgCount,
                        modifier: effective.damageBonus + dmgBonus,
                        label: `${weapon.name} Damage`,
                        breakdown: effective.damageBreakdown,
                      }

                      if (weapon.type === 'ranged' && ammo !== undefined && ammo > 0) {
                        setAmmo(char.id, weapon.id, ammo - 1)
                      }

                      openRoll({
                        diceType: 20,
                        count: 1,
                        modifier: bonus,
                        label,
                        critRange: weapon.critRange,
                        critMultiplier: weapon.critMultiplier,
                        breakdown: effective.attackBreakdown,
                        followUpRoll,
                        followUpLabel: formatDamage(weapon.damageDice, effective.damageBonus),
                      })
                    }}
                    onOffhandRoll={() => {
                      const { count: dmgCount, sides: dmgSides, bonus: dmgBonus } = parseDiceFormula(weapon.damageDice)
                      const followUpRoll = {
                        diceType: dmgSides as any,
                        count: dmgCount,
                        modifier: effective.damageBonus + dmgBonus,
                        label: `${weapon.name} Damage`,
                        breakdown: effective.damageBreakdown,
                      }

                      openRoll({
                        diceType: 20,
                        count: 1,
                        modifier: effective.attackBonus[0] + offhandPenalty,
                        label: `${weapon.name} Off-hand`,
                        critRange: weapon.critRange,
                        critMultiplier: weapon.critMultiplier,
                        breakdown: [
                          ...effective.attackBreakdown,
                          { label: 'Off-hand Penalty', value: offhandPenalty },
                        ],
                        followUpRoll,
                        followUpLabel: formatDamage(weapon.damageDice, effective.damageBonus),
                      })
                    }}
                    onFullAttackRoll={() => setFullAttackWeapon(weapon)}
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

            {/* Combat Spells Section (positioned under weapons in primary action column) */}
            {char.spells && char.spells.length > 0 && (
              <CombatSpellsSection
                spells={char.spells}
                spellSlots={char.spellSlots}
                preparedSpellIds={session.preparedSpellIds}
                spentSpellSlots={session.spentSpellSlots}
                charClass={char.class}
                charLevel={char.level}
                abilities={effectiveAbilities.scores}
                baseAttackBonus={char.baseAttackBonus}
                spellFailureChance={char.armorClass.spellFailureChance}
                feats={char.feats}
                openRoll={openRoll}
                onSpendSlot={(lvl, max) => spendSpellSlot(char.id, lvl, max)}
                onRecoverSlot={(lvl) => recoverSpellSlot(char.id, lvl)}
              />
            )}

            {/* Summoned Creature Panel */}
            {activeSummonOption && activeSummon && (
              <div className="space-y-4">
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
              </div>
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
          </div>

          {/* Right Column (5 cols): Combat Buff Protocols, Combat Spells & Invocations, Combat Maneuvers & Tactics, Summon Ally Picker */}
          <div className="lg:col-span-5 space-y-6">
            {/* Global Buff Bar */}
            <section className="w-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-lg">bolt</span>
                  <h3 className="font-headline text-sm uppercase tracking-widest text-secondary font-bold">
                    Combat Buff Protocols
                  </h3>
                  <span className="font-label text-xs text-tertiary">
                    ({activeBuffIds.length} Active)
                  </span>
                </div>
                <button
                  onClick={() => setShowBuffModal(true)}
                  className="px-3 py-1.5 bg-primary/10 border border-primary/40 text-primary font-label text-xs uppercase tracking-wider rounded-xl hover:bg-primary/20 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">tune</span>
                  Manage Buffs & Presets
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                {allBuffs.map((buff) => {
                  const isActive = activeBuffIds.includes(buff.id)
                  const hex =
                    { primary: '#00f0ff', secondary: '#d946ef', error: '#ff4b60' }[buff.color ?? 'primary'] ??
                    '#00f0ff'
                  return (
                    <button
                      key={buff.id}
                      onClick={() => toggleBuff(char.id, buff.id)}
                      className="flex items-center justify-between p-3 border rounded-xl transition-all cursor-pointer text-left bg-surface-container/90 backdrop-blur-sm hover:bg-surface-container-high active:scale-[0.99]"
                      style={
                        isActive
                          ? {
                              borderColor: hex,
                              backgroundColor: `${hex}1a`,
                              boxShadow: `0 0 16px ${hex}35`,
                            }
                          : { borderColor: 'rgba(255,255,255,0.08)' }
                      }
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
                            className="font-headline text-xs md:text-sm font-bold uppercase tracking-wider truncate"
                            style={{ color: isActive ? hex : undefined }}
                          >
                            {buff.name}
                          </p>
                          <p
                            className="font-label text-[11px] mt-0.5 truncate"
                            style={{ color: isActive ? hex : undefined }}
                          >
                            {isActive ? (
                              [
                                buff.attackMod !== 0
                                  ? `${buff.attackMod > 0 ? '+' : ''}${buff.attackMod} Att`
                                  : '',
                                buff.damageMod !== 0 ? `+${buff.damageMod} Dmg` : '',
                                buff.acMod !== 0 ? `${buff.acMod > 0 ? '+' : ''}${buff.acMod} AC` : '',
                                buff.extraDamageDice ? `+${buff.extraDamageDice}` : '',
                              ]
                                .filter(Boolean)
                                .join(' / ') || 'Active'
                            ) : (
                              <span className="text-tertiary">Inactive</span>
                            )}
                          </p>
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
                  )
                })}
              </div>
            </section>

            {/* Combat Maneuvers & Tactics Panel */}
            <CombatManeuversPanel
              maneuversCalc={maneuversCalc}
              openRoll={openRoll}
            />

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
          </div>
        </div>
      </div>

      {/* Full Attack Routine Modal */}
      {fullAttackWeapon && (
        <FullAttackModal
          isOpen={!!fullAttackWeapon}
          onClose={() => setFullAttackWeapon(null)}
          weapon={fullAttackWeapon}
          effective={calcEffectiveWeaponStats(
            fullAttackWeapon,
            char.abilities,
            effectiveAbilities,
            session.conditions,
            allBuffs,
            activeBuffIds
          )}
          twfActive={twfActive}
          offhandPenalty={offhandPenalty}
          hasteActive={hasteActive}
          sneakAttackDice={sneakAttackDice}
          extraDiceLabel={extraDiceLabel}
          onRollDamage={(dmgLabel, dmgMod, isCritical) => {
            const { count, sides } = parseDiceFormula(fullAttackWeapon.damageDice)
            const finalCount = isCritical ? count * fullAttackWeapon.critMultiplier : count
            const finalMod = isCritical ? dmgMod * fullAttackWeapon.critMultiplier : dmgMod
            openRoll({
              diceType: sides,
              count: finalCount,
              modifier: finalMod,
              label: isCritical ? `${dmgLabel} [CRIT x${fullAttackWeapon.critMultiplier}]` : dmgLabel,
            })
          }}
          onRollExtraDice={
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
        />
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
