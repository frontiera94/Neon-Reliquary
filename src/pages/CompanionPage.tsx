import { useState } from 'react'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import { abilityMod, parseDiceFormula } from '../lib/dice-engine'
import { CONDITION_INFO } from '../lib/conditions'
import type { ConditionType } from '../types/combat'
import type { Companion } from '../types/companion'

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

export function CompanionPage() {
  const char = useCharacterStore((s) => s.activeCharacter())
  const session = useSessionStore((s) => (char ? s.getSession(char.id) : null))
  const {
    adjustCompanionHp,
    setCompanionTempHp,
    toggleCompanionCondition,
    setActiveCompanion,
    initSession,
  } = useSessionStore()
  const openRoll = useDiceStore((s) => s.openRoll)

  const [hpDelta, setHpDelta] = useState(1)
  const [tempEdit, setTempEdit] = useState<string | null>(null)
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null)

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

  const companions: Companion[] = char.companions ?? []

  if (companions.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-3xl">pets</span>
        </div>
        <h2 className="font-headline text-2xl text-on-surface font-bold">
          No Companion Manifested
        </h2>
        <p className="font-body text-sm text-tertiary leading-relaxed">
          {char.name} does not currently have an active animal companion, familiar, or eidolon
          bound to their neural weave.
        </p>
      </div>
    )
  }

  const activeCompanion: Companion =
    companions.find((c) => c.id === (selectedCompanionId ?? session.activeCompanionId ?? companions[0]?.id)) ??
    companions[0]

  const currentHp = session.companionHp?.[activeCompanion.id] ?? activeCompanion.maxHp
  const tempHp = session.companionTempHp?.[activeCompanion.id] ?? 0
  const activeConditions = session.companionConditions?.[activeCompanion.id] ?? []

  // Dynamic condition penalties on companion
  const conditionAttackMod =
    (activeConditions.includes('shaken') || activeConditions.includes('frightened') ? -2 : 0) +
    (activeConditions.includes('sickened') ? -2 : 0) +
    (activeConditions.includes('prone') ? -4 : 0)

  const conditionDamageMod = activeConditions.includes('sickened') ? -2 : 0

  const conditionSaveMod =
    (activeConditions.includes('shaken') || activeConditions.includes('frightened') ? -2 : 0) +
    (activeConditions.includes('sickened') ? -2 : 0)

  const conditionSkillMod =
    (activeConditions.includes('shaken') || activeConditions.includes('frightened') ? -2 : 0) +
    (activeConditions.includes('sickened') ? -2 : 0)

  const conditionAcMod =
    (activeConditions.includes('blinded') ? -2 : 0) +
    (activeConditions.includes('stunned') ? -2 : 0)

  function handleSelectCompanion(comp: Companion) {
    setSelectedCompanionId(comp.id)
    setActiveCompanion(char!.id, comp.id)
  }

  function commitTemp() {
    if (tempEdit === null) return
    const val = parseInt(tempEdit)
    if (!isNaN(val) && val >= 0) {
      setCompanionTempHp(char!.id, activeCompanion.id, val)
    }
    setTempEdit(null)
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Multi-companion Switcher Tabs */}
      {companions.length > 1 && (
        <div className="flex border-b border-outline-variant/30 gap-2 pb-2">
          {companions.map((comp) => {
            const isSelected = comp.id === activeCompanion.id
            return (
              <button
                key={comp.id}
                onClick={() => handleSelectCompanion(comp)}
                className={`px-4 py-2 font-label text-xs uppercase tracking-wider transition-all flex items-center gap-2 border cursor-pointer ${
                  isSelected
                    ? 'border-primary text-primary bg-primary/10 shadow-[0_0_15px_rgba(0,218,243,0.2)]'
                    : 'border-outline-variant/30 text-tertiary hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">pets</span>
                {comp.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Companion Profile Header */}
      <header className="bg-surface-container p-6 border border-primary shadow-[0_0_20px_rgba(0,218,243,0.15)] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />

        <div className="flex items-center gap-5 relative z-10 w-full md:w-auto">
          {activeCompanion.portrait ? (
            <img
              src={activeCompanion.portrait}
              alt={activeCompanion.name}
              className="w-20 h-20 object-cover border-2 border-primary/50 flex-shrink-0 shadow-[0_0_15px_rgba(0,218,243,0.3)]"
            />
          ) : (
            <div className="w-20 h-20 bg-surface-container-high border-2 border-primary/40 flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-symbols-outlined text-4xl">pets</span>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-label text-[10px] uppercase px-2 py-0.5 bg-primary/20 text-primary border border-primary/40">
                {activeCompanion.type.replace('_', ' ')}
              </span>
              <span className="font-label text-[10px] uppercase px-2 py-0.5 bg-secondary/20 text-secondary border border-secondary/40">
                {activeCompanion.size} {activeCompanion.species}
              </span>
              {activeCompanion.hitDice && (
                <span className="font-label text-[10px] uppercase px-2 py-0.5 bg-surface-container-high text-tertiary border border-outline-variant/30">
                  {activeCompanion.hitDice}
                </span>
              )}
            </div>

            <h1 className="font-headline text-3xl font-bold text-on-surface mt-1">
              {activeCompanion.name}
            </h1>
            <p className="font-label text-xs text-tertiary tracking-wider mt-0.5">
              Speed: {activeCompanion.speed} • BAB: +{activeCompanion.baseAttackBonus}
              {activeCompanion.senses ? ` • Senses: ${activeCompanion.senses}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto justify-end">
          <div className="text-right">
            <span className="font-label text-[10px] text-tertiary uppercase tracking-widest block">
              Bound Master
            </span>
            <span className="font-headline text-primary font-bold">{char.name}</span>
          </div>
        </div>
      </header>

      {/* Main Grid: Vitality & Defenses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Vitality Core */}
        <section className="lg:col-span-6 bg-surface-container p-6 border border-primary shadow-[0_0_15px_rgba(0,218,243,0.1)] flex flex-col items-center justify-center text-center relative overflow-hidden">
          <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-4 neon-glow-gold">
            Vitality Core
          </h2>

          <div
            className="font-label font-black text-primary"
            style={{ fontSize: '4.5rem', lineHeight: 1, textShadow: '0 0 25px rgba(0,218,243,0.3)' }}
          >
            {currentHp}
          </div>
          <div className="font-label text-tertiary tracking-widest uppercase mt-2 text-xs">
            Hit Points / {activeCompanion.maxHp}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => adjustCompanionHp(char.id, activeCompanion.id, -hpDelta, activeCompanion.maxHp)}
              className="px-4 py-2 bg-error-container text-on-error-container hover:brightness-125 transition-all font-label text-xs uppercase tracking-widest cursor-pointer"
              aria-label="Decrease companion HP"
            >
              Damage
            </button>
            <input
              type="number"
              min={1}
              value={hpDelta}
              onChange={(e) => setHpDelta(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 bg-surface-container-high text-on-surface font-label text-lg font-bold text-center py-2 border border-outline-variant/50 focus:border-primary focus:outline-none"
            />
            <button
              onClick={() => adjustCompanionHp(char.id, activeCompanion.id, hpDelta, activeCompanion.maxHp)}
              className="px-4 py-2 bg-primary-container text-on-primary-container hover:brightness-125 transition-all font-label text-xs uppercase tracking-widest cursor-pointer"
              aria-label="Increase companion HP"
            >
              Heal
            </button>
          </div>

          <div className="mt-4">
            {tempEdit === null ? (
              <button
                onClick={() => setTempEdit(String(tempHp))}
                className="px-3 py-1.5 bg-surface-container-lowest font-label text-xs text-primary hover:bg-surface-container-high transition-all cursor-pointer border border-primary/20"
              >
                TEMP HP: {tempHp}
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-surface-container-lowest px-2 py-1 border border-primary">
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
                  className="w-12 bg-transparent text-primary font-label text-xs text-center focus:outline-none"
                />
              </div>
            )}
          </div>
        </section>

        {/* Defense Grid */}
        <section className="lg:col-span-6 bg-surface-container p-4 border border-primary shadow-[0_0_15px_rgba(0,218,243,0.1)] grid grid-cols-2 gap-3">
          <div className="bg-surface-container-low p-4">
            <p className="font-label text-[10px] uppercase tracking-widest text-tertiary">
              Armor Class
            </p>
            <p className="font-label text-3xl font-bold text-on-surface mt-1">
              {activeCompanion.armorClass.total + conditionAcMod}
            </p>
            <p className="font-label text-[10px] text-on-surface-variant mt-1">
              TOUCH: {activeCompanion.armorClass.touch + conditionAcMod} | FLAT:{' '}
              {activeCompanion.armorClass.flatFooted + conditionAcMod}
            </p>
          </div>

          <button
            onClick={() =>
              openRoll({
                diceType: 20,
                count: 1,
                modifier: activeCompanion.initiativeBonus,
                label: `${activeCompanion.name} Initiative`,
              })
            }
            className="bg-surface-container-low p-4 text-left hover:bg-surface-container-high transition-all cursor-pointer group"
          >
            <p className="font-label text-[10px] uppercase tracking-widest text-primary">
              Initiative
            </p>
            <p className="font-label text-3xl font-bold text-primary mt-1">
              +{activeCompanion.initiativeBonus}
            </p>
            <p className="font-label text-[10px] text-tertiary mt-1">Click to roll d20</p>
          </button>

          <button
            onClick={() =>
              openRoll({
                diceType: 20,
                count: 1,
                modifier: activeCompanion.savingThrows.fort + conditionSaveMod,
                label: `${activeCompanion.name} Fortitude`,
                breakdown: [
                  { label: 'Base Fort', value: activeCompanion.savingThrows.fort },
                  ...(conditionSaveMod !== 0 ? [{ label: 'Conditions', value: conditionSaveMod }] : []),
                ],
              })
            }
            className="bg-surface-container-low p-4 text-left hover:bg-surface-container-high transition-all cursor-pointer group"
          >
            <p className="font-label text-[10px] uppercase tracking-widest text-secondary">
              Fortitude
            </p>
            <p className="font-label text-2xl font-bold text-on-surface mt-1">
              +{activeCompanion.savingThrows.fort + conditionSaveMod}
            </p>
            <p className="font-label text-[10px] text-tertiary mt-0.5">Fort Save</p>
          </button>

          <button
            onClick={() =>
              openRoll({
                diceType: 20,
                count: 1,
                modifier: activeCompanion.savingThrows.ref + conditionSaveMod,
                label: `${activeCompanion.name} Reflex`,
                breakdown: [
                  { label: 'Base Ref', value: activeCompanion.savingThrows.ref },
                  ...(conditionSaveMod !== 0 ? [{ label: 'Conditions', value: conditionSaveMod }] : []),
                ],
              })
            }
            className="bg-surface-container-low p-4 text-left hover:bg-surface-container-high transition-all cursor-pointer group"
          >
            <p className="font-label text-[10px] uppercase tracking-widest text-secondary">
              Reflex
            </p>
            <p className="font-label text-2xl font-bold text-on-surface mt-1">
              +{activeCompanion.savingThrows.ref + conditionSaveMod}
            </p>
            <p className="font-label text-[10px] text-tertiary mt-0.5">Reflex Save</p>
          </button>

          <button
            onClick={() =>
              openRoll({
                diceType: 20,
                count: 1,
                modifier: activeCompanion.savingThrows.will + conditionSaveMod,
                label: `${activeCompanion.name} Will`,
                breakdown: [
                  { label: 'Base Will', value: activeCompanion.savingThrows.will },
                  ...(conditionSaveMod !== 0 ? [{ label: 'Conditions', value: conditionSaveMod }] : []),
                ],
              })
            }
            className="col-span-2 bg-surface-container-low p-4 text-left hover:bg-surface-container-high transition-all cursor-pointer group"
          >
            <p className="font-label text-[10px] uppercase tracking-widest text-secondary">
              Willpower
            </p>
            <p className="font-label text-2xl font-bold text-on-surface mt-1">
              +{activeCompanion.savingThrows.will + conditionSaveMod}
            </p>
            <p className="font-label text-[10px] text-tertiary mt-0.5">Will Save</p>
          </button>
        </section>
      </div>

      {/* Ability Scores Grid */}
      <section className="bg-surface-container p-6 border border-primary shadow-[0_0_15px_rgba(0,218,243,0.1)]">
        <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-4 neon-glow-gold">
          Companion Ability Scores
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {ABILITY_KEYS.map((key) => {
            const score = activeCompanion.abilities[key]
            const mod = abilityMod(score)
            return (
              <button
                key={key}
                onClick={() =>
                  openRoll({
                    diceType: 20,
                    count: 1,
                    modifier: mod,
                    label: `${activeCompanion.name} ${ABILITY_NAMES[key]} Check`,
                  })
                }
                className="bg-surface-container-low p-3 hover:bg-surface-container-high hover:shadow-[0_0_15px_rgba(0,218,243,0.3)] transition-all text-center cursor-pointer border border-transparent hover:border-primary"
              >
                <span className="font-label text-[10px] text-tertiary uppercase block">
                  {key.toUpperCase()}
                </span>
                <span className="font-label text-2xl font-black text-primary block my-1">
                  {mod >= 0 ? `+${mod}` : mod}
                </span>
                <span className="font-label text-xs text-on-surface-variant block">{score}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Natural Attacks */}
      <section className="bg-surface-container p-6 border border-primary shadow-[0_0_15px_rgba(0,218,243,0.1)]">
        <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-4 neon-glow-gold">
          Natural Attacks & Tactics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeCompanion.attacks.map((atk, index) => {
            const totalAttack = atk.bonus + conditionAttackMod
            const critRange = atk.critRange ?? 20
            const critMult = atk.critMultiplier ?? 2

            return (
              <div
                key={index}
                className="bg-surface-container-low p-5 border-l-4 border-l-primary border border-outline-variant/20 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-headline text-xl font-bold text-on-surface">{atk.name}</h3>
                    <span className="font-label text-xs text-secondary border border-secondary/30 px-2 py-0.5">
                      {critRange < 20 ? `${critRange}-20` : '20'}/x{critMult}
                    </span>
                  </div>

                  {atk.damageType && (
                    <p className="font-label text-[11px] text-tertiary uppercase tracking-wider mb-2">
                      Type: {atk.damageType}
                    </p>
                  )}

                  {atk.notes && (
                    <p className="font-body text-xs text-on-surface-variant/90 mb-4 bg-surface-container-high/40 p-2 border-l-2 border-primary/50">
                      {atk.notes}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() =>
                      openRoll({
                        diceType: 20,
                        count: 1,
                        modifier: totalAttack,
                        label: `${activeCompanion.name} ${atk.name} Attack`,
                        critRange,
                        breakdown: [
                          { label: 'Base Attack', value: atk.bonus },
                          ...(conditionAttackMod !== 0
                            ? [{ label: 'Conditions', value: conditionAttackMod }]
                            : []),
                        ],
                      })
                    }
                    className="flex-1 py-3 bg-primary text-on-primary font-label text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-all font-bold cursor-pointer"
                  >
                    Strike (+{totalAttack})
                  </button>

                  <button
                    onClick={() => {
                      const { count, sides, bonus } = parseDiceFormula(atk.damageDice)
                      const totalDmgBonus = (atk.damageBonus ?? bonus) + conditionDamageMod
                      openRoll({
                        diceType: sides,
                        count,
                        modifier: totalDmgBonus,
                        label: `${activeCompanion.name} ${atk.name} Damage`,
                        breakdown: [
                          { label: 'Damage Dice', value: totalDmgBonus },
                          ...(conditionDamageMod !== 0
                            ? [{ label: 'Conditions', value: conditionDamageMod }]
                            : []),
                        ],
                      })
                    }}
                    className="flex-1 py-3 border border-secondary text-secondary font-label text-xs uppercase tracking-widest hover:bg-secondary/10 transition-all cursor-pointer"
                  >
                    Dmg ({atk.damageDice})
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Skills & Special Qualities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skills */}
        <section className="bg-surface-container p-6 border border-primary shadow-[0_0_15px_rgba(0,218,243,0.1)]">
          <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-4 neon-glow-gold">
            Trained Instincts & Skills
          </h2>
          <div className="space-y-2">
            {activeCompanion.skills.map((skill, i) => {
              const totalSkill = skill.bonus + conditionSkillMod
              return (
                <button
                  key={i}
                  onClick={() =>
                    openRoll({
                      diceType: 20,
                      count: 1,
                      modifier: totalSkill,
                      label: `${activeCompanion.name} ${skill.name} Check`,
                      breakdown: [
                        { label: 'Base Skill', value: skill.bonus },
                        ...(conditionSkillMod !== 0
                          ? [{ label: 'Conditions', value: conditionSkillMod }]
                          : []),
                      ],
                    })
                  }
                  className="w-full bg-surface-container-low hover:bg-surface-container-high p-3 flex items-center justify-between border border-outline-variant/20 hover:border-primary transition-all text-left cursor-pointer group"
                >
                  <div>
                    <span className="font-headline text-sm font-bold text-on-surface">
                      {skill.name}
                    </span>
                    {skill.notes && (
                      <span className="font-label text-[10px] text-tertiary block mt-0.5">
                        {skill.notes}
                      </span>
                    )}
                  </div>
                  <span className="font-label text-base font-bold text-primary group-hover:drop-shadow-[0_0_8px_#00daf3]">
                    {totalSkill >= 0 ? `+${totalSkill}` : totalSkill}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Tricks & Special Qualities */}
        <div className="space-y-6">
          {/* Tricks */}
          {activeCompanion.tricks && activeCompanion.tricks.length > 0 && (
            <section className="bg-surface-container p-6 border border-primary shadow-[0_0_15px_rgba(0,218,243,0.1)]">
              <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-4 neon-glow-gold">
                Known Tricks ({activeCompanion.tricks.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {activeCompanion.tricks.map((trick, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-surface-container-low border border-outline-variant/40 font-label text-xs text-on-surface"
                  >
                    ✓ {trick}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Special Qualities */}
          {activeCompanion.specialQualities && activeCompanion.specialQualities.length > 0 && (
            <section className="bg-surface-container p-6 border border-primary shadow-[0_0_15px_rgba(0,218,243,0.1)]">
              <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-4 neon-glow-gold">
                Special Qualities & Abilities
              </h2>
              <div className="space-y-3">
                {activeCompanion.specialQualities.map((sq, idx) => (
                  <div key={idx} className="bg-surface-container-low p-3 border-l-2 border-primary">
                    <h4 className="font-headline text-xs uppercase tracking-wider text-primary font-bold">
                      {sq.name}
                    </h4>
                    <p className="font-body text-xs text-on-surface-variant/80 mt-1 leading-relaxed">
                      {sq.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Companion Conditions */}
      <section className="bg-surface-container p-6 border border-primary shadow-[0_0_15px_rgba(0,218,243,0.1)]">
        <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-4 neon-glow-gold">
          Afflicted Conditions ({activeCompanion.name})
        </h2>
        <div className="flex flex-wrap gap-2">
          {ALL_CONDITIONS.map((cond) => {
            const isActive = activeConditions.includes(cond)
            const info = CONDITION_INFO[cond]

            return (
              <div key={cond} className="relative group">
                <button
                  onClick={() => toggleCompanionCondition(char.id, activeCompanion.id, cond)}
                  className={`px-3 py-1.5 font-label text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? 'bg-error text-on-error shadow-[0_0_10px_rgba(255,180,171,0.4)] font-bold'
                      : 'bg-surface-container-low text-tertiary hover:text-error hover:bg-error-container'
                  }`}
                >
                  {cond}
                </button>
                {/* Tooltip */}
                <div className="pointer-events-none absolute bottom-full left-0 mb-2 w-56 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <div className="bg-black border border-error/40 p-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
                    <p className="font-headline text-error text-[11px] uppercase tracking-wider font-bold mb-1">
                      {info.name}
                    </p>
                    <p className="font-body text-tertiary text-[10px] leading-snug">{info.summary}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
