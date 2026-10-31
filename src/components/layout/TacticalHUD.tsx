import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCharacterStore } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'
import { useDiceStore } from '../../store/useDiceStore'
import { useSheetQueueStore } from '../../store/useSheetQueueStore'
import {
  calcEffectiveAbilities,
  calcEffectiveArmorClass,
  calcEffectiveSaves,
  calcDetailedAcBreakdowns,
  calcEffectiveMaxHp,
  checkBloodrageExitSafety,
} from '../../lib/stat-calc'
import { abilityMod } from '../../lib/dice-engine'
import { CONDITION_INFO } from '../../lib/conditions'
import { StatBreakdownTooltip } from '../ui/StatBreakdownTooltip'
import { TacticalHpPopover } from './TacticalHpPopover'
import { SettingsPanel } from './SettingsPanel'
import { CloudSyncBadge } from '../sync/CloudSyncBadge'
import { useInspectorStore } from '../../store/useInspectorStore'
import { CharacterDropdown } from '../character/CharacterDropdown'
import { CharacterEmblem } from '../character/CharacterEmblem'
import { getCharacterLore } from '../../lib/character-lore'

export function TacticalHUD() {
  const navigate = useNavigate()
  const char = useCharacterStore((s) => s.activeCharacter())
  const characters = useCharacterStore((s) => s.characters)
  const setActiveCharacter = useCharacterStore((s) => s.setActiveCharacter)
  const session = useSessionStore((s) => (char ? s.getSession(char.id) : null))
  const initSession = useSessionStore((s) => s.initSession)
  const toggleCondition = useSessionStore((s) => s.toggleCondition)
  const openInspector = useInspectorStore((s) => s.openInspector)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hpPopoverOpen, setHpPopoverOpen] = useState(false)

  const newSheetsCount = useSheetQueueStore((s) => s.newCount())
  const fetchSheets = useSheetQueueStore((s) => s.fetchSheets)

  useEffect(() => {
    void fetchSheets()
  }, [fetchSheets])

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

  const hasUncannyDodge = useMemo(() => {
    if (!char) return false
    return Boolean(
      char.classAbilities?.some((a) => /uncanny dodge/i.test(a.name)) ||
      char.feats?.some((f) => /uncanny dodge/i.test(f.name))
    )
  }, [char])

  const acOptions = useMemo(() => ({ hasUncannyDodge }), [hasUncannyDodge])

  const effectiveAc = useMemo(() => {
    if (!char) return null
    return calcEffectiveArmorClass(char.armorClass, baseDexMod, effDexMod, conditions, activeBuffs, acOptions)
  }, [char, baseDexMod, effDexMod, conditions, activeBuffs, acOptions])

  const detailedAc = useMemo(() => {
    if (!char) return null
    return calcDetailedAcBreakdowns(char.armorClass, effDexMod, conditions, activeBuffs, acOptions)
  }, [char, effDexMod, conditions, activeBuffs, acOptions])

  const effectiveSaves = useMemo(() => {
    if (!char || !effectiveAbilities) return null
    return calcEffectiveSaves(char.savingThrows, char.abilities, effectiveAbilities, conditions, activeBuffs)
  }, [char, effectiveAbilities, conditions, activeBuffs])

  // If no character is active, render fallback TopBar
  if (!char) {
    return (
      <>
        <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-surface/90 border-b border-white/[0.08] px-6 py-4 flex justify-between items-center" style={{ boxShadow: '0 4px 24px -6px rgba(0,240,255,0.1)' }}>
          <span
            className="text-2xl font-black tracking-tighter text-primary uppercase font-headline cursor-pointer neon-glow-cyan-soft"
            onClick={() => navigate('/')}
          >
            NEON RELIQUARY
          </span>
          <span className="font-label text-xs text-tertiary">No Active Character</span>
          <div className="flex items-center gap-4">
            <CloudSyncBadge />
            <button
              onClick={() => navigate('/characters')}
              className="flex items-center gap-2 px-4 py-2 bg-surface-container/80 backdrop-blur-sm border border-white/10 text-white font-label text-sm rounded-xl hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-primary">account_circle</span>
              <span>Character Switcher</span>
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="p-1.5 text-tertiary hover:text-primary transition-all duration-300 rounded-lg hover:bg-white/5 cursor-pointer relative"
            >
              <span className="material-symbols-outlined text-base md:text-lg">settings</span>
              {newSheetsCount > 0 && (
                <span
                  data-testid="sheets-notification-badge"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-black font-label text-[9px] font-black flex items-center justify-center shadow-[0_0_8px_rgba(0,240,255,0.6)] animate-pulse"
                >
                  {newSheetsCount}
                </span>
              )}
            </button>
          </div>
        </header>
        <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </>
    )
  }

  // Multi-track HP math
  const hp = session?.currentHp ?? 0
  const conScore = char.abilities.con ?? 10
  const baseConMod = abilityMod(char.abilities.con)
  const effConMod = effectiveAbilities ? effectiveAbilities.mods.con : baseConMod
  const effectiveMaxHp = calcEffectiveMaxHp(char.maxHp ?? 1, char.level ?? 1, baseConMod, effConMod)
  const maxHp = effectiveMaxHp
  const tempHp = session?.tempHp ?? 0
  const nonlethalDamage = session?.nonlethalDamage ?? 0

  const isBloodraging = Boolean(
    session?.classMechanics?.bloodrager?.isRaging ??
    session?.classMechanics?.bloodrager?.isBloodraging
  )
  const exitSafety = isBloodraging
    ? checkBloodrageExitSafety(hp, char.level ?? 4, 4, conScore)
    : null

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
        className="sticky top-0 z-50 w-full backdrop-blur-md bg-surface/90 border-b border-white/[0.08] md:h-16 flex flex-col justify-center"
        style={{ boxShadow: '0 4px 24px -6px rgba(0,240,255,0.1)' }}
      >
        {/* Main Cockpit Bar */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-2.5 md:flex md:flex-nowrap md:justify-between md:gap-4 md:px-6">
          {/* Left Cockpit: App Branding & Character Identity */}
          <div className="col-start-1 row-start-1 flex flex-shrink-0 items-center gap-3">
            <span
              className="text-xl md:text-2xl font-black tracking-tighter text-primary uppercase font-headline cursor-pointer neon-glow-cyan-soft select-none"
              onClick={() => navigate('/')}
            >
              NEON RELIQUARY
            </span>
            <div className="h-5 md:h-8 w-px bg-white/10 mx-1 shrink-0" />
            <div className="flex items-center gap-1.5 sm:gap-2.5 select-none min-w-0">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg overflow-hidden flex-shrink-0">
                <CharacterEmblem
                  characterId={char.id}
                  lore={getCharacterLore(char.id)}
                  variant="avatar"
                  className="w-full h-full"
                />
              </div>
              <div className="min-w-0">
                <h1 className="font-headline text-xs sm:text-base leading-none text-white font-bold truncate max-w-[85px] sm:max-w-none">
                  {char.name}
                </h1>
                <p className="font-label text-[8px] sm:text-xs tracking-wider sm:tracking-widest text-tertiary uppercase mt-0.5 truncate max-w-[85px] sm:max-w-none">
                  Level {char.level} {char.class}
                </p>
              </div>
            </div>
          </div>

          {/* Center Cockpit: Tactical Vitals (HP Bar, AC, Saves) */}
          <div className="col-span-2 row-start-2 flex w-full flex-nowrap items-center justify-center gap-1.5 sm:gap-2 md:col-span-1 md:row-start-auto md:mx-2 md:max-w-2xl md:flex-1 md:gap-3">
            {/* Multi-Track HP Bar Container with Popover Trigger */}
            <div className="relative flex-1 min-w-[120px] sm:min-w-[140px] max-w-sm">
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
                    {exitSafety && exitSafety.severity !== 'none' && (
                      <span
                        title={exitSafety.message}
                        className={`font-label text-[10px] font-black uppercase px-1.5 py-0.2 rounded animate-pulse cursor-help ${
                          exitSafety.severity === 'danger'
                            ? 'text-error bg-error/20 border border-error/50'
                            : 'text-amber-400 bg-amber-950/60 border border-amber-500/30'
                        }`}
                      >
                        {exitSafety.isInstantDeath ? 'RAGE: LETHAL' : 'RAGE: RISK'}
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

            {/* AC Capsule (Total, Touch, Flat-Footed) */}
            {effectiveAc && detailedAc && (
              <div
                className="flex flex-nowrap items-center shrink-0 rounded-xl bg-surface-container/70 border border-white/10 p-0.5"
                role="group"
                aria-label="Armor Class"
              >
                {/* Total AC */}
                <StatBreakdownTooltip
                  title="Armor Class (Total)"
                  total={effectiveAc.total}
                  breakdown={detailedAc.totalBreakdown}
                  notes={effectiveAc.notes}
                >
                  <div
                    data-testid="ac-total"
                    className="px-1.5 sm:px-2 py-1 rounded-lg hover:border-primary/40 hover:bg-surface-container-high transition-all flex flex-col items-center justify-center min-w-[36px] sm:min-w-[40px] cursor-pointer"
                  >
                    <span className="font-label text-[8px] sm:text-[9px] uppercase tracking-widest text-tertiary font-semibold">
                      AC
                    </span>
                    <span
                      className={`font-label text-xs sm:text-sm leading-none mt-0.5 ${
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

                <div className="h-4 w-px bg-white/10 my-auto" />

                {/* Touch AC */}
                <StatBreakdownTooltip
                  title="Touch Armor Class"
                  total={effectiveAc.touch}
                  breakdown={detailedAc.touchBreakdown}
                  notes={effectiveAc.notes}
                  className="inline-flex"
                >
                  <div
                    data-testid="ac-touch"
                    className="px-1.5 sm:px-2 py-1 rounded-lg hover:border-primary/40 hover:bg-surface-container-high transition-all flex flex-col items-center justify-center min-w-[34px] sm:min-w-[38px] cursor-pointer"
                  >
                    <span className="font-label text-[8px] sm:text-[9px] uppercase tracking-widest text-tertiary font-semibold">
                      TOUCH
                    </span>
                    <span
                      className={`font-label text-xs sm:text-sm leading-none mt-0.5 ${
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

                <div className="h-4 w-px bg-white/10 my-auto" />

                {/* Flat-Footed AC */}
                <StatBreakdownTooltip
                  title="Flat-Footed Armor Class"
                  total={effectiveAc.flatFooted}
                  breakdown={detailedAc.flatFootedBreakdown}
                  notes={effectiveAc.notes}
                  className="inline-flex"
                >
                  <div
                    data-testid="ac-flat-footed"
                    className="px-1.5 sm:px-2 py-1 rounded-lg hover:border-primary/40 hover:bg-surface-container-high transition-all flex flex-col items-center justify-center min-w-[34px] sm:min-w-[38px] cursor-pointer"
                  >
                    <span className="font-label text-[8px] sm:text-[9px] uppercase tracking-widest text-tertiary font-semibold">
                      FLAT
                    </span>
                    <span
                      className={`font-label text-xs sm:text-sm leading-none mt-0.5 ${
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

            {/* Interactive Saving Throws Capsule (Fort, Ref, Will) */}
            {effectiveSaves && (
              <div
                className="flex flex-nowrap items-center shrink-0 rounded-xl bg-surface-container/70 border border-white/10 p-0.5"
                role="group"
                aria-label="Saving Throws"
              >
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
                ).map((save, idx) => {
                  const isBuffed = save.val > save.base
                  const isPenalized = save.val < save.base
                  const valColor = isBuffed
                    ? 'text-[#00daf3] font-black'
                    : isPenalized
                    ? 'text-[#ffb4ab] font-black'
                    : 'text-on-surface font-bold'

                  return (
                    <div key={save.key} className="flex items-center">
                      {idx > 0 && <div className="h-4 w-px bg-white/10 my-auto" />}
                      <StatBreakdownTooltip
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
                          className="px-1.5 sm:px-2 py-1 rounded-lg hover:border-secondary/60 hover:bg-secondary/10 active:scale-95 transition-all flex flex-col items-center justify-center min-w-[34px] sm:min-w-[38px] cursor-pointer group"
                        >
                          <div className="flex items-center gap-0.5">
                            <span className="font-label text-[8px] sm:text-[9px] uppercase tracking-widest text-secondary group-hover:text-primary transition-colors font-semibold">
                              {save.label}
                            </span>
                            <span className="material-symbols-outlined text-[9px] sm:text-[10px] text-tertiary/60 group-hover:text-primary transition-colors">
                              casino
                            </span>
                          </div>
                          <span className={`font-label text-xs sm:text-sm leading-none mt-0.5 ${valColor}`}>
                            {save.val >= 0 ? `+${save.val}` : save.val}
                          </span>
                        </button>
                      </StatBreakdownTooltip>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Active Conditions (Integrated in Cockpit — Zero layout shift) */}
            {conditions.length > 0 && (
              <div className="flex flex-nowrap items-center gap-1 sm:gap-1.5 shrink-0" role="group" aria-label="Active Conditions">
                {conditions.map((cond) => {
                  const info = CONDITION_INFO[cond]
                  return (
                    <div
                      key={cond}
                      className="group inline-flex items-center rounded-xl text-[10px] font-label font-bold uppercase tracking-wider bg-error/15 border border-error/40 text-error shadow-[0_0_8px_rgba(255,75,96,0.25)] hover:bg-error/25 hover:border-error/70 transition-all flex-shrink-0"
                    >
                      <StatBreakdownTooltip
                        title={info?.name ?? cond}
                        total="CONDITION"
                        breakdown={[]}
                        notes={info?.penalties}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            openInspector({
                              type: 'condition',
                              id: cond,
                              title: info?.name ?? cond,
                              subtitle: 'Active Condition',
                              description: info?.summary ?? 'Condition details.',
                              tags: ['Condition'],
                              notes: info?.penalties,
                            })
                          }}
                          aria-label={`Inspect condition ${cond}`}
                          className="flex items-center gap-1 pl-2 pr-1 py-1 cursor-pointer hover:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[11px] sm:text-[12px]">warning</span>
                          <span className="text-[9px] sm:text-[10px] leading-none">{cond}</span>
                        </button>
                      </StatBreakdownTooltip>
                      <button
                        type="button"
                        onClick={() => toggleCondition(char.id, cond)}
                        aria-label={`Remove condition ${cond}`}
                        className="pr-2 pl-0.5 py-1 text-error/60 hover:text-white cursor-pointer transition-colors"
                        title="Remove condition"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Cockpit: Cycler & Switcher & Settings */}
          <div className="col-start-2 row-start-1 flex flex-shrink-0 items-center gap-2 justify-self-end md:gap-3">
            <CloudSyncBadge />
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

            <CharacterDropdown align="right" variant="cockpit" />

            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="p-1.5 text-tertiary hover:text-primary transition-all duration-300 rounded-lg hover:bg-white/5 cursor-pointer relative"
            >
              <span className="material-symbols-outlined text-base md:text-lg">settings</span>
              {newSheetsCount > 0 && (
                <span
                  data-testid="sheets-notification-badge"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-black font-label text-[9px] font-black flex items-center justify-center shadow-[0_0_8px_rgba(0,240,255,0.6)] animate-pulse"
                >
                  {newSheetsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
