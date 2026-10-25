import { useState } from 'react'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import { abilityMod, parseDiceFormula } from '../lib/dice-engine'
import { CONDITION_INFO } from '../lib/conditions'
import { COMPANION_PRESETS } from '../data/companion-presets'
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
  const addCompanion = useCharacterStore((s) => s.addCompanion)
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
  const [showManifestModal, setShowManifestModal] = useState(false)

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
      <div className="p-6 md:p-12 max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto bg-surface-container-high rounded-2xl border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(0,240,255,0.15)]">
            <span className="material-symbols-outlined text-3xl">pets</span>
          </div>
          <h2 className="font-headline text-3xl text-white font-bold tracking-tight">
            Manifest a Companion
          </h2>
          <p className="font-body text-sm text-tertiary max-w-lg mx-auto leading-relaxed">
            {char.name} does not currently have an active companion. Select a preset below to bond a familiar or companion to their neural weave.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {COMPANION_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className="bg-surface-container/70 backdrop-blur-md border border-white/10 hover:border-primary/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,240,255,0.15)] flex flex-col justify-between gap-4 group"
            >
              <div className="flex items-start gap-4">
                {preset.portrait ? (
                  <img
                    src={preset.portrait}
                    alt={preset.name}
                    className="w-16 h-16 object-cover rounded-xl border border-primary/40 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 bg-surface-container-high rounded-xl border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
                    <span className="material-symbols-outlined text-2xl">pets</span>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-label text-[10px] uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40 font-semibold">
                      {preset.type.replace('_', ' ')}
                    </span>
                    <span className="font-label text-[10px] uppercase text-tertiary">
                      {preset.size} {preset.species}
                    </span>
                  </div>
                  <h3 className="font-headline text-xl font-bold text-white group-hover:text-primary transition-colors">
                    {preset.name}
                  </h3>
                  <p className="font-body text-xs text-tertiary mt-1">
                    HP: {preset.maxHp} • AC: {preset.armorClass.total} • Speed: {preset.speed}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                <span className="font-label text-xs text-tertiary">
                  Attacks: {preset.attacks.map((a) => a.name).join(', ')}
                </span>
                <button
                  onClick={() => addCompanion(char.id, preset)}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-cyan-400 text-surface-lowest font-label text-xs uppercase tracking-wider font-bold rounded-xl hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Manifest
                </button>
              </div>
            </div>
          ))}
        </div>
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
    <div className="p-2.5 sm:p-4 md:p-8 max-w-6xl mx-auto space-y-3.5 sm:space-y-6">
      {/* Multi-companion Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 gap-2">
        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
          {companions.map((comp) => {
            const isSelected = comp.id === activeCompanion.id
            return (
              <button
                key={comp.id}
                onClick={() => handleSelectCompanion(comp)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 font-label text-[10px] sm:text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 border cursor-pointer ${
                  isSelected
                    ? 'border-primary text-primary bg-primary/10 shadow-[0_0_15px_rgba(0,240,255,0.2)] font-bold'
                    : 'border-white/10 text-tertiary hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-xs sm:text-sm">pets</span>
                {comp.name}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setShowManifestModal(true)}
          className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 font-label text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer flex-shrink-0"
        >
          <span className="material-symbols-outlined text-xs sm:text-sm">add</span>
          <span className="hidden sm:inline">Manifest Preset</span>
          <span className="sm:hidden">Manifest</span>
        </button>
      </div>

      {/* Companion Profile Header */}
      <header className="bg-surface-container/70 backdrop-blur-md rounded-xl sm:rounded-2xl p-3.5 sm:p-6 border border-white/10 shadow-[0_0_25px_rgba(0,240,255,0.08)] flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex items-center gap-3 sm:gap-5 relative z-10 w-full md:w-auto">
          {activeCompanion.portrait ? (
            <img
              src={activeCompanion.portrait}
              alt={activeCompanion.name}
              className="w-14 h-14 sm:w-20 sm:h-20 object-cover rounded-xl sm:rounded-2xl border-2 border-primary/50 flex-shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.2)]"
            />
          ) : (
            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-surface-container-high rounded-xl sm:rounded-2xl border-2 border-primary/40 flex items-center justify-center text-primary flex-shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
              <span className="material-symbols-outlined text-2xl sm:text-4xl">pets</span>
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-label text-[8px] sm:text-[10px] uppercase px-2 py-0.2 rounded-full bg-primary/20 text-primary border border-primary/40 font-semibold tracking-wider">
                {activeCompanion.type.replace('_', ' ')}
              </span>
              <span className="font-label text-[8px] sm:text-[10px] uppercase px-2 py-0.2 rounded-full bg-secondary/20 text-secondary border border-secondary/40 font-semibold tracking-wider">
                {activeCompanion.size} {activeCompanion.species}
              </span>
              {activeCompanion.hitDice && (
                <span className="font-label text-[8px] sm:text-[10px] uppercase px-2 py-0.2 rounded-full bg-surface-container-high text-tertiary border border-white/10">
                  {activeCompanion.hitDice}
                </span>
              )}
            </div>

            <h1 className="font-headline text-lg sm:text-2xl md:text-3xl font-bold text-white mt-1 truncate">
              {activeCompanion.name}
            </h1>
            <p className="font-label text-[10px] sm:text-xs text-tertiary tracking-wider mt-0.5 truncate">
              Speed: {activeCompanion.speed} • BAB: +{activeCompanion.baseAttackBonus}
              {activeCompanion.senses ? ` • Senses: ${activeCompanion.senses}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto justify-end">
          <div className="text-right">
            <span className="font-label text-[9px] sm:text-[10px] text-tertiary uppercase tracking-widest block">
              Bound Master
            </span>
            <span className="font-headline text-primary font-bold text-sm sm:text-lg">{char.name}</span>
          </div>
        </div>
      </header>

      {/* Main Grid: Vitality & Defenses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6">
        {/* Vitality Core */}
        <section className="lg:col-span-6 bg-surface-container/70 backdrop-blur-md rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 shadow-[0_0_20px_rgba(0,240,255,0.08)] flex flex-col items-center justify-center text-center relative overflow-hidden">
          <h2 className="font-headline text-secondary text-xs sm:text-sm uppercase tracking-widest mb-2 sm:mb-4 neon-glow-accent">
            Vitality Core
          </h2>

          <div
            className="font-label font-black text-primary text-4xl sm:text-5xl md:text-6xl leading-none"
            style={{ textShadow: '0 0 25px rgba(0,240,255,0.3)' }}
          >
            {currentHp}
          </div>
          <div className="font-label text-tertiary tracking-widest uppercase mt-1 text-[10px] sm:text-xs">
            Hit Points / {activeCompanion.maxHp}
          </div>

          <div className="mt-3 sm:mt-6 flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => adjustCompanionHp(char.id, activeCompanion.id, -hpDelta, activeCompanion.maxHp)}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-error-container text-on-error-container hover:brightness-125 rounded-xl transition-all font-label text-xs uppercase tracking-widest cursor-pointer active:scale-95 font-bold"
              aria-label="Decrease companion HP"
            >
              Damage
            </button>
            <input
              type="number"
              min={1}
              value={hpDelta}
              onChange={(e) => setHpDelta(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-14 sm:w-16 bg-surface-container-high text-on-surface font-label text-base sm:text-lg font-bold text-center py-1 sm:py-2 rounded-xl border border-white/10 focus:border-primary focus:outline-none"
            />
            <button
              onClick={() => adjustCompanionHp(char.id, activeCompanion.id, hpDelta, activeCompanion.maxHp)}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-primary-container text-on-primary-container hover:brightness-125 rounded-xl transition-all font-label text-xs uppercase tracking-widest cursor-pointer active:scale-95 font-bold"
              aria-label="Increase companion HP"
            >
              Heal
            </button>
          </div>

          <div className="mt-2.5 sm:mt-4">
            {tempEdit === null ? (
              <button
                onClick={() => setTempEdit(String(tempHp))}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-surface-container-lowest font-label text-[11px] sm:text-xs text-primary hover:bg-surface-container-high rounded-xl transition-all cursor-pointer border border-primary/20"
              >
                TEMP HP: <span className="font-bold">{tempHp}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-surface-container-lowest px-2 py-0.5 sm:py-1 rounded-xl border border-primary">
                <span className="font-label text-xs text-primary">TEMP:</span>
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

        {/* Defense Grid: 3-column compact */}
        <section className="lg:col-span-6 bg-surface-container/70 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-white/10 shadow-[0_0_20px_rgba(0,240,255,0.08)] grid grid-cols-3 gap-2 sm:gap-2.5">
          <div className="bg-surface-container-low/80 rounded-xl p-2 sm:p-3 border border-white/5">
            <p className="font-label text-[9px] sm:text-[10px] uppercase tracking-wider text-tertiary font-bold truncate">
              Armor Class
            </p>
            <p className="font-label text-xl sm:text-2xl font-black text-white mt-0.5">
              {activeCompanion.armorClass.total + conditionAcMod}
            </p>
            <p className="font-label text-[8px] sm:text-[9px] text-tertiary mt-0.5 font-mono truncate">
              T: {activeCompanion.armorClass.touch + conditionAcMod} | FF: {activeCompanion.armorClass.flatFooted + conditionAcMod}
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
            className="bg-surface-container-low/80 rounded-xl p-2 sm:p-3 text-left hover:bg-surface-container-high/80 border border-white/5 hover:border-primary/40 transition-all cursor-pointer group"
          >
            <p className="font-label text-[9px] sm:text-[10px] uppercase tracking-wider text-primary font-bold truncate">
              Initiative
            </p>
            <p className="font-label text-xl sm:text-2xl font-black text-primary mt-0.5">
              +{activeCompanion.initiativeBonus}
            </p>
            <p className="font-label text-[8px] sm:text-[9px] text-tertiary mt-0.5 font-mono truncate">Roll d20</p>
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
            className="bg-surface-container-low/80 rounded-xl p-2 sm:p-3 text-left hover:bg-surface-container-high/80 border border-white/5 hover:border-secondary/40 transition-all cursor-pointer group"
          >
            <p className="font-label text-[9px] sm:text-[10px] uppercase tracking-wider text-secondary font-bold truncate">
              Fortitude
            </p>
            <p className="font-label text-xl sm:text-2xl font-black text-white mt-0.5">
              +{activeCompanion.savingThrows.fort + conditionSaveMod}
            </p>
            <p className="font-label text-[8px] sm:text-[9px] text-tertiary mt-0.5 font-mono truncate">Fort Save</p>
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
            className="bg-surface-container-low/80 rounded-xl p-2 sm:p-3 text-left hover:bg-surface-container-high/80 border border-white/5 hover:border-secondary/40 transition-all cursor-pointer group"
          >
            <p className="font-label text-[9px] sm:text-[10px] uppercase tracking-wider text-secondary font-bold truncate">
              Reflex
            </p>
            <p className="font-label text-xl sm:text-2xl font-black text-white mt-0.5">
              +{activeCompanion.savingThrows.ref + conditionSaveMod}
            </p>
            <p className="font-label text-[8px] sm:text-[9px] text-tertiary mt-0.5 font-mono truncate">Reflex Save</p>
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
            className="bg-surface-container-low/80 rounded-xl p-2 sm:p-3 text-left hover:bg-surface-container-high/80 border border-white/5 hover:border-secondary/40 transition-all cursor-pointer group"
          >
            <p className="font-label text-[9px] sm:text-[10px] uppercase tracking-wider text-secondary font-bold truncate">
              Willpower
            </p>
            <p className="font-label text-xl sm:text-2xl font-black text-white mt-0.5">
              +{activeCompanion.savingThrows.will + conditionSaveMod}
            </p>
            <p className="font-label text-[8px] sm:text-[9px] text-tertiary mt-0.5 font-mono truncate">Will Save</p>
          </button>

          <div className="bg-surface-container-low/80 rounded-xl p-2 sm:p-3 border border-white/5">
            <p className="font-label text-[9px] sm:text-[10px] uppercase tracking-wider text-primary font-bold truncate">
              Speed
            </p>
            <p className="font-label text-base sm:text-xl font-black text-white mt-0.5">
              {activeCompanion.speed}
            </p>
            <p className="font-label text-[8px] sm:text-[9px] text-tertiary mt-0.5 font-mono truncate">
              BAB: +{activeCompanion.baseAttackBonus}
            </p>
          </div>
        </section>
      </div>

      {/* Ability Scores Grid */}
      <section className="bg-surface-container/70 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_0_20px_rgba(0,240,255,0.08)]">
        <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-4 neon-glow-accent">
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
                className="bg-surface-container-low/80 rounded-xl p-3 hover:bg-surface-container-high/80 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all text-center cursor-pointer border border-white/5 hover:border-primary/40 active:scale-95"
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
      <section className="bg-surface-container/70 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_0_20px_rgba(0,240,255,0.08)]">
        <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-4 neon-glow-accent">
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
                className="bg-surface-container-low/80 rounded-xl p-5 border border-white/5 border-l-4 border-l-primary flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-headline text-xl font-bold text-white">{atk.name}</h3>
                    <span className="font-label text-xs text-secondary border border-secondary/30 px-2.5 py-0.5 rounded-full font-semibold">
                      {critRange < 20 ? `${critRange}-20` : '20'}/x{critMult}
                    </span>
                  </div>

                  {atk.damageType && (
                    <p className="font-label text-[11px] text-tertiary uppercase tracking-wider mb-2">
                      Type: {atk.damageType}
                    </p>
                  )}

                  {atk.notes && (
                    <p className="font-body text-xs text-on-surface-variant/90 mb-4 bg-surface-container-high/40 p-2.5 rounded-lg border-l-2 border-primary/50">
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
                    className="flex-1 py-3 bg-gradient-to-r from-primary to-cyan-400 text-surface-lowest font-label text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] rounded-xl transition-all font-bold cursor-pointer active:scale-95"
                  >
                    Strike (+{totalAttack})
                  </button>

                  <button
                    onClick={() => {
                      const { count, sides, bonus } = parseDiceFormula(atk.damageDice)
                      const baseBonus = atk.damageBonus !== undefined && atk.damageBonus !== bonus
                        ? atk.damageBonus + bonus
                        : (atk.damageBonus ?? bonus)
                      const totalDmgBonus = baseBonus + conditionDamageMod
                      openRoll({
                        diceType: sides,
                        count,
                        modifier: totalDmgBonus,
                        label: `${activeCompanion.name} ${atk.name} Damage`,
                        breakdown: [
                          { label: 'Base Damage', value: baseBonus },
                          ...(conditionDamageMod !== 0
                            ? [{ label: 'Conditions', value: conditionDamageMod }]
                            : []),
                        ],
                      })
                    }}
                    className="flex-1 py-3 border border-secondary text-secondary font-label text-xs uppercase tracking-widest hover:bg-secondary/10 rounded-xl transition-all font-semibold cursor-pointer active:scale-95"
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
        <section className="bg-surface-container/70 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_0_20px_rgba(0,240,255,0.08)]">
          <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-4 neon-glow-accent">
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
                  className="w-full bg-surface-container-low/80 hover:bg-surface-container-high/80 p-3.5 rounded-xl flex items-center justify-between border border-white/5 hover:border-primary/40 transition-all text-left cursor-pointer group active:scale-[0.99]"
                >
                  <div>
                    <span className="font-headline text-sm font-bold text-white">
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
            <section className="bg-surface-container/70 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_0_20px_rgba(0,240,255,0.08)]">
              <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-4 neon-glow-accent">
                Known Tricks ({activeCompanion.tricks.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {activeCompanion.tricks.map((trick, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-surface-container-low/80 border border-white/10 rounded-full font-label text-xs text-white"
                  >
                    ✓ {trick}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Special Qualities */}
          {activeCompanion.specialQualities && activeCompanion.specialQualities.length > 0 && (
            <section className="bg-surface-container/70 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_0_20px_rgba(0,240,255,0.08)]">
              <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-4 neon-glow-accent">
                Special Qualities & Abilities
              </h2>
              <div className="space-y-3">
                {activeCompanion.specialQualities.map((sq, idx) => (
                  <div key={idx} className="bg-surface-container-low/80 p-3.5 rounded-xl border-l-4 border-l-primary border border-white/5">
                    <h4 className="font-headline text-xs uppercase tracking-wider text-primary font-bold">
                      {sq.name}
                    </h4>
                    <p className="font-body text-xs text-tertiary mt-1 leading-relaxed">
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
      <section className="bg-surface-container/70 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_0_20px_rgba(0,240,255,0.08)]">
        <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-4 neon-glow-accent">
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
                  className={`px-3 py-1.5 font-label text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-error text-on-error shadow-[0_0_10px_rgba(255,180,171,0.4)] font-bold'
                      : 'bg-surface-container-low/80 text-tertiary hover:text-error hover:bg-error-container/30 border border-white/5'
                  }`}
                >
                  {cond}
                </button>
                {/* Tooltip */}
                <div className="pointer-events-none absolute bottom-full left-0 mb-2 w-56 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <div className="bg-[#0e0e18] border border-error/40 p-2.5 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-md">
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

      {/* Preset Manifest Modal */}
      {showManifestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface-container border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-[0_0_50px_rgba(0,240,255,0.2)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-headline text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">pets</span>
                Manifest Companion Preset
              </h3>
              <button
                onClick={() => setShowManifestModal(false)}
                className="text-tertiary hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {COMPANION_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="bg-surface-container-high/80 border border-white/10 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-primary/40 transition-colors"
                >
                  <div>
                    <span className="font-label text-[10px] uppercase text-primary font-bold">
                      {preset.type.replace('_', ' ')} • {preset.species}
                    </span>
                    <h4 className="font-headline text-base font-bold text-white mt-0.5">{preset.name}</h4>
                    <p className="font-body text-xs text-tertiary mt-1">HP: {preset.maxHp} • AC: {preset.armorClass.total} • Speed: {preset.speed}</p>
                  </div>
                  <button
                    onClick={() => {
                      addCompanion(char.id, preset)
                      setShowManifestModal(false)
                    }}
                    className="w-full py-2 bg-primary/20 hover:bg-primary text-primary hover:text-surface font-label text-xs uppercase tracking-wider font-bold rounded-lg border border-primary/40 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Manifest
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
