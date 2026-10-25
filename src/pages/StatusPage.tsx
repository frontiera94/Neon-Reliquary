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
  const initBreakdown = [
    { label: 'Base Init', value: char.initiativeBonus },
    ...(effectiveAbilities.deltas.dex !== 0
      ? [{ label: 'DEX Shift', value: effectiveAbilities.deltas.dex }]
      : []),
  ]

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tactical Restrictions Banner */}
        {restrictions.length > 0 && (
          <div className="lg:col-span-12">
            <ActionAlertBanner restrictions={restrictions} />
          </div>
        )}

        {/* Bonded Companion Quick Banner */}
        {char.companions && char.companions.length > 0 && (() => {
          const activeCompanionId = session.activeCompanionId ?? char.companions[0]?.id
          const companion = char.companions.find((c) => c.id === activeCompanionId) ?? char.companions[0]
          return (
            <div className="lg:col-span-12 bg-surface-container/90 backdrop-blur-sm border border-primary/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-2xl">pets</span>
                <div>
                  <p className="font-headline text-sm font-bold text-on-surface">
                    Bonded Companion: <span className="text-secondary">{companion.name}</span>
                  </p>
                  <p className="font-label text-[10px] text-tertiary uppercase">
                    {companion.type.replace('_', ' ')} • {companion.species} • HP {session.companionHp?.[companion.id] ?? companion.maxHp} / {companion.maxHp}
                  </p>
                </div>
              </div>
              <Link
                to="/companion"
                className="px-4 py-2 bg-primary/10 border border-primary text-primary font-label text-xs uppercase tracking-widest rounded-xl hover:bg-primary/20 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all flex items-center gap-2 cursor-pointer"
              >
                Open Companion Sheet
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </Link>
            </div>
          )
        })()}

        {/* Vitality Core */}
        <section className="lg:col-span-12 flex flex-col items-center justify-center bg-surface-container/90 backdrop-blur-sm p-8 relative overflow-hidden group rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(0,240,255,0.08)] hover:border-primary/40 hover:shadow-[0_0_30px_rgba(0,240,255,0.2)] transition-all">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none" />
          <h2 className="font-headline text-secondary text-lg mb-8 uppercase tracking-widest neon-glow-accent font-bold">
            Vitality Core
          </h2>
          <div className="text-center">
            <div
              className="font-label font-black text-primary"
              style={{ fontSize: '5rem', lineHeight: 1, textShadow: '0 0 30px rgba(0,240,255,0.4)' }}
            >
              {hp}
            </div>
            {vitalStatus !== 'conscious' && (
              <div className="mt-2">
                <span
                  className={`px-3 py-1 rounded-full font-label text-xs uppercase tracking-widest font-black inline-flex items-center gap-1.5 ${
                    vitalStatus === 'dead'
                      ? 'bg-black text-error border border-error/60 shadow-[0_0_15px_rgba(255,75,96,0.6)]'
                      : vitalStatus === 'dying'
                        ? 'bg-error text-white shadow-[0_0_15px_rgba(255,75,96,0.5)] animate-pulse'
                        : 'bg-amber-400 text-surface font-bold shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">
                    {vitalStatus === 'dead' ? 'skull' : 'warning'}
                  </span>
                  {vitalStatus === 'dead' ? 'Dead' : vitalStatus === 'dying' ? 'Dying' : 'Disabled (0 HP)'}
                </span>
              </div>
            )}
            <div className="font-label text-tertiary tracking-widest uppercase mt-2 text-xs">
              Current Hit Points
            </div>
            <div className="font-label text-on-surface-variant text-sm mt-1">/ {maxHp}</div>
          </div>
          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={() => adjustHp(char.id, -hpDelta, maxHp)}
              className="px-5 py-3 bg-error-container text-on-error-container hover:brightness-125 transition-all active:scale-95 font-label text-sm uppercase tracking-widest rounded-xl cursor-pointer"
              aria-label="Decrease HP"
            >
              Damage
            </button>
            <input
              type="number"
              min={1}
              value={hpDelta}
              onChange={(e) => setHpDelta(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 bg-surface-container-high text-on-surface font-label text-xl font-bold text-center py-3 rounded-xl border border-white/10 focus:border-primary focus:outline-none"
            />
            <button
              onClick={() => adjustHp(char.id, hpDelta, maxHp)}
              className="px-5 py-3 bg-primary-container text-on-primary-container hover:brightness-125 transition-all active:scale-95 font-label text-sm uppercase tracking-widest rounded-xl cursor-pointer"
              aria-label="Increase HP"
            >
              Heal
            </button>
          </div>
          <div className="mt-8 flex gap-4">
            {tempEdit === null ? (
              <button
                onClick={() => setTempEdit(String(session.tempHp))}
                className="px-4 py-2 bg-surface-container-lowest border border-white/10 rounded-xl font-label text-xs text-primary hover:bg-surface-container-high transition-all cursor-pointer"
              >
                TEMP HP: {session.tempHp}
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-surface-container-lowest border border-white/10 rounded-xl px-3 py-1">
                <span className="font-label text-xs text-primary">TEMP HP:</span>
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
                  className="w-14 bg-transparent text-primary font-label text-xs text-center focus:outline-none border-b border-primary"
                />
              </div>
            )}
            {nlEdit === null ? (
              <button
                onClick={() => setNlEdit(String(session.nonlethalDamage))}
                className="px-4 py-2 bg-surface-container-lowest border border-white/10 rounded-xl font-label text-xs text-error hover:bg-surface-container-high transition-all cursor-pointer"
              >
                NONLETHAL: {session.nonlethalDamage}
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-surface-container-lowest border border-white/10 rounded-xl px-3 py-1">
                <span className="font-label text-xs text-error">NONLETHAL:</span>
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
                  className="w-14 bg-transparent text-error font-label text-xs text-center focus:outline-none border-b border-error"
                />
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => longRest(char.id, maxHp)}
              className="px-6 py-2.5 bg-surface-container-highest border border-white/10 rounded-xl font-label text-xs text-secondary uppercase tracking-widest hover:bg-primary/10 hover:text-primary hover:border-primary/40 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm align-middle mr-1">bedtime</span>
              Long Rest
            </button>
            <button
              onClick={() => setShowBuffModal(true)}
              className="px-5 py-2.5 bg-primary/10 border border-primary/40 text-primary font-label text-xs uppercase tracking-widest rounded-xl hover:bg-primary/20 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              Buffs & Presets
            </button>
          </div>
        </section>

        {/* Defense Grid */}
        <section className="lg:col-span-6 bg-surface-container/90 backdrop-blur-sm p-5 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:border-primary/30 transition-all grid grid-cols-2 gap-4">
          <DefenseCard
            label="Armor Class"
            value={effectiveAc.total}
            baseValue={char.armorClass.total}
            breakdown={detailedAc.totalBreakdown}
            notes={effectiveAc.notes}
            showSign={false}
            sub={`TOUCH: ${effectiveAc.touch} | FLAT: ${effectiveAc.flatFooted}${
              effectiveAc.notes.length > 0 ? ` (${effectiveAc.notes.join(', ')})` : ''
            }`}
          />
          <DefenseCard
            label="Initiative"
            value={effectiveInit}
            baseValue={char.initiativeBonus}
            breakdown={initBreakdown}
            sub={`DEX: ${effectiveAbilities.mods.dex >= 0 ? `+${effectiveAbilities.mods.dex}` : effectiveAbilities.mods.dex} | MISC: +${
              char.initiativeBonus - abilityMod(char.abilities.dex)
            }`}
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
        </section>

        {/* Ability Score Grid */}
        <section className="lg:col-span-6 bg-surface-container/90 backdrop-blur-sm p-5 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:border-primary/30 transition-all grid grid-cols-3 gap-3">
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
                className="bg-surface-container hover:bg-surface-container-high rounded-xl p-4 transition-all cursor-pointer group relative border border-white/5 hover:border-primary/40 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] text-left"
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="font-label text-[10px] text-tertiary uppercase tracking-widest font-bold">
                    {key.toUpperCase()}
                  </p>
                  {delta !== 0 && (
                    <span
                      className={`font-label text-[10px] font-bold ${
                        delta > 0 ? 'text-primary' : 'text-error'
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  )}
                </div>
                <p
                  className={`font-label text-3xl font-black ${
                    delta < 0 ? 'text-error' : delta > 0 ? 'text-primary' : 'text-on-surface'
                  }`}
                >
                  {mod >= 0 ? `+${mod}` : mod}
                </p>
                <p className="font-label text-on-surface-variant text-xs">
                  {effScore}
                  {effScore !== baseScore && (
                    <span className="opacity-50 ml-1">({baseScore})</span>
                  )}
                </p>
              </button>
            )
          })}
        </section>

        {/* Spell Slots */}
        {spellAvailability.levels.some((level) => level.total > 0) && (
          <section className="lg:col-span-12 bg-surface-container/90 backdrop-blur-sm p-6 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(0,240,255,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="font-headline text-secondary text-sm uppercase tracking-widest neon-glow-accent font-bold">
                Spell Slots
              </h2>
              <span className="font-label text-[10px] text-tertiary uppercase tracking-wider tabular-nums">
                {spellAvailability.remainingSlots}/{spellAvailability.totalSlots} remaining
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {spellAvailability.levels.filter((level) => level.total > 0).map((level) => {
                const spent = level.total - level.remaining
                return (
                  <div
                    key={level.level}
                    className="rounded-xl border border-white/10 bg-surface-container-high/40 px-3.5 py-2 hover:border-primary/30 transition-all flex flex-wrap items-center gap-1"
                    role="group"
                    aria-label={`Level ${level.level} Spells: ${level.remaining} of ${level.total} remaining`}
                  >
                    <span className="inline-flex items-center gap-1 font-label text-[9px] uppercase tracking-wider mr-1">
                      <span className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-secondary text-[8px] font-bold">
                        SLOT
                      </span>
                      <span className="text-tertiary font-semibold">LEVEL {level.level}</span>
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
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
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
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
          <section className="lg:col-span-12 bg-surface-container/90 backdrop-blur-sm p-6 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:border-primary/30 transition-all">
            <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-4 neon-glow-accent font-bold">
              Daily Resources
            </h2>
            <div className="flex flex-wrap gap-3">
              {char.dailyResources.map((res) => (
                <div
                  key={res.id}
                  className="rounded-xl border border-white/10 bg-surface-container-high/40 px-3.5 py-2 hover:border-primary/30 transition-all"
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
        <section className="lg:col-span-12 bg-surface-container/90 backdrop-blur-sm p-6 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-headline text-secondary text-sm uppercase tracking-widest neon-glow-accent font-bold">
              Conditions
            </h2>
            <button
              onClick={() => setShowBuffModal(true)}
              className="font-label text-xs uppercase tracking-wider text-primary hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              Open Full Manager
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {ALL_CONDITIONS.map((condition) => {
              const active = session.conditions.includes(condition)
              const info = CONDITION_INFO[condition]
              return (
                <div key={condition} className="relative group flex items-center gap-1">
                  <button
                    onClick={() => toggleCondition(char.id, condition)}
                    className={`px-3.5 py-1.5 font-label text-xs uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
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
                    className="min-h-[36px] min-w-[36px] rounded-lg border border-white/10 text-tertiary hover:text-primary hover:border-primary/40 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-sm">info</span>
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
  value: number
  baseValue?: number
  sub: string
  color?: string
  showSign?: boolean
  breakdown?: { label: string; value: number }[]
  notes?: string[]
  onRoll?: () => void
}) {
  const textColor = COLOR_MAP[color] ?? 'text-on-surface'
  const displayVal = showSign && value >= 0 ? `+${value}` : `${value}`

  const isBuffed = baseValue !== undefined && value > baseValue
  const isPenalized = baseValue !== undefined && value < baseValue
  const valColor = isBuffed
    ? 'text-[#00daf3]'
    : isPenalized
    ? 'text-[#ffb4ab]'
    : 'text-on-surface'

  const cardContent = (
    <>
      <p className={`font-label text-[10px] uppercase tracking-widest ${textColor} font-bold`}>{label}</p>
      <p className={`font-label text-4xl font-black ${valColor}`}>
        {displayVal}
      </p>
      <p className="font-label text-[10px] text-on-surface-variant mt-1 font-mono">{sub}</p>
    </>
  )

  const card = onRoll ? (
    <button
      onClick={onRoll}
      className="bg-surface-container hover:bg-surface-container-high rounded-xl border border-white/5 hover:border-primary/40 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] p-5 transition-all cursor-pointer group relative w-full text-left"
    >
      {cardContent}
    </button>
  ) : (
    <div className="bg-surface-container rounded-xl border border-white/5 p-5 relative w-full">
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
