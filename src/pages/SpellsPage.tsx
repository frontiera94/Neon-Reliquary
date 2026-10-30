import { useState } from 'react'
import { motion } from 'framer-motion'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import { useInspectorStore } from '../store/useInspectorStore'
import { parseDiceFormula } from '../lib/dice-engine'
import {
  deriveBuffFromSpell,
  findMatchingBuffForSpell,
  isSpellBuffCandidate,
  calcEffectiveAbilities,
  calcConcentrationBonus,
  getSpellFocusBonus,
} from '../lib/stat-calc'
import { getSpellAvailability } from '../lib/spell-availability'
import { spellInspectorItem } from '../lib/inspector-items'
import { SpellUsePips } from '../components/spells/SpellUsePips'
import type { Spell, SpellAttackType } from '../types/resources'
import { STAGGER_CONTAINER, STAGGER_ITEM } from '../lib/motion-presets'

export function SpellsPage() {
  const char = useCharacterStore((s) => s.activeCharacter())
  const session = useSessionStore((s) => char ? s.getSession(char.id) : null)
  const {
    toggleSpellPrepared,
    prepareSpell,
    unprepareSpell,
    clearPreparedSpells,
    spendSpellSlot,
    setSpellSlotSpent,
    spendPreparedSpell,
    setPreparedSpellSpent,
    toggleBuff,
    addCustomBuff,
    spendResource,
    setResourceSpent,
  } = useSessionStore()
  const openRoll = useDiceStore((s) => s.openRoll)
  const openInspector = useInspectorStore((s) => s.openInspector)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<number | 'all'>('all')

  if (!char) return (
    <div className="flex items-center justify-center h-64 text-tertiary font-label text-sm uppercase tracking-widest">
      No character selected
    </div>
  )

  if (!char.spells || char.spells.length === 0) return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="font-headline text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight uppercase">The Repository</h1>
      <p className="text-tertiary font-label text-xs sm:text-sm">This character has no spellcasting ability.</p>
    </div>
  )

  const spellLevels = [...new Set(char.spells.map((s) => s.level))].sort()
  const filteredSpells = char.spells.filter((s) => {
    if (levelFilter !== 'all' && s.level !== levelFilter) return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const allBuffs = [...char.buffs, ...(session?.customBuffs ?? [])]
  const activeBuffs = allBuffs.filter((b) => session?.activeBuffIds.includes(b.id))
  const effectiveAbilities = calcEffectiveAbilities(char.abilities, session?.conditions ?? [], activeBuffs)

  const availability = getSpellAvailability(
    { ...char, abilities: effectiveAbilities.scores },
    session ?? {}
  )
  const isSpontaneous = availability.profile.mode === 'spontaneous'
  const isPreparedCaster = availability.profile.mode === 'prepared'

  const arcaneFailure = char.armorClass.spellFailureChance ?? 0
  const concMod = calcConcentrationBonus(char.level, availability.castingMod)
  const hasCombatCasting = char.feats.some((f) => /combat casting/i.test(f.name))
  const defensiveConcMod = calcConcentrationBonus(char.level, availability.castingMod, hasCombatCasting ? 4 : 0)

  const bab = char.baseAttackBonus[0] ?? 0
  const dexMod = effectiveAbilities.mods.dex
  const strMod = effectiveAbilities.mods.str
  const attackBonusFor = (t: SpellAttackType): number =>
    t === 'meleeTouch' ? bab + strMod : bab + dexMod

  const isAlwaysPrepared = (spell: Spell) =>
    Boolean(spell.alwaysPrepared || spell.source === 'domain' || spell.source === 'bloodline')

  const isSpellBuffActive = (spell: Spell) => {
    const match = findMatchingBuffForSpell(spell, allBuffs)
    return session?.activeBuffIds.includes(match?.id ?? `spell-buff-${spell.id}`) ?? false
  }

  const consumeCastCost = (spell: Spell): boolean => {
    if (!availability.isCastable(spell)) return false
    const uses = availability.spellUses(spell)
    if (uses.kind === 'prepared' || uses.kind === 'domain') {
      spendPreparedSpell(char.id, spell.id, uses.total)
      return true
    }
    if (uses.kind === 'spontaneous') {
      const level = availability.getLevel(spell.level)
      if (!level) return false
      spendSpellSlot(char.id, level.level, level.total)
      return true
    }
    const resource = availability.resourceFor(spell)
    if (resource && spell.source === 'sla') {
      spendResource(char.id, resource.id, resource.total)
      return true
    }
    return true
  }

  const activateSpellBuff = (spell: Spell) => {
    if (!session) return
    const match = findMatchingBuffForSpell(spell, allBuffs)
    const buffId = match?.id ?? `spell-buff-${spell.id}`
    if (session.activeBuffIds.includes(buffId)) {
      toggleBuff(char.id, buffId)
      return
    }
    if (!consumeCastCost(spell)) return
    if (match) toggleBuff(char.id, match.id)
    else addCustomBuff(char.id, deriveBuffFromSpell(spell))
  }

  const castAndRoll = (spell: Spell, roll: () => void) => {
    if (!consumeCastCost(spell)) return
    roll()
  }

  const inspectSpell = (spell: Spell) => {
    const spellFocusBonus = getSpellFocusBonus(spell.school, char.feats)
    openInspector(
      spellInspectorItem(spell, {
        dc: availability.spellDc(spell, spellFocusBonus),
        tags: [
          ...(isSpellBuffActive(spell) ? ['Buff Active'] : []),
          ...(isAlwaysPrepared(spell) ? ['Always Prepared'] : []),
          ...(spell.source === 'sla' ? ['SLA'] : []),
        ],
        actions: isSpellBuffCandidate(spell)
          ? [
              {
                label: isSpellBuffActive(spell) ? 'Deactivate Buff' : 'Activate as Buff',
                onClick: () => activateSpellBuff(spell),
                variant: isSpellBuffActive(spell) ? 'danger' : 'secondary',
              },
            ]
          : undefined,
      })
    )
  }

  const attackLabel: Record<SpellAttackType, string> = {
    rangedTouch: 'Cast (Ranged Touch)',
    meleeTouch: 'Cast (Melee Touch)',
    ray: 'Cast (Ray)',
  }

  return (
    <motion.div
      variants={STAGGER_CONTAINER}
      initial="initial"
      animate="animate"
      className="p-4 md:p-8 max-w-6xl mx-auto space-y-6"
    >
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl sm:text-3xl font-black text-white mb-1.5 tracking-tight uppercase">
              The Repository
            </h1>
            <p className="text-tertiary font-label text-xs sm:text-sm tracking-wide">
              {isSpontaneous
                ? `Spontaneous caster · ${availability.knownCount} known · ${availability.remainingSlots} slots remaining`
                : isPreparedCaster
                ? `Prepared caster · ${availability.preparedCount}/${availability.preparedCapacity} prepared · ${availability.remainingSlots} active uses remaining`
                : `Spell-like abilities · ${availability.remainingSlots} spell slots`}
            </p>
          </div>
          {isPreparedCaster && availability.preparedCount > 0 && (
            <button
              type="button"
              onClick={() => clearPreparedSpells(char.id)}
              className="px-3.5 py-1.5 rounded-xl border border-white/10 text-tertiary hover:text-error hover:border-error/40 hover:bg-error/10 font-label text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-center"
              title="Clear all prepared spells and reset preparation from scratch"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              Clear Preparation
            </button>
          )}
        </div>

        {arcaneFailure > 0 && (
          <div className="mt-4 px-4 py-3 bg-error-container/20 border border-error/30 rounded-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-error text-sm">warning</span>
            <span className="font-label text-xs text-error uppercase tracking-widest font-bold">
              Arcane Spell Failure: {arcaneFailure}%
            </span>
          </div>
        )}

        {/* Global Concentration Check */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openRoll({ diceType: 20, count: 1, modifier: concMod, label: 'Concentration' })}
            className="px-4 py-2 bg-surface-container/90 border border-white/10 rounded-xl text-tertiary font-label text-xs uppercase tracking-widest hover:text-primary hover:border-primary/50 hover:shadow-[0_0_12px_rgba(0,240,255,0.25)] transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>electric_bolt</span>
            Concentration ({concMod >= 0 ? `+${concMod}` : concMod})
          </button>
          {hasCombatCasting && (
            <button
              onClick={() => openRoll({ diceType: 20, count: 1, modifier: concMod + 4, label: 'Concentration (Defensive)' })}
              className="px-4 py-2 bg-surface-container/90 border border-white/10 rounded-xl text-tertiary font-label text-xs uppercase tracking-widest hover:text-secondary hover:border-secondary/50 hover:shadow-[0_0_12px_rgba(217,70,239,0.3)] transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>electric_bolt</span>
              Defensive ({defensiveConcMod >= 0 ? `+${defensiveConcMod}` : defensiveConcMod})
            </button>
          )}
        </div>
      </header>

      {/* Active Spells & Slots Tracker */}
      {isPreparedCaster ? (
        <section className="mb-8 bg-surface-container/90 backdrop-blur-sm p-6 rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(0,240,255,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-headline text-lg sm:text-xl font-bold uppercase tracking-wider text-secondary neon-glow-accent">
              Active Spell Uses
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {availability.levels
                .filter((l) => l.total > 0 && l.unpreparedCount > 0)
                .map((l) => (
                  <span
                    key={l.level}
                    className="font-label text-[10px] text-amber-300/90 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-md uppercase tracking-wider"
                  >
                    Lv {l.level}: {l.unpreparedCount} unprepared
                  </span>
                ))}
              <span className="font-label text-[10px] text-tertiary uppercase tracking-wider tabular-nums">
                {availability.remainingSlots}/{availability.totalSlots} uses remaining
              </span>
            </div>
          </div>
          {availability.activeSpellUses.length === 0 ? (
            <p className="font-label text-xs uppercase tracking-widest text-tertiary/60 py-2">
              No spells prepared yet. Check spells in the list below to assign daily uses.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {availability.activeSpellUses.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-surface-container-high/40 px-3.5 py-2 hover:border-primary/30 transition-all"
                >
                  <SpellUsePips
                    label={item.name}
                    prefix={item.prefix}
                    total={item.total}
                    spent={item.spent}
                    onSpend={() => {
                      if (item.kind === 'sla' && item.spell.resourceId) {
                        spendResource(char.id, item.spell.resourceId, item.total)
                      } else {
                        spendPreparedSpell(char.id, item.id, item.total)
                      }
                    }}
                    onSetSpent={(amt) => {
                      if (item.kind === 'sla' && item.spell.resourceId) {
                        setResourceSpent(char.id, item.spell.resourceId, amt)
                      } else {
                        setPreparedSpellSpent(char.id, item.id, amt)
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      ) : isSpontaneous && availability.levels.some((level) => level.total > 0) ? (
        <section className="mb-8 bg-surface-container/90 backdrop-blur-sm p-6 rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(0,240,255,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-headline text-lg sm:text-xl font-bold uppercase tracking-wider text-secondary neon-glow-accent">
              Spell Slots
            </h2>
            <span className="font-label text-[10px] text-tertiary uppercase tracking-wider tabular-nums">
              {availability.remainingSlots}/{availability.totalSlots} remaining
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {availability.levels
              .filter((slot) => slot.total > 0)
              .map((slot) => (
                <div
                  key={slot.level}
                  className="rounded-xl border border-white/10 bg-surface-container-high/40 px-3.5 py-2 hover:border-primary/30 transition-all"
                >
                  <SpellUsePips
                    label={`Level ${slot.level}`}
                    prefix="SLOT"
                    total={slot.total}
                    spent={slot.spent}
                    onSpend={() => spendSpellSlot(char.id, slot.level, slot.total)}
                    onSetSpent={(amt) => setSpellSlotSpent(char.id, slot.level, amt)}
                  />
                </div>
              ))}
          </div>
        </section>
      ) : availability.activeSpellUses.length > 0 ? (
        <section className="mb-8 bg-surface-container/90 backdrop-blur-sm p-6 rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(0,240,255,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-headline text-lg sm:text-xl font-bold uppercase tracking-wider text-secondary neon-glow-accent">
              Active Spell Uses
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {availability.activeSpellUses.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-white/10 bg-surface-container-high/40 px-3.5 py-2 hover:border-primary/30 transition-all"
              >
                <SpellUsePips
                  label={item.name}
                  prefix={item.prefix}
                  total={item.total}
                  spent={item.spent}
                  onSpend={() => {
                    if (item.kind === 'sla' && item.spell.resourceId) {
                      spendResource(char.id, item.spell.resourceId, item.total)
                    }
                  }}
                  onSetSpent={(amt) => {
                    if (item.kind === 'sla' && item.spell.resourceId) {
                      setResourceSpent(char.id, item.spell.resourceId, amt)
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary/50 text-sm">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search spells..."
            className="bg-surface-container-high/80 rounded-xl pl-10 pr-4 py-2.5 font-label text-sm text-on-surface placeholder:text-tertiary/50 outline-none w-64 border border-white/10 focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setLevelFilter('all')}
            className={`px-3 py-2 font-label text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer ${levelFilter === 'all' ? 'bg-primary text-black font-bold shadow-[0_0_12px_rgba(0,240,255,0.4)]' : 'bg-surface-container text-tertiary hover:text-white border border-white/5'}`}
          >
            All
          </button>
          {spellLevels.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-2 font-label text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer ${levelFilter === lvl ? 'bg-primary text-black font-bold shadow-[0_0_12px_rgba(0,240,255,0.4)]' : 'bg-surface-container text-tertiary hover:text-white border border-white/5'}`}
            >
              Lv {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Spells grouped by level */}
      {spellLevels
        .filter((lvl) => levelFilter === 'all' || lvl === levelFilter)
        .map((lvl) => {
          const levelSpells = filteredSpells.filter((s) => s.level === lvl)
          if (levelSpells.length === 0) return null
          const levelInfo = availability.getLevel(lvl)
          const slotMax = levelInfo?.total ?? 0
          const levelPreparedCount = levelInfo?.preparedCount ?? 0
          const preparedCapacity = levelInfo?.preparedCapacity ?? 0

          return (
            <motion.div variants={STAGGER_ITEM} key={lvl} className="mb-8">
              <div className="flex items-center gap-4 mb-3">
                <h3 className="font-headline text-sm sm:text-base font-bold uppercase tracking-wider text-primary tabular-nums">
                  Level {lvl}
                  {isPreparedCaster && slotMax > 0
                    ? ` · Prepared: ${levelPreparedCount}/${preparedCapacity}`
                    : slotMax > 0
                    ? ` · Slots: ${levelInfo?.remaining ?? 0}/${slotMax}`
                    : ''}
                </h3>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <div className="space-y-2">
                {levelSpells.map((spell) => {
                  const atkBonus = spell.attackType ? attackBonusFor(spell.attackType) : 0
                  const count = availability.preparedCopies(spell.id)
                  const alwaysPrepared = isAlwaysPrepared(spell)
                  const atWill = availability.isAtWill(spell)
                  const isSla = spell.source === 'sla'
                  const castable = availability.isCastable(spell)
                  const unavailableReason = availability.reasonUnavailable(spell)
                  const isPrepared = isSpontaneous || alwaysPrepared || count > 0
                  const canPrepareMore = isPreparedCaster && levelPreparedCount < preparedCapacity
                  const resource = availability.resourceFor(spell)

                  const spellFocusBonus = getSpellFocusBonus(spell.school, char.feats)
                  const dc = availability.spellDc(spell, spellFocusBonus)
                  const uses = availability.spellUses(spell)

                  return (
                    <SpellRow
                      key={spell.id}
                      spell={spell}
                      dc={dc}
                      isSpontaneous={isSpontaneous}
                      isPrepared={isPrepared}
                      preparedCount={count}
                      canPrepareMore={canPrepareMore}
                      isAlwaysPrepared={alwaysPrepared}
                      isSla={isSla}
                      isAtWill={atWill}
                      isCastable={castable}
                      unavailableReason={unavailableReason}
                      slotRemaining={levelInfo?.remaining ?? 0}
                      slotTotal={slotMax}
                      usesTotal={uses.total}
                      usesRemaining={uses.remaining}
                      resourceRemaining={resource ? Math.max(0, resource.total - (session?.spentResources[resource.id] ?? 0)) : undefined}
                      attackLabel={spell.attackType ? `${attackLabel[spell.attackType]} (${atkBonus >= 0 ? `+${atkBonus}` : atkBonus})` : undefined}
                      isBuffActive={isSpellBuffActive(spell)}
                      onActivateBuff={isSpellBuffCandidate(spell) ? () => activateSpellBuff(spell) : undefined}
                      onInspect={() => inspectSpell(spell)}
                      onTogglePrepare={() => {
                        if (isSpontaneous || alwaysPrepared || isSla || atWill) return
                        if (!isPrepared && !canPrepareMore) return
                        toggleSpellPrepared(char.id, spell.id, spell.level, preparedCapacity)
                      }}
                      onAddPrepare={
                        canPrepareMore
                          ? () => prepareSpell(char.id, spell.id, preparedCapacity)
                          : undefined
                      }
                      onRemovePrepare={
                        count > 0 && !alwaysPrepared && !isSla && !atWill
                          ? () => unprepareSpell(char.id, spell.id)
                          : undefined
                      }
                      onAttack={
                        spell.attackType
                          ? () => castAndRoll(spell, () => {
                              const followUpRoll = spell.damageDice
                                ? (() => {
                                    const { count: dCount, sides, bonus } = parseDiceFormula(spell.damageDice!)
                                    return {
                                      diceType: sides,
                                      count: dCount,
                                      modifier: (spell.damageBonus ?? 0) + bonus,
                                      label: `${spell.name} (Damage)`,
                                    }
                                  })()
                                : undefined

                              openRoll({
                                diceType: 20,
                                count: 1,
                                modifier: atkBonus,
                                label: `${spell.name} (Attack)`,
                                followUpRoll,
                                followUpLabel: spell.damageDice
                                  ? `${spell.damageDice}${spell.damageBonus ? `+${spell.damageBonus}` : ''}`
                                  : undefined,
                              })
                            })
                          : undefined
                      }
                      onDamage={
                        spell.damageDice
                          ? () => {
                              if (!spell.attackType) {
                                if (!consumeCastCost(spell)) return
                              }
                              const { count: dCount, sides, bonus } = parseDiceFormula(spell.damageDice!)
                              openRoll({
                                diceType: sides,
                                count: dCount,
                                modifier: (spell.damageBonus ?? 0) + bonus,
                                label: `${spell.name} (Damage)`,
                              })
                            }
                          : undefined
                      }
                      onCast={() => consumeCastCost(spell)}
                    />
                  )
                })}
              </div>
            </motion.div>
          )
        })}
    </motion.div>
  )
}

function SpellRow({
  spell,
  dc,
  isPrepared,
  isSpontaneous = false,
  preparedCount = 0,
  canPrepareMore = true,
  attackLabel,
  onTogglePrepare,
  onAddPrepare,
  onRemovePrepare,
  onAttack,
  onDamage,
  onCast,
  onActivateBuff,
  onInspect,
  isBuffActive = false,
  isAlwaysPrepared = false,
  isSla = false,
  isAtWill = false,
  isCastable = true,
  unavailableReason = null,
  slotRemaining = 0,
  slotTotal = 0,
  usesTotal = 0,
  usesRemaining = 0,
  resourceRemaining,
}: {
  spell: Spell
  dc?: number
  isPrepared: boolean
  isSpontaneous?: boolean
  preparedCount?: number
  canPrepareMore?: boolean
  attackLabel?: string
  onTogglePrepare: () => void
  onAddPrepare?: () => void
  onRemovePrepare?: () => void
  onAttack?: () => void
  onDamage?: () => void
  onCast?: () => void
  onActivateBuff?: () => void
  onInspect?: () => void
  isBuffActive?: boolean
  isAlwaysPrepared?: boolean
  isSla?: boolean
  isAtWill?: boolean
  isCastable?: boolean
  unavailableReason?: string | null
  slotRemaining?: number
  slotTotal?: number
  usesTotal?: number
  usesRemaining?: number
  resourceRemaining?: number
}) {
  const preparationLocked = isSpontaneous || isAlwaysPrepared || isSla || isAtWill || spell.level === 0
  return (
    <details className={`w-full group rounded-xl overflow-hidden border transition-all ${isPrepared ? 'border-primary/50 shadow-[0_0_12px_rgba(0,240,255,0.15)]' : 'border-white/[0.08]'}`}>
      <summary className={`transition-all flex items-center gap-4 p-4 cursor-pointer list-none ${isPrepared ? 'bg-primary/10 hover:bg-primary/15' : 'bg-surface-container/90 hover:bg-surface-container-high'}`}>
        {/* Preparation state */}
        {isSpontaneous ? (
          <span className="font-label text-[10px] text-primary bg-primary/15 border border-primary/40 px-2 py-0.5 rounded-md uppercase font-bold flex-shrink-0">
            Known
          </span>
        ) : preparationLocked ? (
          <span className={`font-label text-[10px] px-2 py-0.5 rounded-md uppercase font-bold flex-shrink-0 border ${
            isSla
              ? 'text-secondary bg-secondary/15 border-secondary/40'
              : isAtWill
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
              : 'text-primary bg-primary/15 border-primary/40'
          }`}>
            {isSla
              ? `SLA${resourceRemaining !== undefined ? ` ${resourceRemaining}` : ''}`
              : spell.level === 0
              ? 'Cantrip'
              : isAtWill
              ? 'At-will'
              : 'Domain'}
          </span>
        ) : (
          <button
            onClick={(e) => { e.preventDefault(); onTogglePrepare() }}
            disabled={!isPrepared && !canPrepareMore}
            className={`w-5 h-5 rounded-md flex-shrink-0 border transition-all flex items-center justify-center ${
              isPrepared
                ? 'bg-primary border-primary shadow-[0_0_8px_rgba(0,240,255,0.5)] cursor-pointer'
                : !canPrepareMore
                ? 'border-white/10 opacity-30 cursor-not-allowed'
                : 'border-white/20 hover:border-primary cursor-pointer'
            }`}
            aria-label={`${isPrepared ? 'Unprepare' : 'Prepare'} ${spell.name}`}
            title={!isPrepared && !canPrepareMore ? 'All preparation capacity used for this level' : undefined}
          >
            {isPrepared && (
              <span className="material-symbols-outlined text-black leading-none font-bold" style={{ fontSize: '14px' }}>check</span>
            )}
          </button>
        )}
        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault()
                onInspect?.()
              }}
              className={`font-headline text-base sm:text-lg font-bold text-left cursor-pointer hover:underline underline-offset-4 ${isPrepared ? 'text-primary' : isBuffActive ? 'text-secondary' : 'text-white'}`}
            >
              {spell.name}
            </button>
            {isBuffActive && (
              <span className="font-label text-[10px] text-white font-bold bg-secondary px-2 py-0.5 rounded-full uppercase tracking-widest">
                Buff Active
              </span>
            )}
            {!isSpontaneous && !preparationLocked && isPrepared && (
              <div
                className="flex items-center gap-1.5 bg-primary/20 border border-primary/40 rounded-full px-2 py-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-label text-[10px] text-primary font-bold uppercase tracking-widest">
                  Prepared {preparedCount > 1 ? `x${preparedCount}` : ''}
                </span>
                {onRemovePrepare && (
                  <button
                    onClick={(e) => { e.preventDefault(); onRemovePrepare() }}
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-primary hover:text-white hover:bg-primary/40 text-[10px] font-bold cursor-pointer"
                    title="Remove one prepared copy"
                    aria-label={`Remove one prepared ${spell.name}`}
                  >
                    -
                  </button>
                )}
                {onAddPrepare && (
                  <button
                    onClick={(e) => { e.preventDefault(); onAddPrepare() }}
                    disabled={!canPrepareMore}
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-primary text-[10px] font-bold ${
                      canPrepareMore
                        ? 'hover:text-white hover:bg-primary/40 cursor-pointer'
                        : 'opacity-30 cursor-not-allowed'
                    }`}
                    title={canPrepareMore ? 'Prepare an additional copy' : 'No more slots available for this level'}
                    aria-label={`Prepare another copy of ${spell.name}`}
                  >
                    +
                  </button>
                )}
              </div>
            )}
            {!isSpontaneous && (isPrepared || isAlwaysPrepared) && spell.level > 0 && !isSla && usesTotal > 0 && (
              <span className={`font-label text-[10px] border px-2 py-0.5 rounded-md uppercase tabular-nums ${
                usesRemaining > 0
                  ? 'text-primary bg-primary/10 border-primary/30'
                  : 'text-error bg-error/10 border-error/30'
              }`}>
                Uses {usesRemaining}/{usesTotal}
              </span>
            )}
            {isSpontaneous && spell.level > 0 && !isSla && slotTotal > 0 && (
              <span className={`font-label text-[10px] border px-2 py-0.5 rounded-md uppercase tabular-nums ${
                slotRemaining > 0
                  ? 'text-primary bg-primary/10 border-primary/30'
                  : 'text-error bg-error/10 border-error/30'
              }`}>
                Slots {slotRemaining}/{slotTotal}
              </span>
            )}
            {isAlwaysPrepared && (
              <span className="font-label text-[10px] text-secondary bg-secondary/10 border border-secondary/30 px-2 py-0.5 rounded-md uppercase">
                Always Prepared
              </span>
            )}
            {spell.savingThrow && dc !== undefined && (
              <span className="font-label text-[10px] text-secondary bg-secondary/15 border border-secondary/30 px-2 py-0.5 rounded-md uppercase font-bold">
                DC {dc}
              </span>
            )}
            <span className="font-label text-[10px] text-primary bg-primary/15 border border-primary/30 px-2 py-0.5 rounded-md uppercase">
              {spell.school}{spell.subschool ? ` (${spell.subschool})` : ''}
            </span>
            {spell.attackType && (
              <span className="font-label text-[10px] text-error bg-error/15 border border-error/30 px-2 py-0.5 rounded-md uppercase">
                {spell.attackType === 'meleeTouch' ? 'Melee Touch' : spell.attackType === 'ray' ? 'Ray' : 'Ranged Touch'}
              </span>
            )}
          </div>
          <p className="font-label text-[10px] text-on-surface-variant mt-0.5">
            {spell.castingTime} · {spell.range} · {spell.duration}
          </p>
        </div>
        <span className="material-symbols-outlined text-primary/50 group-open:rotate-180 transition-transform flex-shrink-0">
          expand_more
        </span>
      </summary>

      <div className="bg-surface-container-low/90 px-6 pb-6 pt-3 border-t border-white/5">
        <p className="font-body text-tertiary text-sm leading-relaxed mb-4">{spell.description}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] font-label uppercase tracking-widest">
          {spell.savingThrow && (
            <div>
              <p className="text-primary mb-1 font-bold">Saving Throw</p>
              <p className="text-on-surface-variant font-bold">
                {spell.savingThrow} {dc !== undefined && <span className="text-secondary">(DC {dc})</span>}
              </p>
            </div>
          )}
          <div>
            <p className="text-primary mb-1 font-bold">Spell Resist</p>
            <p className="text-on-surface-variant">{spell.spellResistance ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-primary mb-1 font-bold">Components</p>
            <p className="text-on-surface-variant">{spell.components}</p>
          </div>
          {spell.damageDice && (
            <div>
              <p className="text-primary mb-1 font-bold">Damage</p>
              <p className="text-on-surface-variant font-bold">
                {spell.damageDice}{spell.damageBonus ? `+${spell.damageBonus}` : ''}
              </p>
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-2 flex-wrap">
          {onAttack && attackLabel && (
            <button
              onClick={onAttack}
              disabled={!isCastable}
              title={unavailableReason ?? undefined}
              className={`px-5 py-2.5 bg-gradient-to-r from-primary to-primary-container text-black font-bold font-label text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 ${
                isCastable ? 'hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] cursor-pointer' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              {attackLabel}
            </button>
          )}
          {onDamage && (
            <button
              onClick={onDamage}
              disabled={!isCastable}
              title={unavailableReason ?? undefined}
              className={`px-5 py-2.5 bg-surface-container-highest border border-error/40 text-error font-label text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 ${
                isCastable ? 'hover:shadow-[0_0_15px_rgba(255,75,96,0.3)] hover:bg-error/10 cursor-pointer' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              Roll Damage ({spell.damageDice}{spell.damageBonus ? `+${spell.damageBonus}` : ''})
            </button>
          )}
          {onCast && !onAttack && !onDamage && !onActivateBuff && (
            <button
              type="button"
              onClick={onCast}
              disabled={!isCastable}
              title={unavailableReason ?? undefined}
              className={`px-5 py-2.5 border font-label text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 ${
                isCastable
                  ? 'bg-primary/15 border-primary/40 text-primary hover:bg-primary/25 cursor-pointer'
                  : 'bg-white/5 border-white/10 text-tertiary opacity-40 cursor-not-allowed'
              }`}
            >
              {isSla ? 'Use SLA' : 'Cast'}
            </button>
          )}
          {onActivateBuff && (
            <button
              type="button"
              onClick={onActivateBuff}
              disabled={!isBuffActive && !isCastable}
              title={!isBuffActive ? unavailableReason ?? undefined : undefined}
              className={`px-5 py-2.5 border font-label text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 ${
                isBuffActive
                  ? 'bg-secondary/20 border-secondary/60 text-secondary hover:bg-secondary/30 cursor-pointer'
                  : isCastable
                  ? 'bg-secondary/10 border-secondary/40 text-secondary hover:bg-secondary/20 cursor-pointer'
                  : 'bg-secondary/5 border-white/10 text-tertiary opacity-40 cursor-not-allowed'
              }`}
            >
              {isBuffActive ? 'Deactivate Buff' : 'Activate as Buff'}
            </button>
          )}
          {onInspect && (
            <button
              type="button"
              onClick={onInspect}
              className="px-5 py-2.5 bg-white/5 border border-white/10 text-tertiary font-label text-xs uppercase tracking-widest rounded-xl hover:text-primary hover:border-primary/40 transition-all cursor-pointer"
            >
              Inspect
            </button>
          )}
        </div>
        {!isCastable && unavailableReason && (
          <p className="mt-2 font-label text-[10px] uppercase tracking-wider text-error">{unavailableReason}</p>
        )}
      </div>
    </details>
  )
}
