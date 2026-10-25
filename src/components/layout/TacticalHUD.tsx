import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCharacterStore } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'
import { useDiceStore } from '../../store/useDiceStore'
import { useChatStore } from '../../store/useChatStore'
import {
  calcEffectiveAbilities,
  calcEffectiveArmorClass,
  calcEffectiveSaves,
  calcDetailedAcBreakdowns,
} from '../../lib/stat-calc'
import { abilityMod } from '../../lib/dice-engine'
import { CONDITION_INFO } from '../../lib/conditions'
import { StatBreakdownTooltip } from '../ui/StatBreakdownTooltip'
import { TacticalHpPopover } from './TacticalHpPopover'
import { SettingsPanel } from './SettingsPanel'
import { CloudSyncBadge } from '../sync/CloudSyncBadge'
import { useInspectorStore } from '../../store/useInspectorStore'

export function TacticalHUD() {
  const navigate = useNavigate()
  const char = useCharacterStore((s) => s.activeCharacter())
  const characters = useCharacterStore((s) => s.characters)
  const setActiveCharacter = useCharacterStore((s) => s.setActiveCharacter)
  const session = useSessionStore((s) => (char ? s.getSession(char.id) : null))
  const initSession = useSessionStore((s) => s.initSession)
  const toggleCondition = useSessionStore((s) => s.toggleCondition)
  const openInspector = useInspectorStore((s) => s.openInspector)
  const openChat = useChatStore((s) => s.openChat)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hpPopoverOpen, setHpPopoverOpen] = useState(false)
  const [mobileTrayOpen, setMobileTrayOpen] = useState(false)

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
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-surface/90 border-b border-white/[0.08] px-3 py-2 md:px-6 md:py-4 flex justify-between items-center" style={{ boxShadow: '0 4px 24px -6px rgba(0,240,255,0.1)' }}>
        <span
          className="text-lg md:text-2xl font-black tracking-tighter text-primary uppercase font-headline cursor-pointer neon-glow-cyan-soft"
          onClick={() => navigate('/characters')}
        >
          NEON RELIQUARY
        </span>
        <span className="font-label text-xs text-tertiary">No Active Character</span>
        <div className="flex items-center gap-2 md:gap-4">
          <CloudSyncBadge />
          <button
            onClick={() => navigate('/characters')}
            className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-surface-container/80 backdrop-blur-sm border border-white/10 text-white font-label text-xs md:text-sm rounded-xl hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-primary">account_circle</span>
            <span className="hidden sm:inline">Character Switcher</span>
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
        className="sticky top-0 z-50 w-full backdrop-blur-md bg-surface/90 border-b border-white/[0.08] flex flex-col justify-center"
        style={{ boxShadow: '0 4px 24px -6px rgba(0,240,255,0.1)' }}
      >
        {/* Main Cockpit Bar (Single Row ~46px on Mobile, ~64px on Desktop) */}
        <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 min-h-[46px] md:h-16 md:gap-4 md:px-6">
          {/* Left Cockpit: App Branding & Character Identity */}
          <div className="flex flex-shrink-0 items-center gap-2 md:gap-3 min-w-0">
            <span
              className="hidden md:inline text-xl md:text-2xl font-black tracking-tighter text-primary uppercase font-headline cursor-pointer neon-glow-cyan-soft select-none"
              onClick={() => navigate('/characters')}
            >
              NEON RELIQUARY
            </span>
            <div className="hidden md:block h-8 w-px bg-white/10 mx-1" />
            <button
              type="button"
              onClick={() => navigate('/characters')}
              className="flex flex-col text-left min-w-0 max-w-[100px] sm:max-w-[140px] md:hidden xl:flex xl:max-w-none cursor-pointer focus-visible:outline-none"
              title="Apri selezione personaggio"
            >
              <h1 className="font-headline text-xs xl:text-base leading-tight text-white font-bold truncate">
                {char.name}
              </h1>
              <p className="font-label text-[9px] xl:text-xs tracking-wider xl:tracking-widest text-tertiary uppercase truncate">
                Level {char.level} {char.class}
              </p>
            </button>
          </div>

          {/* Center Cockpit: Always-Visible Vitals (HP Pill + AC Total) */}
          <div className="flex flex-1 items-center justify-center gap-1.5 md:gap-3 min-w-0 max-w-xl">
            {/* Multi-Track HP Bar Container with Popover Trigger */}
            <div className="relative flex-1 min-w-[110px] max-w-[220px] md:max-w-sm">
              <div
                role="button"
                tabIndex={0}
                data-testid="hp-popover-trigger"
                onClick={() => setHpPopoverOpen((prev) => !prev)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setHpPopoverOpen((prev) => !prev)
                }}
                aria-label="Adjust hit points"
                className="cursor-pointer group py-0.5 px-1.5 md:py-1 md:px-2 rounded-xl hover:bg-white/[0.04] transition-all"
              >
                {/* Multi-Track Progress Bar */}
                <div className="h-1.5 md:h-2.5 w-full bg-surface-container-lowest rounded-full overflow-hidden border border-white/[0.08] relative">
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
                <div className="flex items-center justify-between mt-0.5 md:mt-1 px-0.5">
                  <div className="flex items-center gap-1 md:gap-1.5 flex-wrap">
                    <span className="font-label text-[10px] md:text-xs font-bold text-primary tabular-nums">
                      {hp} / {maxHp} HP
                    </span>
                    {tempHp > 0 && (
                      <span className="font-label text-[8px] md:text-[10px] text-cyan-300 font-semibold bg-cyan-950/60 border border-cyan-500/30 px-1 rounded">
                        +{tempHp} TEMP
                      </span>
                    )}
                    {nonlethalDamage > 0 && (
                      <span className="font-label text-[8px] md:text-[10px] text-[#ffb4ab] font-semibold bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 px-1 rounded tabular-nums">
                        {nonlethalDamage} NL
                      </span>
                    )}
                  </div>

                  {/* Status Alerts */}
                  <div className="flex items-center gap-1">
                    {isDead && (
                      <span className="font-label text-[9px] font-black uppercase text-error bg-error/20 border border-error/50 px-1 rounded animate-pulse">
                        DEAD
                      </span>
                    )}
                    {isDying && (
                      <span className="font-label text-[9px] font-black uppercase text-error bg-error/20 border border-error/50 px-1 rounded animate-pulse">
                        DYING
                      </span>
                    )}
                    {isDisabled && (
                      <span className="font-label text-[9px] font-bold uppercase text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1 rounded">
                        DISABLED
                      </span>
                    )}
                    {isUnconscious && (
                      <span className="font-label text-[9px] font-bold uppercase text-[#ffb4ab] bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 px-1 rounded animate-pulse">
                        UNCONSCIOUS
                      </span>
                    )}
                    {isStaggered && (
                      <span className="font-label text-[9px] font-bold uppercase text-amber-300 bg-amber-950/60 border border-amber-500/30 px-1 rounded">
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

            {/* Total AC Badge (Always on primary bar) */}
            {effectiveAc && detailedAc && (
              <StatBreakdownTooltip
                title="Armor Class (Total)"
                total={effectiveAc.total}
                breakdown={detailedAc.totalBreakdown}
                notes={effectiveAc.notes}
              >
                <div
                  data-testid="ac-total"
                  className="px-1.5 py-0.5 md:px-2 md:py-1 rounded-xl bg-surface-container/70 border border-white/10 hover:border-primary/40 hover:bg-surface-container-high transition-all flex flex-col items-center justify-center min-w-[34px] md:min-w-[42px] cursor-pointer"
                >
                  <span className="font-label text-[8px] md:text-[9px] uppercase tracking-widest text-tertiary font-semibold leading-none">
                    AC
                  </span>
                  <span
                    className={`font-label text-xs md:text-sm leading-none mt-0.5 ${
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
            )}
          </div>

          {/* Right Cockpit: Mobile Tray Toggle + Chat Trigger + Settings Gear */}
          <div className="flex flex-shrink-0 items-center gap-1 md:gap-2 justify-self-end">
            {/* Mobile Expand Tray Toggle */}
            <button
              type="button"
              onClick={() => setMobileTrayOpen((v) => !v)}
              aria-expanded={mobileTrayOpen}
              aria-label={mobileTrayOpen ? 'Chiudi dettagli HUD' : 'Espandi dettagli HUD'}
              className="relative p-1 text-tertiary hover:text-primary transition-all rounded-lg hover:bg-white/5 cursor-pointer md:hidden"
              title={mobileTrayOpen ? 'Nascondi dettagli' : 'Mostra TS, CA e Condizioni'}
            >
              <span className={`material-symbols-outlined text-lg transition-transform duration-200 ${mobileTrayOpen ? 'rotate-180 text-primary' : ''}`}>
                expand_more
              </span>
              {conditions.length > 0 && !mobileTrayOpen && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-error text-white font-mono text-[8px] font-black flex items-center justify-center animate-pulse">
                  {conditions.length}
                </span>
              )}
            </button>

            {/* Mobile Chat Quick Trigger */}
            <button
              type="button"
              onClick={openChat}
              aria-label="Apri assistente PG"
              title="Apri oracolo del personaggio"
              className="p-1 text-tertiary hover:text-primary transition-all rounded-lg hover:bg-white/5 cursor-pointer md:hidden"
            >
              <span className="material-symbols-outlined text-lg text-primary">forum</span>
            </button>

            {/* Settings Button (Always Visible) */}
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="p-1 md:p-1.5 text-tertiary hover:text-primary transition-all duration-300 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base md:text-lg">settings</span>
            </button>
          </div>
        </div>

        {/* Secondary Tactical Tray:
            - Desktop: visible inline in header
            - Mobile (< md): hidden by default, expands as a compact dropdown when mobileTrayOpen is true
        */}
        <div
          className={`${
            mobileTrayOpen
              ? 'flex flex-col gap-2 border-t border-white/[0.08] bg-surface-container/95 px-3 py-2.5 shadow-lg'
              : 'hidden md:flex'
          } md:border-t-0 md:bg-transparent md:p-0 md:flex-row md:items-center md:justify-center md:gap-3 md:pb-2`}
        >
          {/* Defenses & Saves Pod */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {/* Touch AC */}
            {effectiveAc && detailedAc && (
              <StatBreakdownTooltip
                title="Touch Armor Class"
                total={effectiveAc.touch}
                breakdown={detailedAc.touchBreakdown}
                notes={effectiveAc.notes}
                className="inline-flex"
              >
                <div
                  data-testid="ac-touch"
                  className="px-1.5 sm:px-2 py-1 rounded-xl bg-surface-container/70 border border-white/10 hover:border-primary/40 hover:bg-surface-container-high transition-all flex flex-col items-center justify-center min-w-[38px] sm:min-w-[42px] cursor-pointer"
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
            )}

            {/* Flat-Footed AC */}
            {effectiveAc && detailedAc && (
              <StatBreakdownTooltip
                title="Flat-Footed Armor Class"
                total={effectiveAc.flatFooted}
                breakdown={detailedAc.flatFootedBreakdown}
                notes={effectiveAc.notes}
                className="inline-flex"
              >
                <div
                  data-testid="ac-flat-footed"
                  className="px-1.5 sm:px-2 py-1 rounded-xl bg-surface-container/70 border border-white/10 hover:border-primary/40 hover:bg-surface-container-high transition-all flex flex-col items-center justify-center min-w-[38px] sm:min-w-[42px] cursor-pointer"
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
            )}

            {/* Interactive Saving Throws (Fort, Ref, Will) */}
            {effectiveSaves && (
              <div className="flex items-center gap-1 sm:gap-1.5" role="group" aria-label="Saving Throws">
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
                        className="px-1.5 sm:px-2 py-1 rounded-xl bg-surface-container/70 border border-white/10 hover:border-secondary/60 hover:bg-secondary/10 active:scale-95 transition-all flex flex-col items-center justify-center min-w-[38px] sm:min-w-[42px] cursor-pointer group"
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
                  )
                })}
              </div>
            )}
          </div>

          {/* Active Conditions Pod */}
          {conditions.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5" role="group" aria-label="Active Conditions">
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

          {/* Tray Controls: CloudSyncBadge, Cycler, Character Switcher (Single instance in DOM!) */}
          <div className="flex items-center justify-between md:justify-center gap-2 border-t border-white/5 pt-2 mt-1 md:border-t-0 md:pt-0 md:mt-0">
            <CloudSyncBadge />
            {characters.length >= 2 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => cycleTo(-1)}
                  aria-label="Previous character"
                  className="p-1 md:p-1.5 text-tertiary hover:text-primary transition-colors rounded-lg bg-white/5 md:bg-transparent md:hover:bg-white/5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base md:text-lg">chevron_left</span>
                </button>
                <span className="font-label text-[10px] text-tertiary uppercase md:hidden">Cambia PG</span>
                <button
                  onClick={() => cycleTo(1)}
                  aria-label="Next character"
                  className="p-1 md:p-1.5 text-tertiary hover:text-primary transition-colors rounded-lg bg-white/5 md:bg-transparent md:hover:bg-white/5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base md:text-lg">chevron_right</span>
                </button>
              </div>
            )}
            <button
              onClick={() => navigate('/characters')}
              className="flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 bg-surface-container/80 backdrop-blur-sm border border-white/10 text-white font-label text-[10px] md:text-xs rounded-xl hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-primary">account_circle</span>
              <span>Character Switcher</span>
            </button>
          </div>
        </div>
      </header>
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
