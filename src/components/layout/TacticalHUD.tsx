import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCharacterStore } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'
import { useDiceStore } from '../../store/useDiceStore'
import {
  calcEffectiveAbilities,
  calcEffectiveArmorClass,
  calcEffectiveSaves,
} from '../../lib/stat-calc'
import { abilityMod } from '../../lib/dice-engine'
import { CONDITION_INFO } from '../../lib/conditions'
import { StatBreakdownTooltip } from '../ui/StatBreakdownTooltip'
import { TacticalHpPopover } from './TacticalHpPopover'
import { SettingsPanel } from './SettingsPanel'
import { useInspectorStore } from '../../store/useInspectorStore'
import type { BuffToggle, ConditionType } from '../../types/combat'
import type { ArmorClass } from '../../types/defense'

/**
 * Helper to compute detailed component breakdowns for AC categories.
 */
function calcDetailedAcBreakdowns(
  baseAc: ArmorClass,
  effectiveDexMod: number,
  conditions: ConditionType[],
  activeBuffs: BuffToggle[]
) {
  const losesDex = conditions.includes('blinded') || conditions.includes('stunned') || conditions.includes('paralyzed')

  // Total AC Breakdown
  const totalBreakdown: { label: string; value: number }[] = [
    { label: 'Base', value: 10 },
  ]
  if (baseAc.armorBonus > 0) totalBreakdown.push({ label: 'Armor', value: baseAc.armorBonus })
  if (baseAc.shieldBonus > 0) totalBreakdown.push({ label: 'Shield', value: baseAc.shieldBonus })
  if (losesDex) {
    if (effectiveDexMod > 0) {
      totalBreakdown.push({ label: 'DEX (Lost)', value: 0 })
    } else if (effectiveDexMod < 0) {
      totalBreakdown.push({ label: 'DEX Mod', value: effectiveDexMod })
    }
  } else if (effectiveDexMod !== 0) {
    totalBreakdown.push({ label: 'DEX Mod', value: effectiveDexMod })
  }
  if (baseAc.naturalArmor > 0) totalBreakdown.push({ label: 'Natural Armor', value: baseAc.naturalArmor })
  if (baseAc.deflection > 0) totalBreakdown.push({ label: 'Deflection', value: baseAc.deflection })
  if (baseAc.misc !== 0) totalBreakdown.push({ label: 'Misc', value: baseAc.misc })
  if (conditions.includes('blinded')) totalBreakdown.push({ label: 'Blinded', value: -2 })
  if (conditions.includes('stunned')) totalBreakdown.push({ label: 'Stunned', value: -2 })
  for (const buff of activeBuffs) {
    if (buff.acMod) totalBreakdown.push({ label: buff.name, value: buff.acMod })
  }

  // Touch AC Breakdown
  const touchBreakdown: { label: string; value: number }[] = [
    { label: 'Base', value: 10 },
  ]
  if (losesDex) {
    if (effectiveDexMod < 0) touchBreakdown.push({ label: 'DEX Mod', value: effectiveDexMod })
  } else if (effectiveDexMod !== 0) {
    touchBreakdown.push({ label: 'DEX Mod', value: effectiveDexMod })
  }
  if (baseAc.deflection > 0) touchBreakdown.push({ label: 'Deflection', value: baseAc.deflection })
  if (baseAc.misc !== 0) touchBreakdown.push({ label: 'Misc', value: baseAc.misc })
  if (conditions.includes('blinded')) touchBreakdown.push({ label: 'Blinded', value: -2 })
  if (conditions.includes('stunned')) touchBreakdown.push({ label: 'Stunned', value: -2 })
  for (const buff of activeBuffs) {
    if (buff.acMod) touchBreakdown.push({ label: buff.name, value: buff.acMod })
  }

  // Flat-Footed AC Breakdown
  const flatFootedBreakdown: { label: string; value: number }[] = [
    { label: 'Base', value: 10 },
  ]
  if (baseAc.armorBonus > 0) flatFootedBreakdown.push({ label: 'Armor', value: baseAc.armorBonus })
  if (baseAc.shieldBonus > 0) flatFootedBreakdown.push({ label: 'Shield', value: baseAc.shieldBonus })
  if (effectiveDexMod < 0) flatFootedBreakdown.push({ label: 'DEX Penalty', value: effectiveDexMod })
  if (baseAc.naturalArmor > 0) flatFootedBreakdown.push({ label: 'Natural Armor', value: baseAc.naturalArmor })
  if (baseAc.deflection > 0) flatFootedBreakdown.push({ label: 'Deflection', value: baseAc.deflection })
  if (conditions.includes('blinded')) flatFootedBreakdown.push({ label: 'Blinded', value: -2 })
  if (conditions.includes('stunned')) flatFootedBreakdown.push({ label: 'Stunned', value: -2 })
  for (const buff of activeBuffs) {
    if (buff.acMod) flatFootedBreakdown.push({ label: buff.name, value: buff.acMod })
  }

  return { totalBreakdown, touchBreakdown, flatFootedBreakdown }
}

function formatBuffTooltip(buff: BuffToggle): { label: string; value: number }[] {
  const breakdown: { label: string; value: number }[] = []
  if (buff.attackMod) breakdown.push({ label: 'Attack', value: buff.attackMod })
  if (buff.damageMod) breakdown.push({ label: 'Damage', value: buff.damageMod })
  if (buff.acMod) breakdown.push({ label: 'Armor Class', value: buff.acMod })
  if (typeof buff.saveMod === 'number' && buff.saveMod !== 0) {
    breakdown.push({ label: 'Saves', value: buff.saveMod })
  } else if (typeof buff.saveMod === 'object' && buff.saveMod) {
    if (buff.saveMod.fort) breakdown.push({ label: 'Fort Save', value: buff.saveMod.fort })
    if (buff.saveMod.ref) breakdown.push({ label: 'Ref Save', value: buff.saveMod.ref })
    if (buff.saveMod.will) breakdown.push({ label: 'Will Save', value: buff.saveMod.will })
  }
  if (buff.abilityMods) {
    for (const [k, v] of Object.entries(buff.abilityMods)) {
      if (v) breakdown.push({ label: k.toUpperCase(), value: v })
    }
  }
  return breakdown
}

export function TacticalHUD() {
  const navigate = useNavigate()
  const char = useCharacterStore((s) => s.activeCharacter())
  const characters = useCharacterStore((s) => s.characters)
  const setActiveCharacter = useCharacterStore((s) => s.setActiveCharacter)
  const session = useSessionStore((s) => (char ? s.getSession(char.id) : null))
  const initSession = useSessionStore((s) => s.initSession)
  const toggleBuff = useSessionStore((s) => s.toggleBuff)
  const toggleCondition = useSessionStore((s) => s.toggleCondition)
  const openInspector = useInspectorStore((s) => s.openInspector)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hpPopoverOpen, setHpPopoverOpen] = useState(false)

  // Character Cycling
  const idx = char ? characters.findIndex((c) => c.id === char.id) : -1
  const cycleTo = (offset: number) => {
    if (idx < 0 || characters.length < 2) return
    const next = characters[(idx + offset + characters.length) % characters.length]
    setActiveCharacter(next.id)
    initSession(next.id, next.maxHp)
  }

  // Active Buffs & Conditions aggregation
  const conditions = useMemo(() => session?.conditions ?? [], [session?.conditions])
  const activeBuffs = useMemo(() => {
    if (!char || !session) return []
    const allBuffs = [...char.buffs, ...(session.customBuffs ?? [])]
    return allBuffs.filter((b) => session.activeBuffIds.includes(b.id))
  }, [char, session])

  // Effective defensive stats calculations
  const effectiveAbilities = useMemo(() => {
    if (!char) return null
    return calcEffectiveAbilities(char.abilities, conditions, activeBuffs)
  }, [char, conditions, activeBuffs])

  const baseDexMod = char ? abilityMod(char.abilities.dex) : 0
  const effDexMod = effectiveAbilities ? effectiveAbilities.mods.dex : baseDexMod

  const effectiveAc = useMemo(() => {
    if (!char) return null
    return calcEffectiveArmorClass(char.armorClass, baseDexMod, effDexMod, conditions, activeBuffs)
  }, [char, baseDexMod, effDexMod, conditions, activeBuffs])

  const detailedAc = useMemo(() => {
    if (!char) return null
    return calcDetailedAcBreakdowns(char.armorClass, effDexMod, conditions, activeBuffs)
  }, [char, effDexMod, conditions, activeBuffs])

  const effectiveSaves = useMemo(() => {
    if (!char || !effectiveAbilities) return null
    return calcEffectiveSaves(char.savingThrows, char.abilities, effectiveAbilities, conditions, activeBuffs)
  }, [char, effectiveAbilities, conditions, activeBuffs])

  // If no character is active, render fallback TopBar
  if (!char) {
    return (
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-surface/90 border-b border-white/[0.08] px-6 py-4 flex justify-between items-center" style={{ boxShadow: '0 4px 24px -6px rgba(0,240,255,0.1)' }}>
        <span
          className="text-2xl font-black tracking-tighter text-primary uppercase font-headline cursor-pointer neon-glow-cyan-soft"
          onClick={() => navigate('/characters')}
        >
          NEON RELIQUARY
        </span>
        <span className="font-label text-xs text-tertiary">No Active Character</span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/characters')}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container/80 backdrop-blur-sm border border-white/10 text-white font-label text-sm rounded-xl hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-primary">account_circle</span>
            <span>Character Switcher</span>
          </button>
        </div>
      </header>
    )
  }

  // Multi-track HP math
  const hp = session?.currentHp ?? 0
  const maxHp = char.maxHp ?? 1
  const tempHp = session?.tempHp ?? 0
  const nonlethalDamage = session?.nonlethalDamage ?? 0
  const conScore = char.abilities.con ?? 10

  const scaleMax = Math.max(maxHp, Math.max(0, hp) + tempHp)
  const pctCurrent = Math.max(0, Math.min(100, (Math.max(0, hp) / scaleMax) * 100))
  const pctTemp = tempHp > 0 ? Math.min(100 - pctCurrent, (tempHp / scaleMax) * 100) : 0
  const pctNonlethal = nonlethalDamage > 0 ? Math.min(pctCurrent, (nonlethalDamage / scaleMax) * 100) : 0

  // Vital statuses
  const isDead = hp <= -conScore
  const isDying = !isDead && hp < 0
  const isDisabled = hp === 0
  const isUnconscious = hp > 0 && nonlethalDamage > hp
  const isStaggered = hp > 0 && nonlethalDamage === hp

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full backdrop-blur-md bg-surface/90 border-b border-white/[0.08]"
        style={{ boxShadow: '0 4px 24px -6px rgba(0,240,255,0.1)' }}
      >
        {/* Main Cockpit Bar */}
        <div className="flex items-center justify-between gap-2 md:gap-4 px-4 md:px-6 py-2.5">
          {/* Left Cockpit: App Branding & Character Identity */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span
              className="text-xl md:text-2xl font-black tracking-tighter text-primary uppercase font-headline cursor-pointer neon-glow-cyan-soft select-none"
              onClick={() => navigate('/characters')}
            >
              NEON RELIQUARY
            </span>
            <div className="hidden md:block h-8 w-px bg-white/10 mx-1" />
            <div className="hidden md:block">
              <h1 className="font-headline text-base leading-none text-white font-bold">{char.name}</h1>
              <p className="font-label text-xs tracking-widest text-tertiary uppercase mt-0.5">
                Level {char.level} {char.class}
              </p>
            </div>
          </div>

          {/* Center Cockpit: Tactical Vitals (HP Bar, AC, Saves) */}
          <div className="flex-1 flex flex-wrap items-center justify-center gap-2 md:gap-3 max-w-2xl mx-1 md:mx-2">
            {/* Multi-Track HP Bar Container with Popover Trigger */}
            <div className="relative flex-1 min-w-[140px] max-w-sm">
              <div
                role="button"
                tabIndex={0}
                data-testid="hp-popover-trigger"
                onClick={() => setHpPopoverOpen((prev) => !prev)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setHpPopoverOpen((prev) => !prev)
                }}
                aria-label="Adjust hit points"
                className="cursor-pointer group py-1 px-2 rounded-xl hover:bg-white/[0.04] transition-all"
              >
                {/* Multi-Track Progress Bar */}
                <div className="h-2.5 w-full bg-surface-container-lowest rounded-full overflow-hidden border border-white/[0.08] relative">
                  {/* Current HP Fill */}
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pctCurrent}%`,
                      background:
                        hp <= 0
                          ? '#ff4b60'
                          : hp < maxHp * 0.25
                          ? 'linear-gradient(90deg, #ff4b60 0%, #f59e0b 100%)'
                          : hp < maxHp * 0.5
                          ? 'linear-gradient(90deg, #f59e0b 0%, #d946ef 100%)'
                          : 'linear-gradient(90deg, #00f0ff 0%, #00b4d8 100%)',
                      boxShadow: hp > 0 ? '0 0 10px rgba(0,240,255,0.4)' : undefined,
                    }}
                  />

                  {/* Temp HP Extension */}
                  {tempHp > 0 && (
                    <div
                      className="h-full absolute top-0 rounded-r-full transition-all duration-300"
                      style={{
                        left: `${pctCurrent}%`,
                        width: `${pctTemp}%`,
                        background: 'linear-gradient(90deg, #f59e0b 0%, #00f0ff 100%)',
                        boxShadow: '0 0 10px rgba(0,240,255,0.6)',
                      }}
                    />
                  )}

                  {/* Nonlethal Overlay */}
                  {nonlethalDamage > 0 && (
                    <div
                      className="h-full absolute top-0 transition-all duration-300"
                      style={{
                        left: `${Math.max(0, pctCurrent - pctNonlethal)}%`,
                        width: `${pctNonlethal}%`,
                        background: '#ffb4ab',
                        boxShadow: '0 0 6px rgba(255,180,171,0.5)',
                      }}
                    />
                  )}
                </div>

                {/* HP Numbers & Status Chips */}
                <div className="flex items-center justify-between mt-1 px-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-label text-xs font-bold text-primary">
                      {hp} / {maxHp} HP
                    </span>
                    {tempHp > 0 && (
                      <span className="font-label text-[10px] text-cyan-300 font-semibold bg-cyan-950/60 border border-cyan-500/30 px-1 rounded">
                        +{tempHp} TEMP
                      </span>
                    )}
                    {nonlethalDamage > 0 && (
                      <span className="font-label text-[10px] text-[#ffb4ab] font-semibold bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 px-1 rounded tabular-nums">
                        {nonlethalDamage} NL
                      </span>
                    )}
                  </div>

                  {/* Status Alerts */}
                  <div className="flex items-center gap-1">
                    {isDead && (
                      <span className="font-label text-[10px] font-black uppercase text-error bg-error/20 border border-error/50 px-1.5 py-0.2 rounded animate-pulse">
                        DEAD
                      </span>
                    )}
                    {isDying && (
                      <span className="font-label text-[10px] font-black uppercase text-error bg-error/20 border border-error/50 px-1.5 py-0.2 rounded animate-pulse">
                        DYING
                      </span>
                    )}
                    {isDisabled && (
                      <span className="font-label text-[10px] font-bold uppercase text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.2 rounded">
                        DISABLED
                      </span>
                    )}
                    {isUnconscious && (
                      <span className="font-label text-[10px] font-bold uppercase text-[#ffb4ab] bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 px-1.5 py-0.2 rounded animate-pulse">
                        UNCONSCIOUS
                      </span>
                    )}
                    {isStaggered && (
                      <span className="font-label text-[10px] font-bold uppercase text-amber-300 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.2 rounded">
                        STAGGERED
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tactical HP Popover */}
              <TacticalHpPopover
                isOpen={hpPopoverOpen}
                onClose={() => setHpPopoverOpen(false)}
                characterId={char.id}
                currentHp={hp}
                maxHp={maxHp}
                tempHp={tempHp}
                nonlethalDamage={nonlethalDamage}
                conScore={conScore}
              />
            </div>

            {/* AC Badges (Total, Touch, Flat-Footed) */}
            {effectiveAc && detailedAc && (
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Armor Class">
                {/* Total AC */}
                <StatBreakdownTooltip
                  title="Armor Class (Total)"
                  total={effectiveAc.total}
                  breakdown={detailedAc.totalBreakdown}
                  notes={effectiveAc.notes}
                >
                  <div
                    data-testid="ac-total"
                    className="px-2 py-1 rounded-xl bg-surface-container/70 border border-white/10 hover:border-primary/40 hover:bg-surface-container-high transition-all flex flex-col items-center justify-center min-w-[42px] cursor-pointer"
                  >
                    <span className="font-label text-[9px] uppercase tracking-widest text-tertiary font-semibold">
                      AC
                    </span>
                    <span
                      className={`font-label text-sm leading-none mt-0.5 ${
                        effectiveAc.total > char.armorClass.total
                          ? 'text-[#00daf3] font-black'
                          : effectiveAc.total < char.armorClass.total
                          ? 'text-[#ffb4ab] font-black'
                          : 'text-on-surface font-bold'
                      }`}
                    >
                      {effectiveAc.total}
                    </span>
                  </div>
                </StatBreakdownTooltip>

                {/* Touch AC */}
                <StatBreakdownTooltip
                  title="Touch Armor Class"
                  total={effectiveAc.touch}
                  breakdown={detailedAc.touchBreakdown}
                  notes={effectiveAc.notes}
                >
                  <div
                    data-testid="ac-touch"
                    className="px-2 py-1 rounded-xl bg-surface-container/70 border border-white/10 hover:border-primary/40 hover:bg-surface-container-high transition-all flex flex-col items-center justify-center min-w-[42px] cursor-pointer"
                  >
                    <span className="font-label text-[9px] uppercase tracking-widest text-tertiary font-semibold">
                      TOUCH
                    </span>
                    <span
                      className={`font-label text-sm leading-none mt-0.5 ${
                        effectiveAc.touch > char.armorClass.touch
                          ? 'text-[#00daf3] font-black'
                          : effectiveAc.touch < char.armorClass.touch
                          ? 'text-[#ffb4ab] font-black'
                          : 'text-on-surface font-bold'
                      }`}
                    >
                      {effectiveAc.touch}
                    </span>
                  </div>
                </StatBreakdownTooltip>

                {/* Flat-Footed AC */}
                <StatBreakdownTooltip
                  title="Flat-Footed Armor Class"
                  total={effectiveAc.flatFooted}
                  breakdown={detailedAc.flatFootedBreakdown}
                  notes={effectiveAc.notes}
                >
                  <div
                    data-testid="ac-flat-footed"
                    className="px-2 py-1 rounded-xl bg-surface-container/70 border border-white/10 hover:border-primary/40 hover:bg-surface-container-high transition-all flex flex-col items-center justify-center min-w-[42px] cursor-pointer"
                  >
                    <span className="font-label text-[9px] uppercase tracking-widest text-tertiary font-semibold">
                      FLAT
                    </span>
                    <span
                      className={`font-label text-sm leading-none mt-0.5 ${
                        effectiveAc.flatFooted > char.armorClass.flatFooted
                          ? 'text-[#00daf3] font-black'
                          : effectiveAc.flatFooted < char.armorClass.flatFooted
                          ? 'text-[#ffb4ab] font-black'
                          : 'text-on-surface font-bold'
                      }`}
                    >
                      {effectiveAc.flatFooted}
                    </span>
                  </div>
                </StatBreakdownTooltip>
              </div>
            )}

            {/* Interactive Saving Throws (Fort, Ref, Will) */}
            {effectiveSaves && (
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Saving Throws">
                {(
                  [
                    {
                      key: 'fort',
                      label: 'FORT',
                      fullName: 'Fortitude Save',
                      val: effectiveSaves.fort,
                      base: char.savingThrows.fort,
                      bkd: effectiveSaves.breakdowns.fortitude,
                    },
                    {
                      key: 'ref',
                      label: 'REF',
                      fullName: 'Reflex Save',
                      val: effectiveSaves.ref,
                      base: char.savingThrows.ref,
                      bkd: effectiveSaves.breakdowns.reflex,
                    },
                    {
                      key: 'will',
                      label: 'WILL',
                      fullName: 'Will Save',
                      val: effectiveSaves.will,
                      base: char.savingThrows.will,
                      bkd: effectiveSaves.breakdowns.will,
                    },
                  ] as const
                ).map((save) => {
                  const isBuffed = save.val > save.base
                  const isPenalized = save.val < save.base
                  const valColor = isBuffed
                    ? 'text-[#00daf3] font-black'
                    : isPenalized
                    ? 'text-[#ffb4ab] font-black'
                    : 'text-on-surface font-bold'

                  return (
                    <StatBreakdownTooltip
                      key={save.key}
                      title={save.fullName}
                      total={save.val >= 0 ? `+${save.val}` : `${save.val}`}
                      breakdown={save.bkd}
                    >
                      <button
                        onClick={() => {
                          useDiceStore.getState().openRoll({
                            diceType: 20,
                            count: 1,
                            modifier: save.val,
                            label: save.fullName,
                            breakdown: save.bkd,
                          })
                        }}
                        aria-label={`Roll ${save.fullName}`}
                        className="px-2 py-1 rounded-xl bg-surface-container/70 border border-white/10 hover:border-secondary/60 hover:bg-secondary/10 active:scale-95 transition-all flex flex-col items-center justify-center min-w-[42px] cursor-pointer group"
                      >
                        <div className="flex items-center gap-0.5">
                          <span className="font-label text-[9px] uppercase tracking-widest text-secondary group-hover:text-primary transition-colors font-semibold">
                            {save.label}
                          </span>
                          <span className="material-symbols-outlined text-[10px] text-tertiary/60 group-hover:text-primary transition-colors">
                            casino
                          </span>
                        </div>
                        <span className={`font-label text-sm leading-none mt-0.5 ${valColor}`}>
                          {save.val >= 0 ? `+${save.val}` : save.val}
                        </span>
                      </button>
                    </StatBreakdownTooltip>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Cockpit: Cycler & Switcher & Settings */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            {characters.length >= 2 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => cycleTo(-1)}
                  aria-label="Previous character"
                  className="p-1.5 text-tertiary hover:text-primary transition-all duration-300 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base md:text-lg">chevron_left</span>
                </button>
                <button
                  onClick={() => cycleTo(1)}
                  aria-label="Next character"
                  className="p-1.5 text-tertiary hover:text-primary transition-all duration-300 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base md:text-lg">chevron_right</span>
                </button>
              </div>
            )}

            <button
              onClick={() => navigate('/characters')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container/80 backdrop-blur-sm border border-white/10 text-white font-label text-xs rounded-xl hover:border-primary/50 hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_20px_rgba(0,240,255,0.25)] transition-all duration-300 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-primary">account_circle</span>
              <span className="hidden lg:inline">Character Switcher</span>
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="p-1.5 text-tertiary hover:text-primary transition-all duration-300 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base md:text-lg">settings</span>
            </button>
          </div>
        </div>

        {/* Secondary Pill Row (Active Conditions & Active Buffs) */}
        {(conditions.length > 0 || activeBuffs.length > 0) && (
          <div className="px-4 md:px-6 py-1 border-t border-white/5 bg-black/40 flex items-center gap-2 overflow-x-auto scrollbar-none">
            {/* Active Conditions */}
            {conditions.map((cond) => (
              <StatBreakdownTooltip
                key={cond}
                title={CONDITION_INFO[cond]?.name ?? cond}
                total="CONDITION"
                breakdown={[]}
                notes={CONDITION_INFO[cond]?.penalties}
              >
                <button
                  onClick={() => {
                    toggleCondition(char.id, cond)
                    const info = CONDITION_INFO[cond]
                    openInspector({
                      type: 'condition',
                      id: cond,
                      title: info?.name ?? cond,
                      subtitle: 'Active Condition',
                      description: info?.summary ?? 'Condition removed from the active list.',
                      tags: ['Condition'],
                      notes: info?.penalties,
                    })
                  }}
                  aria-label={`Remove condition ${cond}`}
                  className="group flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-label font-bold uppercase tracking-wider bg-error/15 border border-error/40 text-error shadow-[0_0_8px_rgba(255,75,96,0.25)] hover:bg-error/25 hover:border-error/70 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[11px]">warning</span>
                  <span>{cond}</span>
                  <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </StatBreakdownTooltip>
            ))}

            {/* Active Buffs */}
            {activeBuffs.map((buff) => {
              const isSecondary = buff.color === 'secondary'
              const buffBkd = formatBuffTooltip(buff)
              return (
                <StatBreakdownTooltip
                  key={buff.id}
                  title={buff.name}
                  total="ACTIVE BUFF"
                  breakdown={buffBkd}
                  notes={buff.description ? [buff.description] : undefined}
                >
                  <button
                    onClick={() => {
                      toggleBuff(char.id, buff.id)
                      openInspector({
                        type: 'buff',
                        id: buff.id,
                        title: buff.name,
                        subtitle: 'Active Buff',
                        description: buff.description ?? 'Active tactical modifier.',
                        breakdown: buffBkd,
                        tags: ['Buff', ...(buff.duration ? [buff.duration] : [])],
                      })
                    }}
                    aria-label={`Deactivate buff ${buff.name}`}
                    className={`group flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-label font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      isSecondary
                        ? 'bg-secondary/15 border border-secondary/40 text-secondary shadow-[0_0_8px_rgba(217,70,239,0.25)] hover:bg-secondary/25 hover:border-secondary/70'
                        : 'bg-primary/15 border border-primary/40 text-primary shadow-[0_0_8px_rgba(0,240,255,0.25)] hover:bg-primary/25 hover:border-primary/70'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[11px]">auto_awesome</span>
                    <span>{buff.name}</span>
                    <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </StatBreakdownTooltip>
              )
            })}
          </div>
        )}
      </header>
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
