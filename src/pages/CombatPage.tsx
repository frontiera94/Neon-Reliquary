import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import {
  calcEffectiveAbilities,
  calcEffectiveArmorClass,
  calcEffectiveWeaponStats,
  getActiveActionRestrictions,
} from '../lib/stat-calc'
import { abilityMod, parseDiceFormula } from '../lib/dice-engine'
import { CombatHPWidget } from '../components/combat/CombatHPWidget'
import { SummonSection } from '../components/combat/SummonSection'
import { SummonedCreaturePanel } from '../components/combat/SummonedCreaturePanel'
import { WeaponCard } from '../components/combat/WeaponCard'
import { ActionAlertBanner } from '../components/combat/ActionAlertBanner'
import { BuffManagerModal } from '../components/combat/BuffManagerModal'

export function CombatPage() {
  const char = useCharacterStore((s) => s.activeCharacter())
  const session = useSessionStore((s) => (char ? s.getSession(char.id) : null))
  const { toggleBuff, adjustHp, initSession, setAmmo, setSummon, adjustSummonHp, clearSummon, adjustCompanionHp } =
    useSessionStore()
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
    <div className="p-4 md:p-8 space-y-6">
      {/* Tactical Restrictions Banner */}
      <ActionAlertBanner restrictions={restrictions} />

      {/* Global Buff Bar */}
      <section className="w-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-headline text-sm uppercase tracking-widest text-secondary font-bold">
              Combat Buff Protocols
            </h3>
            <span className="font-label text-xs text-tertiary">
              ({activeBuffIds.length} Active)
            </span>
          </div>
          <button
            onClick={() => setShowBuffModal(true)}
            className="px-3 py-1.5 bg-primary/10 border border-primary text-primary font-label text-xs uppercase tracking-wider hover:bg-primary/20 hover:shadow-[0_0_15px_rgba(0,218,243,0.3)] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            Manage Buffs & Presets
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allBuffs.map((buff) => {
            const isActive = activeBuffIds.includes(buff.id)
            const hex =
              { primary: '#00daf3', secondary: '#e9c349', error: '#ffb4ab' }[buff.color ?? 'primary'] ??
              '#00daf3'
            return (
              <button
                key={buff.id}
                onClick={() => toggleBuff(char.id, buff.id)}
                className="flex items-center justify-between p-4 border transition-all cursor-pointer text-left bg-surface-container hover:bg-surface-container-high"
                style={
                  isActive
                    ? {
                        borderColor: hex,
                        backgroundColor: `${hex}1a`,
                        boxShadow: `0 0 20px ${hex}40`,
                      }
                    : { borderColor: 'rgba(255,255,255,0.1)' }
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-2.5 h-2.5 flex-shrink-0 transition-all"
                    style={
                      isActive
                        ? { backgroundColor: hex, boxShadow: `0 0 8px ${hex}` }
                        : { backgroundColor: 'rgba(255,255,255,0.15)' }
                    }
                  />
                  <div className="min-w-0">
                    <p
                      className="font-headline text-sm font-bold uppercase tracking-wider truncate"
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
                  className="font-label text-[10px] uppercase tracking-widest px-2.5 py-1 flex-shrink-0 border transition-all ml-2"
                  style={
                    isActive
                      ? { color: hex, borderColor: hex, boxShadow: `0 0 8px ${hex}` }
                      : { color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
                  {isActive ? 'ON' : 'OFF'}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* HP Widget */}
      <CombatHPWidget
        hp={session.currentHp}
        maxHp={char.maxHp}
        ac={effectiveAc.total}
        onAdjust={(d) => adjustHp(char.id, d, char.maxHp)}
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

      {/* Weapon Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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

              <div className="bg-surface-container border-l-4 border-primary p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-surface-container-high border border-primary/20 overflow-hidden flex-shrink-0">
                      {comp.portrait ? (
                        <img src={comp.portrait} alt={comp.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-primary flex items-center justify-center h-full w-full">
                          pets
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-headline text-lg font-bold text-on-surface">{comp.name}</h4>
                      <p className="font-label text-[10px] text-tertiary uppercase tracking-wider">
                        {comp.type.replace('_', ' ')} • {comp.species} • AC {comp.armorClass.total}
                      </p>
                    </div>
                  </div>

                  {/* HP bar and adjusters */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => adjustCompanionHp(char.id, comp.id, -1, comp.maxHp)}
                      className="w-8 h-8 bg-surface-container-high hover:bg-error-container text-primary hover:text-on-error flex items-center justify-center font-bold text-sm cursor-pointer"
                      title="-1 HP"
                    >
                      -
                    </button>
                    <div className="text-center min-w-[70px]">
                      <span className="font-label text-base font-bold text-primary">{compHp}</span>
                      <span className="font-label text-xs text-tertiary"> / {comp.maxHp} HP</span>
                      <div className="w-full h-1 bg-surface-container-lowest mt-1">
                        <div
                          className="h-full bg-primary transition-all duration-200"
                          style={{ width: `${hpPct}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => adjustCompanionHp(char.id, comp.id, 1, comp.maxHp)}
                      className="w-8 h-8 bg-surface-container-high hover:bg-primary-container text-primary hover:text-on-primary flex items-center justify-center font-bold text-sm cursor-pointer"
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
