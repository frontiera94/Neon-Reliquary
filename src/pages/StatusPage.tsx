import { useState } from 'react'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import { abilityMod } from '../lib/dice-engine'
import { CONDITION_INFO } from '../lib/conditions'
import {
  calcEffectiveAbilities,
  calcEffectiveArmorClass,
  calcEffectiveSaves,
  getActiveActionRestrictions,
} from '../lib/stat-calc'
import { ActionAlertBanner } from '../components/combat/ActionAlertBanner'
import { BuffManagerModal } from '../components/combat/BuffManagerModal'
import type { ConditionType } from '../types/combat'

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
    setResourceSpent,
    setTempHp,
    toggleCondition,
    longRest,
  } = useSessionStore()
  const openRoll = useDiceStore((s) => s.openRoll)

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

  const hp = session.currentHp
  const maxHp = char.maxHp

  const spentByResource = (id: string) => session.spentResources[id] ?? 0

  function handleSquareClick(resourceId: string, index: number, spent: number) {
    const newAmount = index < spent ? index : index + 1
    setResourceSpent(char!.id, resourceId, newAmount)
  }

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

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tactical Restrictions Banner */}
        {restrictions.length > 0 && (
          <div className="lg:col-span-12">
            <ActionAlertBanner restrictions={restrictions} />
          </div>
        )}

        {/* Vitality Core */}
        <section className="lg:col-span-12 flex flex-col items-center justify-center bg-surface-container p-8 relative overflow-hidden group border border-primary shadow-[0_0_15px_rgba(0,218,243,0.1)] hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-all">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none" />
          <h2 className="font-headline text-secondary text-lg mb-8 uppercase tracking-widest neon-glow-gold">
            Vitality Core
          </h2>
          <div className="text-center">
            <div
              className="font-label font-black text-primary"
              style={{ fontSize: '5rem', lineHeight: 1, textShadow: '0 0 25px rgba(0,218,243,0.3)' }}
            >
              {hp}
            </div>
            <div className="font-label text-tertiary tracking-widest uppercase mt-2 text-xs">
              Current Hit Points
            </div>
            <div className="font-label text-on-surface-variant text-sm mt-1">/ {maxHp}</div>
          </div>
          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={() => adjustHp(char.id, -hpDelta, maxHp)}
              className="px-5 py-3 bg-error-container text-on-error-container hover:brightness-125 transition-all active:scale-95 font-label text-sm uppercase tracking-widest cursor-pointer"
              aria-label="Decrease HP"
            >
              Damage
            </button>
            <input
              type="number"
              min={1}
              value={hpDelta}
              onChange={(e) => setHpDelta(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 bg-surface-container-high text-on-surface font-label text-xl font-bold text-center py-3 border border-outline-variant/50 focus:border-primary focus:outline-none"
            />
            <button
              onClick={() => adjustHp(char.id, hpDelta, maxHp)}
              className="px-5 py-3 bg-primary-container text-on-primary-container hover:brightness-125 transition-all active:scale-95 font-label text-sm uppercase tracking-widest cursor-pointer"
              aria-label="Increase HP"
            >
              Heal
            </button>
          </div>
          <div className="mt-8 flex gap-4">
            {tempEdit === null ? (
              <button
                onClick={() => setTempEdit(String(session.tempHp))}
                className="px-4 py-2 bg-surface-container-lowest font-label text-xs text-primary hover:bg-surface-container-high transition-all cursor-pointer"
              >
                TEMP HP: {session.tempHp}
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-surface-container-lowest px-2">
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
                className="px-4 py-2 bg-surface-container-lowest font-label text-xs text-error hover:bg-surface-container-high transition-all cursor-pointer"
              >
                NONLETHAL: {session.nonlethalDamage}
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-surface-container-lowest px-2">
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
              className="px-6 py-2 bg-surface-container-highest font-label text-xs text-secondary uppercase tracking-widest hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_15px_rgba(0,218,243,0.3)] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm align-middle mr-1">bedtime</span>
              Long Rest
            </button>
            <button
              onClick={() => setShowBuffModal(true)}
              className="px-5 py-2 bg-primary/10 border border-primary text-primary font-label text-xs uppercase tracking-widest hover:bg-primary/20 hover:shadow-[0_0_15px_rgba(0,218,243,0.3)] transition-all flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              Buffs & Presets
            </button>
          </div>
        </section>

        {/* Defense Grid */}
        <section className="lg:col-span-6 bg-surface-container p-4 border border-primary shadow-[0_0_15px_rgba(0,218,243,0.1)] hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-all grid grid-cols-2 gap-4">
          <DefenseCard
            label="Armor Class"
            value={effectiveAc.total}
            sub={`TOUCH: ${effectiveAc.touch} | FLAT: ${effectiveAc.flatFooted}${
              effectiveAc.notes.length > 0 ? ` (${effectiveAc.notes.join(', ')})` : ''
            }`}
          />
          <DefenseCard
            label="Initiative"
            value={effectiveInit}
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
                breakdown: [
                  { label: 'Base Init', value: char.initiativeBonus },
                  ...(effectiveAbilities.deltas.dex !== 0
                    ? [{ label: 'DEX Shift', value: effectiveAbilities.deltas.dex }]
                    : []),
                ],
              })
            }
          />
          <DefenseCard
            label="Fortitude"
            value={effectiveSaves.fort}
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
        <section className="lg:col-span-6 bg-surface-container p-4 border border-primary shadow-[0_0_15px_rgba(0,218,243,0.1)] hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-all grid grid-cols-3 gap-4">
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
                className="bg-surface-container hover:bg-surface-container-high hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] p-4 transition-all cursor-pointer group relative border-b-2 border-transparent hover:border-primary text-left"
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="font-label text-[10px] text-tertiary uppercase tracking-widest">
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
                  className={`font-label text-3xl font-bold ${
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

        {/* Daily Resources */}
        {char.dailyResources.length > 0 && (
          <section className="lg:col-span-12 bg-surface-container p-6 border border-primary shadow-[0_0_15px_rgba(0,218,243,0.1)] hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-all">
            <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-6 neon-glow-gold">
              Daily Resources
            </h2>
            <div className="flex flex-wrap gap-8">
              {char.dailyResources.map((res) => {
                const spent = spentByResource(res.id)
                const squareSize = res.total > 8 ? 'w-4 h-4' : 'w-8 h-8'
                return (
                  <div key={res.id}>
                    <p className="font-label text-[10px] text-tertiary uppercase tracking-widest mb-2">
                      {res.name}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: res.total }).map((_, i) => {
                        const isSpent = i < spent
                        return (
                          <button
                            key={i}
                            onClick={() => handleSquareClick(res.id, i, spent)}
                            className={`${squareSize} border transition-all cursor-pointer ${
                              isSpent
                                ? 'bg-surface-container-highest border-outline-variant/30 hover:border-primary/50'
                                : 'bg-primary border-primary hover:brightness-125 shadow-[0_0_8px_rgba(0,218,243,0.4)]'
                            }`}
                            aria-label={`Toggle square ${i + 1} of ${res.name}`}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Conditions */}
        <section className="lg:col-span-12 bg-surface-container p-6 border border-primary shadow-[0_0_15px_rgba(0,218,243,0.1)] hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-all">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-headline text-secondary text-sm uppercase tracking-widest neon-glow-gold">
              Conditions
            </h2>
            <button
              onClick={() => setShowBuffModal(true)}
              className="font-label text-xs uppercase tracking-wider text-primary hover:text-white flex items-center gap-1 cursor-pointer"
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
                <div key={condition} className="relative group">
                  <button
                    onClick={() => toggleCondition(char.id, condition)}
                    className={`px-4 py-2 font-label text-xs uppercase tracking-widest transition-all cursor-pointer ${
                      active
                        ? 'bg-error text-on-error shadow-[0_0_10px_rgba(255,180,171,0.4)] font-bold'
                        : 'bg-surface-container-high text-tertiary hover:text-error hover:bg-error-container'
                    }`}
                  >
                    {condition}
                  </button>
                  {/* Hover tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-0 mb-2 w-64 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <div className="bg-black border border-error/40 p-3 shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
                      <p className="font-headline text-error text-xs uppercase tracking-widest mb-1">
                        {info.name}
                      </p>
                      <p className="font-body text-tertiary text-[11px] mb-2 leading-snug">
                        {info.summary}
                      </p>
                      <ul className="space-y-0.5">
                        {info.penalties.map((p, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-error/50 font-label text-[10px] mt-px flex-shrink-0">
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
            <p className="font-label text-xs text-tertiary/50 uppercase tracking-widest mt-2">
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
  sub,
  color = 'on-surface',
  onRoll,
}: {
  label: string
  value: number
  sub: string
  color?: string
  onRoll?: () => void
}) {
  if (onRoll) {
    return (
      <button
        onClick={onRoll}
        className="bg-surface-container hover:bg-surface-container-high hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] p-6 transition-all cursor-pointer group relative w-full text-left"
      >
        <p className={`font-label text-[10px] uppercase tracking-widest text-${color}`}>{label}</p>
        <p className="font-label text-4xl font-bold text-on-surface">
          {value >= 0 ? `+${value}` : value}
        </p>
        <p className="font-label text-[10px] text-on-surface-variant mt-1">{sub}</p>
      </button>
    )
  }

  return (
    <div className="bg-surface-container p-6 relative w-full">
      <p className={`font-label text-[10px] uppercase tracking-widest text-${color}`}>{label}</p>
      <p className="font-label text-4xl font-bold text-on-surface">
        {value >= 0 ? `+${value}` : value}
      </p>
      <p className="font-label text-[10px] text-on-surface-variant mt-1">{sub}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-64 text-tertiary font-label text-sm uppercase tracking-widest">
      No character selected
    </div>
  )
}
