import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import {
  calcEffectiveAbilities,
  calcEffectiveWeaponStats,
  calcCombatManeuvers,
  getActiveActionRestrictions,
} from '../lib/stat-calc'
import { parseDiceFormula } from '../lib/dice-engine'
import { getSpellAvailability } from '../lib/spell-availability'
import { formatDamage } from '../lib/combat-calc'
import { SummonSection } from '../components/combat/SummonSection'
import { SummonedCreaturePanel } from '../components/combat/SummonedCreaturePanel'
import { WeaponCard } from '../components/combat/WeaponCard'
import { ActionAlertBanner } from '../components/combat/ActionAlertBanner'
import { BuffManagerModal } from '../components/combat/BuffManagerModal'
import { CombatManeuversPanel } from '../components/combat/CombatManeuversPanel'
import { FullAttackModal } from '../components/combat/FullAttackModal'
import { CombatSpellsSection } from '../components/combat/CombatSpellsSection'
import { ContextualCombatFeatures, DefensiveBadges } from '../components/combat/ContextualCombatFeatures'
import { DailyResourcePips } from '../components/combat/BuffResourceToggle'
import { buffModifierTokens, modifierColor } from '../lib/buff-summary'
import type { Weapon } from '../types/combat'
import type { DiceType } from '../types/dice'

export function CombatPage({ embedded = false }: { embedded?: boolean } = {}) {
  const char = useCharacterStore((s) => s.activeCharacter())
  const session = useSessionStore((s) => (char ? s.getSession(char.id) : null))
  const {
    toggleBuff,
    initSession,
    setAmmo,
    setSummon,
    adjustSummonHp,
    clearSummon,
    setActiveCompanion,
    adjustCompanionHp,
    spendSpellSlot,
    recoverSpellSlot,
    spendResource,
  } = useSessionStore()
  const openRoll = useDiceStore((s) => s.openRoll)

  const [showBuffModal, setShowBuffModal] = useState(false)
  const [fullAttackWeapon, setFullAttackWeapon] = useState<Weapon | null>(null)

  if (!char) {
    return (
      <div className="flex h-64 items-center justify-center font-label text-sm uppercase tracking-widest text-tertiary">
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

  const restrictions = getActiveActionRestrictions(session.conditions)
  const spellAvailability = getSpellAvailability(char, session)

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

  const summonableSpells = char.spells.filter((s) => s.summonOptions && s.summonOptions.length > 0)
  const activeSummon = session.activeSummon
  const activeSummonOption = activeSummon
    ? summonableSpells.flatMap((s) => s.summonOptions ?? []).find((o) => o.id === activeSummon.optionId) ?? null
    : null

  const fullAttackEffective = fullAttackWeapon
    ? calcEffectiveWeaponStats(
        fullAttackWeapon,
        char.abilities,
        effectiveAbilities,
        session.conditions,
        allBuffs,
        activeBuffIds
      )
    : null

  // Companion overview — resolved dynamically through activeCompanionId
  const companions = char.companions ?? []
  const activeCompanionId = session.activeCompanionId ?? companions[0]?.id
  const companion = companions.find((c) => c.id === activeCompanionId) ?? companions[0]
  const companionHp = companion ? session.companionHp?.[companion.id] ?? companion.maxHp : 0
  const companionHpPct = companion ? Math.max(0, Math.min(100, (companionHp / companion.maxHp) * 100)) : 0
  const companionConditions = companion ? session.companionConditions?.[companion.id] ?? [] : []
  const conditionAttackMod =
    (companionConditions.includes('shaken') || companionConditions.includes('frightened') ? -2 : 0) +
    (companionConditions.includes('sickened') ? -2 : 0) +
    (companionConditions.includes('prone') ? -4 : 0)
  const conditionDamageMod = companionConditions.includes('sickened') ? -2 : 0

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-4 px-4 py-4 md:px-8 md:py-6'}>
      {/* Restrictions only appear when a condition actually limits actions. */}
      <ActionAlertBanner restrictions={restrictions} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start">
        {/* Primary column — what you do on your turn. */}
        <div className="space-y-4 xl:col-span-7">
          <section aria-labelledby="attacks-heading">
            <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h2 id="attacks-heading" className="font-headline text-lg font-bold text-white">
                Attacks
              </h2>
              <span className="font-label text-[10px] uppercase tracking-wider text-tertiary">
                {char.weapons.length} equipped
              </span>
            </div>

            <div className="space-y-2.5">
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
                    sneakAttackDice={effective.extraDamageDice}
                    extraDiceLabel={effective.extraDiceLabel ?? 'Extra Dmg'}
                    onAttackRoll={(attackIndex = 0) => {
                      const bonus = effective.attackBonus[attackIndex] ?? effective.attackBonus[0]
                      const label =
                        effective.attackBonus.length > 1
                          ? `${weapon.name} ${attackIndex + 1}° Attack`
                          : `${weapon.name} Attack`

                      const { count: dmgCount, sides: dmgSides, bonus: dmgBonus } = parseDiceFormula(weapon.damageDice)
                      const followUpRoll = {
                        diceType: dmgSides as DiceType,
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
                      const strMod = effectiveAbilities.mods.str
                      const offhandDmgPenalty = strMod > 0 ? Math.ceil(strMod * 0.5) : 0
                      const offhandDmgBonus = effective.damageBonus - offhandDmgPenalty
                      const followUpRoll = {
                        diceType: dmgSides as DiceType,
                        count: dmgCount,
                        modifier: offhandDmgBonus + dmgBonus,
                        label: `${weapon.name} Damage (Off-hand)`,
                        breakdown: [
                          ...effective.damageBreakdown,
                          ...(offhandDmgPenalty > 0
                            ? [{ label: 'Off-hand Str (0.5x)', value: -offhandDmgPenalty }]
                            : []),
                        ],
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
                        followUpLabel: formatDamage(weapon.damageDice, offhandDmgBonus),
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
                      effective.extraDamageDice
                        ? () => {
                            const { count, sides } = parseDiceFormula(effective.extraDamageDice!)
                            openRoll({
                              diceType: sides,
                              count,
                              modifier: 0,
                              label: `${effective.extraDiceLabel ?? 'Extra Dmg'} Roll`,
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
          </section>

          {/* Spellbook stays folded: the page is about resolving the turn. */}
          {char.spells && char.spells.length > 0 && (
            <CombatSpellsSection
              spells={char.spells}
              spellSlots={char.spellSlots}
              preparedSpellIds={session.preparedSpellIds}
              preparedSpells={session.preparedSpells}
              spentSpellSlots={session.spentSpellSlots}
              spentResources={session.spentResources}
              dailyResources={char.dailyResources}
              charClass={char.class}
              charLevel={char.level}
              abilities={effectiveAbilities.scores}
              baseAttackBonus={char.baseAttackBonus}
              spellFailureChance={char.armorClass.spellFailureChance}
              feats={char.feats}
              spellAvailability={spellAvailability}
              defaultExpanded={false}
              openRoll={openRoll}
              onSpendSlot={(lvl, max) => spendSpellSlot(char.id, lvl, max)}
              onRecoverSlot={(lvl) => recoverSpellSlot(char.id, lvl)}
              onSpendResource={(resourceId, max) => spendResource(char.id, resourceId, max)}
            />
          )}

          <CombatManeuversPanel maneuversCalc={maneuversCalc} openRoll={openRoll} />

          {/* Summoned ally */}
          {activeSummonOption && activeSummon && (
            <section aria-labelledby="summon-heading" className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <h2 id="summon-heading" className="font-headline text-base font-bold text-white">
                    Summoned ally
                  </h2>
                  <span className="font-label text-[10px] uppercase tracking-wider text-primary">
                    active
                  </span>
                </div>
              </div>
              <SummonedCreaturePanel
                option={activeSummonOption}
                currentHp={activeSummon.currentHp}
                onAdjustHp={(d) => adjustSummonHp(char.id, d)}
                onDismiss={() => clearSummon(char.id)}
                openRoll={openRoll}
              />
            </section>
          )}

          {/* Companion — one compact row plus its attacks and quick selection. */}
          {companion && (
            <section aria-labelledby="companion-heading">
              <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-baseline gap-2">
                    <h2 id="companion-heading" className="font-headline text-base font-bold text-white">
                      Companion
                    </h2>
                    <span className="font-label text-[10px] text-tertiary">{companion.name}</span>
                  </div>

                  {companions.length > 1 && (
                    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-surface-container-high/80 p-0.5">
                      {companions.map((comp) => {
                        const isSelected = comp.id === companion.id
                        return (
                          <button
                            key={comp.id}
                            type="button"
                            onClick={() => setActiveCompanion(char.id, comp.id)}
                            className={`rounded-md px-2 py-0.5 font-label text-[10px] font-bold uppercase transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-primary text-surface-lowest shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                                : 'text-tertiary hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            {comp.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <Link
                  to="/companion"
                  className="flex items-center gap-1 font-label text-[10px] uppercase tracking-wider text-tertiary transition-colors hover:text-primary"
                >
                  Sheet
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </Link>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-surface-container/70 p-3.5 backdrop-blur-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl border border-primary/25 bg-surface-container-high">
                    {companion.portrait ? (
                      <img src={companion.portrait} alt={companion.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined flex h-full w-full items-center justify-center text-primary">
                        pets
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-headline text-sm font-bold text-white">{companion.name}</p>
                    <p className="font-label text-[10px] uppercase tracking-wider text-tertiary">
                      {companion.type.replace('_', ' ')} · {companion.species} · AC {companion.armorClass.total}
                    </p>
                    {companionConditions.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {companionConditions.map((cond) => (
                          <span
                            key={cond}
                            className="rounded-full border border-error/40 bg-error/20 px-1.5 py-0.2 font-label text-[9px] font-bold uppercase tracking-wider text-error"
                          >
                            {cond}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => adjustCompanionHp(char.id, companion.id, -1, companion.maxHp)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-surface-container-high text-sm font-bold text-primary transition-colors hover:bg-error/20 hover:text-white cursor-pointer"
                      title="-1 HP"
                    >
                      -
                    </button>
                    <div className="min-w-[64px] text-center">
                      <span className="font-label text-sm font-bold tabular-nums text-primary">{companionHp}</span>
                      <span className="font-label text-[10px] text-tertiary"> / {companion.maxHp}</span>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-container-lowest">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-200"
                          style={{ width: `${companionHpPct}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => adjustCompanionHp(char.id, companion.id, 1, companion.maxHp)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-surface-container-high text-sm font-bold text-primary transition-colors hover:bg-primary/20 hover:text-white cursor-pointer"
                      title="+1 HP"
                    >
                      +
                    </button>
                  </div>
                </div>

                {companion.attacks.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/5 pt-3">
                    {companion.attacks.map((atk) => {
                      const parsed = parseDiceFormula(atk.damageDice)
                      const isTouch = atk.damageDice.toLowerCase().includes('spell')
                      const baseDmgBonus = atk.damageBonus !== undefined && atk.damageBonus !== parsed.bonus
                        ? atk.damageBonus + parsed.bonus
                        : (atk.damageBonus ?? parsed.bonus)
                      const effectiveAtkBonus = atk.bonus + conditionAttackMod
                      const finalDmgBonus = baseDmgBonus + conditionDamageMod
                      const dmgLabel = isTouch
                        ? atk.damageDice
                        : formatDamage(`${parsed.count}d${parsed.sides}`, finalDmgBonus)

                      return (
                        <div
                          key={atk.name}
                          className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-surface-container-high/60 p-1 pl-2.5"
                        >
                          <span className="font-label text-[10px] font-bold text-on-surface">{atk.name}</span>
                          <button
                            onClick={() =>
                              openRoll({
                                diceType: 20,
                                count: 1,
                                modifier: effectiveAtkBonus,
                                label: `${companion.name} — ${atk.name} Atk${conditionAttackMod !== 0 ? ` (${conditionAttackMod >= 0 ? '+' : ''}${conditionAttackMod})` : ''}`,
                                critRange: atk.critRange ?? 20,
                              })
                            }
                            className="min-h-[32px] rounded-lg bg-primary/10 px-2 font-label text-[11px] font-bold text-primary transition-colors hover:bg-primary/20 cursor-pointer"
                            title={`Roll ${atk.name} attack`}
                          >
                            {effectiveAtkBonus >= 0 ? `+${effectiveAtkBonus}` : effectiveAtkBonus}
                          </button>
                          <button
                            onClick={() => {
                              if (isTouch) {
                                openRoll({
                                   diceType: 20,
                                   count: 1,
                                   modifier: effectiveAtkBonus,
                                   label: `${companion.name} — Touch Attack`,
                                 })
                              } else {
                                openRoll({
                                  diceType: parsed.sides,
                                  count: parsed.count,
                                  modifier: finalDmgBonus,
                                  label: `${companion.name} — ${atk.name} Dmg${conditionDamageMod !== 0 ? ` (${conditionDamageMod >= 0 ? '+' : ''}${conditionDamageMod})` : ''}`,
                                })
                              }
                            }}
                            className="min-h-[32px] rounded-lg bg-secondary/10 px-2 font-label text-[11px] font-bold text-secondary transition-colors hover:bg-secondary/20 cursor-pointer"
                            title={`Roll ${atk.name} damage`}
                          >
                            {dmgLabel}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Support column — state you need to read, not act on constantly. */}
        <aside className="space-y-4 xl:col-span-5">
          <section
            aria-labelledby="buffs-heading"
            className="rounded-2xl border border-white/10 bg-surface-container/70 p-4 backdrop-blur-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h2 id="buffs-heading" className="font-headline text-base font-bold text-white">
                  Buffs & Effects
                </h2>
                <span className="font-label text-[10px] text-tertiary">
                  {activeBuffIds.length} active
                </span>
              </div>
              <button
                onClick={() => setShowBuffModal(true)}
                className="flex min-h-[32px] items-center gap-1.5 rounded-lg border border-primary/25 px-2.5 font-label text-[10px] uppercase tracking-wider text-primary transition-colors hover:border-primary/60 hover:bg-primary/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">tune</span>
                Manage
              </button>
            </div>

            <div className="mt-3 space-y-1.5">
              {allBuffs.map((buff) => {
                const isActive = activeBuffIds.includes(buff.id)
                const hex =
                  { primary: '#00f0ff', secondary: '#d946ef', error: '#ff4b60' }[buff.color ?? 'primary'] ??
                  '#00f0ff'
                const tokens = buffModifierTokens(buff)

                return (
                  <button
                    key={buff.id}
                    onClick={() => toggleBuff(char.id, buff.id)}
                    aria-pressed={isActive}
                    title={isActive ? `Disable ${buff.name}` : `Enable ${buff.name}`}
                    className="flex w-full items-center gap-2.5 rounded-xl border bg-surface-container/80 px-2.5 py-2 text-left backdrop-blur-sm transition-all hover:bg-surface-container-high active:scale-[0.99] cursor-pointer"
                    style={
                      isActive
                        ? {
                            borderColor: hex,
                            backgroundColor: `${hex}14`,
                            boxShadow: `0 0 16px ${hex}35`,
                          }
                        : { borderColor: 'rgba(255,255,255,0.07)' }
                    }
                  >
                    <span
                      className="h-1.5 w-1.5 flex-shrink-0 rounded-full transition-all"
                      style={
                        isActive
                          ? { backgroundColor: hex, boxShadow: `0 0 8px ${hex}` }
                          : { backgroundColor: 'rgba(255,255,255,0.18)' }
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate font-label text-[11px] font-bold tracking-wide"
                        style={{ color: isActive ? hex : 'rgba(241,245,249,0.72)' }}
                      >
                        {buff.name}
                      </span>
                      {tokens.length > 0 && (
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          {tokens.map((token, index) => (
                            <span key={`${token.label}-${index}`} className="contents">
                              {index > 0 && <span className="font-label text-[8px] text-tertiary/40">|</span>}
                              <span className={`font-label text-[9px] tabular-nums ${isActive ? `font-bold ${modifierColor(token.value)}` : 'text-tertiary/50'}`}>
                                {token.value !== null ? `${token.value > 0 ? '+' : ''}${token.value} ${token.label}` : `+${token.label}`}
                              </span>
                            </span>
                          ))}
                        </span>
                      )}
                      <span className="sr-only">
                        {[
                          buff.attackMod !== 0 ? `${buff.attackMod > 0 ? '+' : ''}${buff.attackMod} Att` : '',
                          buff.damageMod !== 0 ? `${buff.damageMod > 0 ? '+' : ''}${buff.damageMod} Dmg` : '',
                          buff.acMod !== 0 ? `${buff.acMod > 0 ? '+' : ''}${buff.acMod} AC` : '',
                          buff.extraDamageDice ? `+${buff.extraDamageDice}` : '',
                          ...(typeof buff.saveMod === 'number' && buff.saveMod !== 0
                            ? [`${buff.saveMod > 0 ? '+' : ''}${buff.saveMod} Saves`]
                            : typeof buff.saveMod === 'object' && buff.saveMod !== null
                              ? Object.entries(buff.saveMod)
                                  .filter(([, v]) => v !== undefined && v !== 0)
                                  .map(([k, v]) => `${(v as number) > 0 ? '+' : ''}${v} ${k === 'fort' ? 'Fort' : k === 'ref' ? 'Ref' : k === 'will' ? 'Will' : k}`)
                              : []),
                          buff.meleeOnly ? 'Melee only' : '',
                        ]
                          .filter(Boolean)
                          .join(' / ')}
                      </span>
                    </span>
                    <span
                      className="flex-shrink-0 font-label text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: isActive ? hex : 'rgba(255,255,255,0.32)' }}
                    >
                      {isActive ? 'On' : 'Off'}
                    </span>
                  </button>
                )
              })}
            </div>

            {char.dailyResources.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-white/5 pt-2">
                {char.dailyResources.map((resource) => (
                  <DailyResourcePips
                    key={resource.id}
                    characterId={char.id}
                    resource={resource}
                    spent={session.spentResources[resource.id] ?? 0}
                    compact
                  />
                ))}
              </div>
            )}

            <DefensiveBadges compact />
          </section>

          <ContextualCombatFeatures collapsible defaultCollapsed compact />

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
        </aside>
      </div>

      {/* Full Attack Routine Modal */}
      {fullAttackWeapon && fullAttackEffective && (
        <FullAttackModal
          isOpen={!!fullAttackWeapon}
          onClose={() => setFullAttackWeapon(null)}
          weapon={fullAttackWeapon}
          effective={fullAttackEffective}
          twfActive={twfActive}
          offhandPenalty={offhandPenalty}
          hasteActive={hasteActive}
          sneakAttackDice={fullAttackEffective.extraDamageDice}
          extraDiceLabel={fullAttackEffective.extraDiceLabel ?? 'Extra Dmg'}
          animated={true}
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
            fullAttackEffective.extraDamageDice
              ? () => {
                  const { count, sides } = parseDiceFormula(fullAttackEffective.extraDamageDice!)
                  openRoll({
                    diceType: sides,
                    count,
                    modifier: 0,
                    label: `${fullAttackEffective.extraDiceLabel ?? 'Extra Dmg'} Roll`,
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
