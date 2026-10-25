import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import { useInspectorStore } from '../store/useInspectorStore'
import { abilityMod } from '../lib/dice-engine'
import { CONDITION_INFO } from '../lib/conditions'
import { conditionInspectorItem } from '../lib/inspector-items'
import { getSpellAvailability } from '../lib/spell-availability'
import {
  calcEffectiveAbilities,
  calcEffectiveArmorClass,
  calcEffectiveSaves,
  calcDetailedAcBreakdowns,
  calcCombatManeuvers,
  getActiveActionRestrictions,
  evaluateVitalStatus,
} from '../lib/stat-calc'
import { ActionAlertBanner } from '../components/combat/ActionAlertBanner'
import { BuffManagerModal } from '../components/combat/BuffManagerModal'
import { DailyResourcePips } from '../components/combat/BuffResourceToggle'
import { StatBreakdownTooltip } from '../components/ui/StatBreakdownTooltip'
import type { ConditionType } from '../types/combat'

const COLOR_MAP: Record<string, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  'on-surface': 'text-on-surface',
}

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
const ABILITY_NAMES = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
}

const ALL_CONDITIONS: ConditionType[] = [
  'shaken', 'sickened', 'fatigued', 'exhausted',
  'blinded', 'confused', 'dazed', 'frightened',
  'nauseated', 'paralyzed', 'prone', 'stunned',
]

export function StatusPage() {
  const char = useCharacterStore((s) => s.activeCharacter())
  const session = useSessionStore((s) => (char ? s.getSession(char.id) : null))
  const {
    adjustHp,
    initSession,
    setNonlethal,
    setTempHp,
    toggleCondition,
    longRest,
    spendSpellSlot,
    recoverSpellSlot,
  } = useSessionStore()
  const openRoll = useDiceStore((s) => s.openRoll)
  const openInspector = useInspectorStore((s) => s.openInspector)

  const [hpDelta, setHpDelta] = useState(1)
  const [nlEdit, setNlEdit] = useState<string | null>(null)
  const [tempEdit, setTempEdit] = useState<string | null>(null)
  const [showBuffModal, setShowBuffModal] = useState(false)

  if (!char) return <EmptyState />

  if (!session) {
    initSession(char.id, char.maxHp)
    return null
  }

  const allBuffs = [...char.buffs, ...(session.customBuffs ?? [])]
  const activeBuffs = allBuffs.filter((b) => session.activeBuffIds.includes(b.id))

  const effectiveAbilities = calcEffectiveAbilities(char.abilities, session.conditions, activeBuffs)
  const effectiveSaves = calcEffectiveSaves(
    char.savingThrows,
    char.abilities,
    effectiveAbilities,
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
  const restrictions = getActiveActionRestrictions(session.conditions)
  const spellAvailability = getSpellAvailability(char, session)

  const hp = session.currentHp
  const maxHp = char.maxHp
  const vitalStatus = evaluateVitalStatus(hp, char.abilities.con)

  const spentByResource = (id: string) => session.spentResources[id] ?? 0

  function commitNl() {
    if (nlEdit === null) return
    const val = parseInt(nlEdit)
    if (!isNaN(val) && val >= 0) setNonlethal(char!.id, val)
    setNlEdit(null)
  }

  function commitTemp() {
    if (tempEdit === null) return
    const val = parseInt(tempEdit)
    if (!isNaN(val) && val >= 0) setTempHp(char!.id, val)
    setTempEdit(null)
  }

  const effectiveInit = char.initiativeBonus + effectiveAbilities.deltas.dex
  const detailedAc = calcDetailedAcBreakdowns(
    char.armorClass,
    effectiveAbilities.mods.dex,
    session.conditions,
    activeBuffs
  )
  const maneuvers = calcCombatManeuvers(
    char,
    effectiveAbilities,
    session.conditions,
    activeBuffs
  )
  const babString = char.baseAttackBonus.map((b) => (b >= 0 ? `+${b}` : `${b}`)).join('/')
  const speedSub = 'Land speed'

  const initBreakdown = [
    { label: 'Base Init', value: char.initiativeBonus },
    ...(effectiveAbilities.deltas.dex !== 0
      ? [{ label: 'DEX Shift', value: effectiveAbilities.deltas.dex }]
      : []),
  ]

  return (
    <div className="p-2.5 sm:p-4 md:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-6">
        {/* Tactical Restrictions Banner */}
        {restrictions.length > 0 && (
          <div className="lg:col-span-12">
            <ActionAlertBanner restrictions={restrictions} />
          </div>
        )}

        {/* Bonded Companion Quick Banner */}
        {char.companions && char.companions.length > 0 && (
          <div className="lg:col-span-12 bg-surface-container/90 backdrop-blur-sm border border-primary/30 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">pets</span>
              <div>
                <p className="font-headline text-sm font-bold text-on-surface">
                  Bonded Companion: <span className="text-secondary">{char.companions[0].name}</span>
                </p>
                <p className="font-label text-[10px] text-tertiary uppercase">
                  {char.companions[0].type.replace('_', ' ')} • {char.companions[0].species} • HP {session.companionHp?.[char.companions[0].id] ?? char.companions[0].maxHp} / {char.companions[0].maxHp}
                </p>
              </div>
            </div>
            <Link
              to="/companion"
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-primary/10 border border-primary text-primary font-label text-xs uppercase tracking-widest rounded-xl hover:bg-primary/20 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all flex items-center gap-2 cursor-pointer"
            >
              Open Companion Sheet
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </Link>
          </div>
        )}

        {/* Vitality Core */}
        <section className="lg:col-span-12 flex flex-col items-center justify-center bg-surface-container/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 relative overflow-hidden group rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(0,240,255,0.08)] hover:border-primary/40 hover:shadow-[0_0_30px_rgba(0,240,255,0.2)] transition-all">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none" />
          <div className="w-full flex items-center justify-between mb-2 md:mb-4">
            <h2 className="font-headline text-secondary text-xs sm:text-sm md:text-lg uppercase tracking-widest neon-glow-accent font-bold">
              Vitality Core
            </h2>
            <div className="flex items-center gap-1.5 md:gap-2">
              <button
                onClick={() => longRest(char.id, maxHp)}
                className="px-2.5 py-1 sm:px-4 sm:py-1.5 bg-surface-container-highest border border-white/10 rounded-lg sm:rounded-xl font-label text-[10px] sm:text-xs text-secondary uppercase tracking-widest hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs align-middle mr-1">bedtime</span>
                <span className="hidden sm:inline">Long </span>Rest
              </button>
              <button
                onClick={() => setShowBuffModal(true)}
                className="px-2.5 py-1 sm:px-4 sm:py-1.5 bg-primary/10 border border-primary/40 text-primary font-label text-[10px] sm:text-xs uppercase tracking-widest rounded-lg sm:rounded-xl hover:bg-primary/20 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">tune</span>
                Buffs
              </button>
            </div>
          </div>

          <div className="text-center my-1 md:my-2">
            <div
              className="font-label font-black text-primary text-5xl sm:text-6xl md:text-7xl leading-none"
              style={{ textShadow: '0 0 25px rgba(0,240,255,0.35)' }}
            >
              {hp}
            </div>
            {vitalStatus !== 'conscious' && (
              <div className="mt-1.5">
                <span
                  className={`px-2.5 py-0.5 rounded-full font-label text-[10px] sm:text-xs uppercase tracking-widest font-black inline-flex items-center gap-1 ${
                    vitalStatus === 'dead'
                      ? 'bg-black text-error border border-error/60 shadow-[0_0_15px_rgba(255,75,96,0.6)]'
                      : vitalStatus === 'dying'
                        ? 'bg-error text-white shadow-[0_0_15px_rgba(255,75,96,0.5)] animate-pulse'
                        : 'bg-amber-400 text-surface font-bold shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[10px] sm:text-xs">
                    {vitalStatus === 'dead' ? 'skull' : 'warning'}
                  </span>
                  {vitalStatus === 'dead' ? 'Dead' : vitalStatus === 'dying' ? 'Dying' : 'Disabled (0 HP)'}
                </span>
              </div>
            )}
            <div className="font-label text-tertiary tracking-widest uppercase mt-1 text-[10px] sm:text-xs flex items-center justify-center gap-1">
              <span>Hit Points</span>
              <span className="text-on-surface-variant font-bold">/ {maxHp}</span>
            </div>
          </div>

          {/* Quick HP Adjustment */}
          <div className="mt-3 md:mt-6 flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => adjustHp(char.id, -hpDelta, maxHp)}
              className="px-3.5 py-2 sm:px-5 sm:py-2.5 bg-error-container text-on-error-container hover:brightness-125 transition-all active:scale-95 font-label text-xs sm:text-sm uppercase tracking-widest rounded-xl cursor-pointer font-bold"
              aria-label="Decrease HP"
            >
              Damage
            </button>
            <input
              type="number"
              min={1}
              value={hpDelta}
              onChange={(e) => setHpDelta(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 sm:w-20 bg-surface-container-high text-on-surface font-label text-lg sm:text-xl font-bold text-center py-1.5 sm:py-2 rounded-xl border border-white/10 focus:border-primary focus:outline-none"
            />
            <button
              onClick={() => adjustHp(char.id, hpDelta, maxHp)}
              className="px-3.5 py-2 sm:px-5 sm:py-2.5 bg-primary-container text-on-primary-container hover:brightness-125 transition-all active:scale-95 font-label text-xs sm:text-sm uppercase tracking-widest rounded-xl cursor-pointer font-bold"
              aria-label="Increase HP"
            >
              Heal
            </button>
          </div>

          {/* Temp & Nonlethal status pills */}
          <div className="mt-3 md:mt-4 flex flex-wrap justify-center gap-2 sm:gap-3">
            {tempEdit === null ? (
              <button
                onClick={() => setTempEdit(String(session.tempHp))}
                className="px-3 py-1 bg-surface-container-lowest border border-white/10 rounded-lg sm:rounded-xl font-label text-[11px] sm:text-xs text-primary hover:bg-surface-container-high transition-all cursor-pointer"
              >
                TEMP HP: <span className="font-bold">{session.tempHp}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-surface-container-lowest border border-white/10 rounded-lg sm:rounded-xl px-2.5 py-0.5">
                <span className="font-label text-[11px] sm:text-xs text-primary">TEMP:</span>
                <input
                  autoFocus
                  type="number"
                  min={0}
                  value={tempEdit}
                  onChange={(e) => setTempEdit(e.target.value)}
                  onBlur={commitTemp}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitTemp()
                    if (e.key === 'Escape') setTempEdit(null)
                  }}
                  className="w-12 bg-transparent text-primary font-label text-xs text-center focus:outline-none border-b border-primary"
                />
              </div>
            )}
            {nlEdit === null ? (
              <button
                onClick={() => setNlEdit(String(session.nonlethalDamage))}
                className="px-3 py-1 bg-surface-container-lowest border border-white/10 rounded-lg sm:rounded-xl font-label text-[11px] sm:text-xs text-error hover:bg-surface-container-high transition-all cursor-pointer"
              >
                NONLETHAL: <span className="font-bold">{session.nonlethalDamage}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-surface-container-lowest border border-white/10 rounded-lg sm:rounded-xl px-2.5 py-0.5">
                <span className="font-label text-[11px] sm:text-xs text-error">NL:</span>
                <input
                  autoFocus
                  type="number"
                  min={0}
                  value={nlEdit}
                  onChange={(e) => setNlEdit(e.target.value)}
                  onBlur={commitNl}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitNl()
                    if (e.key === 'Escape') setNlEdit(null)
                  }}
                  className="w-12 bg-transparent text-error font-label text-xs text-center focus:outline-none border-b border-error"
                />
              </div>
            )}
          </div>
        </section>

        {/* Defense Grid: Expanded 3x3 with AC, CMD, CMB, Saves, Init, BAB, Speed */}
        <section className="lg:col-span-6 bg-surface-container/90 backdrop-blur-sm p-3 sm:p-4 md:p-5 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:border-primary/30 transition-all grid grid-cols-3 gap-2 sm:gap-2.5 md:gap-3">
          <DefenseCard
            label="Armor Class"
            value={effectiveAc.total}
            baseValue={char.armorClass.total}
            breakdown={detailedAc.totalBreakdown}
            notes={effectiveAc.notes}
            showSign={false}
            sub={`T: ${effectiveAc.touch} | FF: ${effectiveAc.flatFooted}`}
          />
          <DefenseCard
            label="CMD"
            value={maneuvers.cmd}
            breakdown={maneuvers.breakdownCmd}
            showSign={false}
            sub={`Touch AC: ${effectiveAc.touch}`}
            color="secondary"
          />
          <DefenseCard
            label="CMB"
            value={maneuvers.cmb}
            breakdown={maneuvers.breakdownCmb}
            sub="BAB+STR+Sz"
            color="primary"
            onRoll={() =>
              openRoll({
                diceType: 20,
                count: 1,
                modifier: maneuvers.cmb,
                label: 'Combat Maneuver Bonus (CMB)',
                breakdown: maneuvers.breakdownCmb,
              })
            }
          />
          <DefenseCard
            label="Fortitude"
            value={effectiveSaves.fort}
            baseValue={char.savingThrows.fort}
            breakdown={effectiveSaves.breakdowns.fortitude}
            sub={`BASE: +${char.savingThrows.fortBase} | CON: ${
              effectiveAbilities.mods.con >= 0 ? `+${effectiveAbilities.mods.con}` : effectiveAbilities.mods.con
            }`}
            color="secondary"
            onRoll={() =>
              openRoll({
                diceType: 20,
                count: 1,
                modifier: effectiveSaves.fort,
                label: 'Fortitude Save',
                breakdown: effectiveSaves.breakdowns.fortitude,
              })
            }
          />
          <DefenseCard
            label="Reflex"
            value={effectiveSaves.ref}
            baseValue={char.savingThrows.ref}
            breakdown={effectiveSaves.breakdowns.reflex}
            sub={`BASE: +${char.savingThrows.refBase} | DEX: ${
              effectiveAbilities.mods.dex >= 0 ? `+${effectiveAbilities.mods.dex}` : effectiveAbilities.mods.dex
            }`}
            color="secondary"
            onRoll={() =>
              openRoll({
                diceType: 20,
                count: 1,
                modifier: effectiveSaves.ref,
                label: 'Reflex Save',
                breakdown: effectiveSaves.breakdowns.reflex,
              })
            }
          />
          <DefenseCard
            label="Willpower"
            value={effectiveSaves.will}
            baseValue={char.savingThrows.will}
            breakdown={effectiveSaves.breakdowns.will}
            sub={`BASE: +${char.savingThrows.willBase} | WIS: ${
              effectiveAbilities.mods.wis >= 0 ? `+${effectiveAbilities.mods.wis}` : effectiveAbilities.mods.wis
            }`}
            color="secondary"
            onRoll={() =>
              openRoll({
                diceType: 20,
                count: 1,
                modifier: effectiveSaves.will,
                label: 'Will Save',
                breakdown: effectiveSaves.breakdowns.will,
              })
            }
          />
          <DefenseCard
            label="Initiative"
            value={effectiveInit}
            baseValue={char.initiativeBonus}
            breakdown={initBreakdown}
            sub={`DEX: ${effectiveAbilities.mods.dex >= 0 ? `+${effectiveAbilities.mods.dex}` : effectiveAbilities.mods.dex}`}
            color="primary"
            onRoll={() =>
              openRoll({
                diceType: 20,
                count: 1,
                modifier: effectiveInit,
                label: 'Initiative',
                breakdown: initBreakdown,
              })
            }
          />
          <DefenseCard
            label="BAB"
            value={char.baseAttackBonus[0] ?? 0}
            showSign={true}
            sub={babString}
            color="primary"
          />
          <DefenseCard
            label="Speed"
            value={`${char.speed} ft`}
            showSign={false}
            sub={speedSub}
            color="secondary"
          />
        </section>

        {/* Ability Score Grid: Compact 3x2 with dense cards */}
        <section className="lg:col-span-6 bg-surface-container/90 backdrop-blur-sm p-3 sm:p-4 md:p-5 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:border-primary/30 transition-all grid grid-cols-3 gap-2 sm:gap-2.5 md:gap-3">
          {ABILITY_KEYS.map((key) => {
            const baseScore = char.abilities[key]
            const effScore = effectiveAbilities.scores[key]
            const mod = effectiveAbilities.mods[key]
            const delta = effectiveAbilities.deltas[key]

            return (
              <button
                key={key}
                onClick={() =>
                  openRoll({
                    diceType: 20,
                    count: 1,
                    modifier: mod,
                    label: `${ABILITY_NAMES[key]} Check`,
                    breakdown: effectiveAbilities.breakdowns[key],
                  })
                }
                className="bg-surface-container hover:bg-surface-container-high rounded-xl p-2 sm:p-3 md:p-3.5 transition-all cursor-pointer group relative border border-white/5 hover:border-primary/40 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] text-left"
              >
                <div className="flex justify-between items-center mb-0.5">
                  <p className="font-label text-[9px] sm:text-[10px] text-tertiary uppercase tracking-wider font-bold">
                    {key.toUpperCase()}
                  </p>
                  {delta !== 0 ? (
                    <span
                      className={`font-label text-[9px] sm:text-[10px] font-bold ${
                        delta > 0 ? 'text-primary' : 'text-error'
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[10px] text-tertiary group-hover:text-primary transition-colors">
                      casino
                    </span>
                  )}
                </div>
                <p
                  className={`font-label text-xl sm:text-2xl md:text-3xl font-black leading-tight ${
                    delta < 0 ? 'text-error' : delta > 0 ? 'text-primary' : 'text-on-surface'
                  }`}
                >
                  {mod >= 0 ? `+${mod}` : mod}
                </p>
                <p className="font-label text-on-surface-variant text-[9px] sm:text-xs">
                  {effScore}
                  {effScore !== baseScore && (
                    <span className="opacity-50 ml-0.5">({baseScore})</span>
                  )}
                </p>
              </button>
            )
          })}
        </section>

        {/* Spell Slots */}
        {spellAvailability.levels.some((level) => level.total > 0) && (
          <section className="lg:col-span-12 bg-surface-container/90 backdrop-blur-sm p-3.5 sm:p-5 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(0,240,255,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-headline text-secondary text-xs sm:text-sm uppercase tracking-widest neon-glow-accent font-bold">
                Spell Slots
              </h2>
              <span className="font-label text-[10px] text-tertiary uppercase tracking-wider tabular-nums">
                {spellAvailability.remainingSlots}/{spellAvailability.totalSlots} remaining
              </span>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {spellAvailability.levels.filter((level) => level.total > 0).map((level) => {
                const spent = level.total - level.remaining
                return (
                  <div
                    key={level.level}
                    className="rounded-xl border border-white/10 bg-surface-container-high/40 px-2.5 py-1.5 sm:px-3 sm:py-2 hover:border-primary/30 transition-all flex flex-wrap items-center gap-1"
                    role="group"
                    aria-label={`Level ${level.level} Spells: ${level.remaining} of ${level.total} remaining`}
                  >
                    <span className="inline-flex items-center gap-1 font-label text-[9px] uppercase tracking-wider mr-1">
                      <span className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-secondary text-[8px] font-bold">
                        SLOT
                      </span>
                      <span className="text-tertiary font-semibold">L{level.level}</span>
                    </span>
                    <div className="flex flex-wrap items-center gap-0.5">
                      {Array.from({ length: level.total }).map((_, index) => {
                        const isSpent = index < spent
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() =>
                              isSpent
                                ? recoverSpellSlot(char.id, level.level)
                                : spendSpellSlot(char.id, level.level, level.total)
                            }
                            aria-label={`${isSpent ? 'Recover' : 'Spend'} level ${level.level} slot ${index + 1} of ${level.total}`}
                            aria-pressed={isSpent}
                            className="min-h-[40px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                          >
                            <span
                              className={`block transition-all group-hover:scale-110 ${
                                isSpent
                                  ? 'w-2.5 h-2.5 rounded-full border border-white/20 bg-surface-container-highest'
                                  : 'w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,240,255,0.55)]'
                              }`}
                            />
                          </button>
                        )
                      })}
                    </div>
                    <span className="font-label text-[10px] text-tertiary ml-1 tabular-nums">
                      {level.remaining}/{level.total}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Daily Resources */}
        {char.dailyResources.length > 0 && (
          <section className="lg:col-span-12 bg-surface-container/90 backdrop-blur-sm p-3.5 sm:p-5 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:border-primary/30 transition-all">
            <h2 className="font-headline text-secondary text-xs sm:text-sm uppercase tracking-widest mb-3 neon-glow-accent font-bold">
              Daily Resources
            </h2>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {char.dailyResources.map((res) => (
                <div
                  key={res.id}
                  className="rounded-xl border border-white/10 bg-surface-container-high/40 px-3 py-1.5 sm:px-3.5 sm:py-2 hover:border-primary/30 transition-all"
                >
                  <DailyResourcePips
                    characterId={char.id}
                    resource={res}
                    spent={spentByResource(res.id)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Conditions */}
        <section className="lg:col-span-12 bg-surface-container/90 backdrop-blur-sm p-3.5 sm:p-5 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline text-secondary text-xs sm:text-sm uppercase tracking-widest neon-glow-accent font-bold">
              Conditions
            </h2>
            <button
              onClick={() => setShowBuffModal(true)}
              className="font-label text-xs uppercase tracking-wider text-primary hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              Full Manager
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {ALL_CONDITIONS.map((condition) => {
              const active = session.conditions.includes(condition)
              const info = CONDITION_INFO[condition]
              return (
                <div key={condition} className="relative group flex items-center gap-1">
                  <button
                    onClick={() => toggleCondition(char.id, condition)}
                    className={`px-2.5 py-1 sm:px-3 sm:py-1.5 font-label text-[10px] sm:text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      active
                        ? 'bg-error text-white shadow-[0_0_12px_rgba(255,75,96,0.4)] font-bold border border-error'
                        : 'bg-surface-container-high text-tertiary hover:text-error hover:bg-error-container/20 border border-white/5'
                    }`}
                  >
                    {condition}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openInspector(
                        conditionInspectorItem(condition, () => toggleCondition(char.id, condition))
                      )
                    }
                    aria-label={`Inspect condition ${condition}`}
                    className="min-h-[32px] min-w-[32px] sm:min-h-[36px] sm:min-w-[36px] rounded-lg border border-white/10 text-tertiary hover:text-primary hover:border-primary/40 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-xs sm:text-sm">info</span>
                  </button>
                  {/* Hover tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-0 mb-2 w-64 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <div className="bg-black/95 backdrop-blur-md border border-error/40 p-3.5 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
                      <p className="font-headline text-error text-xs uppercase tracking-widest mb-1 font-bold">
                        {info.name}
                      </p>
                      <p className="font-body text-tertiary text-[11px] mb-2 leading-snug">
                        {info.summary}
                      </p>
                      <ul className="space-y-0.5">
                        {info.penalties.map((p, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-error/70 font-label text-[10px] mt-px flex-shrink-0">
                              ▸
                            </span>
                            <span className="font-label text-[10px] text-on-surface-variant leading-snug">
                              {p}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {session.conditions.length === 0 && (
            <p className="font-label text-xs text-tertiary/60 uppercase tracking-widest mt-2">
              No active conditions
            </p>
          )}
        </section>
      </div>

      {/* Unified Buff & Condition Manager Modal */}
      <BuffManagerModal
        isOpen={showBuffModal}
        onClose={() => setShowBuffModal(false)}
        initialTab="conditions"
      />
    </div>
  )
}

function DefenseCard({
  label,
  value,
  baseValue,
  sub,
  color = 'on-surface',
  showSign = true,
  breakdown,
  notes,
  onRoll,
}: {
  label: string
  value: number | string
  baseValue?: number
  sub: string
  color?: string
  showSign?: boolean
  breakdown?: { label: string; value: number }[]
  notes?: string[]
  onRoll?: () => void
}) {
  const textColor = COLOR_MAP[color] ?? 'text-on-surface'
  const displayVal =
    typeof value === 'number'
      ? showSign && value >= 0
        ? `+${value}`
        : `${value}`
      : value

  const isBuffed = typeof value === 'number' && baseValue !== undefined && value > baseValue
  const isPenalized = typeof value === 'number' && baseValue !== undefined && value < baseValue
  const valColor = isBuffed
    ? 'text-[#00daf3]'
    : isPenalized
    ? 'text-[#ffb4ab]'
    : 'text-on-surface'

  const cardContent = (
    <>
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <p className={`font-label text-[9px] sm:text-[10px] uppercase tracking-wider ${textColor} font-bold truncate`}>
          {label}
        </p>
        {onRoll && (
          <span className="material-symbols-outlined text-[10px] sm:text-xs text-tertiary group-hover:text-primary transition-colors flex-shrink-0">
            casino
          </span>
        )}
      </div>
      <p className={`font-label text-xl sm:text-2xl md:text-3xl font-black ${valColor} leading-tight`}>
        {displayVal}
      </p>
      <p className="font-label text-[8px] sm:text-[9px] text-on-surface-variant mt-0.5 font-mono truncate" title={sub}>
        {sub}
      </p>
    </>
  )

  const card = onRoll ? (
    <button
      onClick={onRoll}
      className="bg-surface-container hover:bg-surface-container-high rounded-xl border border-white/5 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)] p-2.5 sm:p-3 md:p-3.5 transition-all cursor-pointer group relative w-full text-left"
    >
      {cardContent}
    </button>
  ) : (
    <div className="bg-surface-container rounded-xl border border-white/5 p-2.5 sm:p-3 md:p-3.5 relative w-full">
      {cardContent}
    </div>
  )

  if (breakdown && breakdown.length > 0) {
    return (
      <StatBreakdownTooltip
        title={label}
        total={displayVal}
        breakdown={breakdown}
        notes={notes}
        className="w-full"
      >
        {card}
      </StatBreakdownTooltip>
    )
  }

  return card
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-64 text-tertiary font-label text-sm uppercase tracking-widest">
      No character selected
    </div>
  )
}
