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
import { getWildShapeView } from '../../lib/class-combat'
import { StatBreakdownTooltip } from '../ui/StatBreakdownTooltip'
import { TacticalHpPopover } from './TacticalHpPopover'
import { SettingsPanel } from './SettingsPanel'
import { CloudSyncBadge } from '../sync/CloudSyncBadge'
import { LanguageToggle } from './LanguageToggle'
import { useInspectorStore } from '../../store/useInspectorStore'
import { CharacterDropdown } from '../character/CharacterDropdown'
import { CharacterEmblem } from '../character/CharacterEmblem'
import { getCharacterLore } from '../../lib/character-lore'
import { useTranslation, getConditionInfo, translateSaveName, translateClassName } from '../../i18n'

export function TacticalHUD() {
  const navigate = useNavigate()
  const char = useCharacterStore((s) => s.activeCharacter())
  const characters = useCharacterStore((s) => s.characters)
  const setActiveCharacter = useCharacterStore((s) => s.setActiveCharacter)
  const session = useSessionStore((s) => (char ? s.getSession(char.id) : null))
  const initSession = useSessionStore((s) => s.initSession)
  const toggleCondition = useSessionStore((s) => s.toggleCondition)
  const openInspector = useInspectorStore((s) => s.openInspector)
  const { locale, t } = useTranslation()

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
    const initialEquipped = (next.inventory ?? []).filter((i) => i.equipped).map((i) => i.id)
    initSession(next.id, next.maxHp, next.startingCoins, initialEquipped)
  }

  // Active Buffs & Conditions aggregation
  const conditions = useMemo(() => session?.conditions ?? [], [session?.conditions])
  const activeBuffs = useMemo(() => {
    if (!char || !session) return []
    const allBuffs = [...char.buffs, ...(session.customBuffs ?? [])]
    return allBuffs.filter((b) => session.activeBuffIds.includes(b.id))
  }, [char, session])

  const wildShapeView = useMemo(() => {
    if (!char) return null
    return getWildShapeView(char, session?.classMechanics)
  }, [char, session?.classMechanics])

  // Effective defensive stats calculations
  const effectiveAbilities = useMemo(() => {
    if (!char || !wildShapeView) return null
    return calcEffectiveAbilities(wildShapeView.abilities, conditions, activeBuffs)
  }, [char, wildShapeView, conditions, activeBuffs])

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
    if (!char || !wildShapeView) return null
    return calcEffectiveArmorClass(wildShapeView.armorClass, baseDexMod, effDexMod, conditions, activeBuffs, acOptions)
  }, [char, wildShapeView, baseDexMod, effDexMod, conditions, activeBuffs, acOptions])

  const detailedAc = useMemo(() => {
    if (!char || !wildShapeView) return null
    return calcDetailedAcBreakdowns(wildShapeView.armorClass, effDexMod, conditions, activeBuffs, acOptions)
  }, [char, wildShapeView, effDexMod, conditions, activeBuffs, acOptions])

  const effectiveSaves = useMemo(() => {
    if (!char || !effectiveAbilities) return null
    return calcEffectiveSaves(char.savingThrows, char.abilities, effectiveAbilities, conditions, activeBuffs)
  }, [char, effectiveAbilities, conditions, activeBuffs])

  // If no character is active, render fallback TopBar
  if (!char) {
    return (
      <>
        <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-surface/95 border-b border-white/[0.1] px-3 sm:px-6 py-2.5 md:h-16 md:py-0 flex flex-wrap justify-between items-center gap-2" style={{ boxShadow: '0 4px 24px -6px rgba(0,240,255,0.1)' }}>
          <span
            className="text-lg sm:text-2xl font-black tracking-tighter text-primary uppercase font-headline cursor-pointer neon-glow-cyan-soft whitespace-nowrap"
            onClick={() => navigate('/')}
          >
            NEON RELIQUARY
          </span>
          <span className="sr-only md:not-sr-only font-label text-xs text-tertiary">{t('hud.noActiveCharacter')}</span>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <CloudSyncBadge />
            <button
              onClick={() => navigate('/characters')}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-surface-container/90 backdrop-blur-sm border border-white/15 text-white font-label text-xs sm:text-sm rounded-xl hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-primary">account_circle</span>
              <span className="hidden sm:inline">{t('hud.characterSwitcher')}</span>
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label={t('hud.settings')}
              className="p-1.5 text-tertiary hover:text-primary transition-all duration-300 rounded-lg hover:bg-white/5 cursor-pointer relative"
            >
              <span className="material-symbols-outlined text-base md:text-lg">settings</span>
              {newSheetsCount > 0 && (
                <span
                  data-testid="sheets-notification-badge"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-black font-label text-[10px] font-black flex items-center justify-center shadow-[0_0_8px_rgba(0,240,255,0.6)] animate-pulse"
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
        className="sticky top-0 z-50 w-full backdrop-blur-md bg-surface/95 border-b border-white/[0.1] xl:min-h-16 flex flex-col justify-center"
        style={{ boxShadow: '0 4px 24px -6px rgba(0,240,255,0.1)' }}
      >
        {/* Main Cockpit Bar */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 px-3 py-2 sm:px-4 xl:flex xl:flex-nowrap xl:justify-between xl:gap-4 xl:px-6 xl:py-2.5">
          {/* Left Cockpit: App Branding & Character Identity */}
          <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 sm:gap-3 xl:flex-shrink-0">
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Home"
              className="lg:hidden w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 text-primary flex items-center justify-center flex-shrink-0 hover:bg-primary/20 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">hexagon</span>
            </button>
            <span
              className="hidden lg:inline text-xl xl:text-2xl font-black tracking-tighter text-primary uppercase font-headline cursor-pointer neon-glow-cyan-soft select-none whitespace-nowrap"
              onClick={() => navigate('/')}
            >
              NEON RELIQUARY
            </span>
            <div className="hidden lg:block h-7 w-px bg-white/10 mx-0.5 shrink-0" />
            <div className="flex items-center gap-2 sm:gap-2.5 select-none min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                <CharacterEmblem
                  characterId={char.id}
                  lore={getCharacterLore(char.id)}
                  variant="avatar"
                  className="w-full h-full"
                />
              </div>
              <div className="min-w-0">
                <h1 className="font-headline text-sm sm:text-base leading-tight text-white font-bold truncate">
                  {char.name}
                </h1>
                <p className="font-label text-[11px] sm:text-xs tracking-wide text-on-surface-variant uppercase truncate">
                  {t('common.level')} {char.level} {translateClassName(char.class, locale)}
                </p>
              </div>
            </div>
          </div>

          {/* Center Cockpit: Tactical Vitals (HP Bar, AC, Saves, Conditions) */}
          <div className="col-span-2 row-start-2 flex w-full flex-col gap-1.5 xl:col-span-1 xl:row-start-auto xl:mx-2 xl:max-w-3xl xl:flex-1 xl:flex-row xl:flex-nowrap xl:items-center xl:justify-center xl:gap-3">
            {/* Multi-Track HP Bar Container with Popover Trigger */}
            <div className="relative w-full xl:flex-1 xl:min-w-[150px] xl:max-w-xs">
              <div
                role="button"
                tabIndex={0}
                data-testid="hp-popover-trigger"
                onClick={() => setHpPopoverOpen((prev) => !prev)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setHpPopoverOpen((prev) => !prev)
                }}
                aria-label={t('hud.manageHp')}
                className="cursor-pointer group py-1 px-2 rounded-xl bg-surface-container/50 xl:bg-transparent border border-white/[0.06] xl:border-transparent hover:bg-white/[0.05] transition-all"
              >
                {/* Multi-Track Progress Bar */}
                <div className="h-2.5 w-full bg-surface-container-lowest rounded-full overflow-hidden border border-white/[0.1] relative">
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
                <div className="flex items-center justify-between gap-2 mt-1 px-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-label text-xs font-bold text-primary">
                      {hp} / {maxHp} {t('hud.hp')}
                    </span>
                    {tempHp > 0 && (
                      <span className="font-label text-[11px] text-cyan-200 font-semibold bg-cyan-950/70 border border-cyan-400/35 px-1.5 rounded">
                        +{tempHp} {t('hud.temp').toUpperCase()}
                      </span>
                    )}
                    {nonlethalDamage > 0 && (
                      <span className="font-label text-[11px] text-[#ffb4ab] font-semibold bg-[#ffb4ab]/15 border border-[#ffb4ab]/35 px-1.5 rounded tabular-nums">
                        {nonlethalDamage} NL
                      </span>
                    )}
                  </div>

                  {/* Status Alerts */}
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {isDead && (
                      <span className="font-label text-[11px] font-black uppercase text-error bg-error/20 border border-error/50 px-1.5 py-0.5 rounded animate-pulse">
                        {locale === 'it' ? 'MORTO' : 'DEAD'}
                      </span>
                    )}
                    {isDying && (
                      <span className="font-label text-[11px] font-black uppercase text-error bg-error/20 border border-error/50 px-1.5 py-0.5 rounded animate-pulse">
                        {locale === 'it' ? 'MORENTE' : 'DYING'}
                      </span>
                    )}
                    {isDisabled && (
                      <span className="font-label text-[11px] font-bold uppercase text-amber-300 bg-amber-950/70 border border-amber-400/40 px-1.5 py-0.5 rounded">
                        {locale === 'it' ? 'INABILE' : 'DISABLED'}
                      </span>
                    )}
                    {isUnconscious && (
                      <span className="font-label text-[11px] font-bold uppercase text-[#ffb4ab] bg-[#ffb4ab]/15 border border-[#ffb4ab]/35 px-1.5 py-0.5 rounded animate-pulse">
                        {locale === 'it' ? 'PRIVO DI SENSI' : 'UNCONSCIOUS'}
                      </span>
                    )}
                    {isStaggered && (
                      <span className="font-label text-[11px] font-bold uppercase text-amber-300 bg-amber-950/70 border border-amber-400/40 px-1.5 py-0.5 rounded">
                        {locale === 'it' ? 'BARCOLLANTE' : 'STAGGERED'}
                      </span>
                    )}
                    {exitSafety && exitSafety.severity !== 'none' && (
                      <span
                        title={exitSafety.message}
                        className={`font-label text-[11px] font-black uppercase px-1.5 py-0.5 rounded animate-pulse cursor-help ${
                          exitSafety.severity === 'danger'
                            ? 'text-error bg-error/20 border border-error/50'
                            : 'text-amber-300 bg-amber-950/70 border border-amber-400/40'
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

            {/* Defenses Row: AC Capsule + Saving Throws Capsule */}
            <div className="flex w-full items-center justify-between gap-1.5 sm:justify-start sm:gap-2.5 xl:w-auto xl:shrink-0">
              {/* AC Capsule (Total, Touch, Flat-Footed) */}
              {effectiveAc && detailedAc && (
                <div
                  className="flex flex-1 sm:flex-initial justify-around flex-nowrap items-center shrink-0 rounded-xl bg-surface-container/85 border border-white/10 p-0.5"
                  role="group"
                  aria-label={locale === 'it' ? 'Classe Armatura' : 'Armor Class'}
                >
                  {/* Total AC */}
                  <StatBreakdownTooltip
                    title={locale === 'it' ? 'Classe Armatura (Totale)' : 'Armor Class (Total)'}
                    total={effectiveAc.total}
                    breakdown={detailedAc.totalBreakdown}
                    notes={effectiveAc.notes}
                    align="left"
                  >
                    <div
                      data-testid="ac-total"
                      className="px-1.5 sm:px-2 py-1 rounded-lg hover:border-primary/40 hover:bg-surface-container-high transition-all flex flex-col items-center justify-center min-w-[38px] sm:min-w-[42px] cursor-pointer"
                    >
                      <span className="font-label text-[10px] uppercase tracking-wider text-tertiary font-semibold leading-none">
                        {t('hud.ac')}
                      </span>
                      <span
                        className={`font-label text-xs sm:text-sm leading-tight mt-0.5 ${
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
                    title={locale === 'it' ? 'Classe Armatura a Contatto' : 'Touch Armor Class'}
                    total={effectiveAc.touch}
                    breakdown={detailedAc.touchBreakdown}
                    notes={effectiveAc.notes}
                    className="inline-flex"
                    align="left"
                  >
                    <div
                      data-testid="ac-touch"
                      className="px-1.5 sm:px-2 py-1 rounded-lg hover:border-primary/40 hover:bg-surface-container-high transition-all flex flex-col items-center justify-center min-w-[38px] sm:min-w-[42px] cursor-pointer"
                    >
                      <span className="font-label text-[10px] uppercase tracking-wider text-tertiary font-semibold leading-none">
                        {locale === 'it' ? 'CONT' : 'TOUCH'}
                      </span>
                      <span
                        className={`font-label text-xs sm:text-sm leading-tight mt-0.5 ${
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
                    title={locale === 'it' ? 'Classe Armatura Impreparato' : 'Flat-Footed Armor Class'}
                    total={effectiveAc.flatFooted}
                    breakdown={detailedAc.flatFootedBreakdown}
                    notes={effectiveAc.notes}
                    className="inline-flex"
                  >
                    <div
                      data-testid="ac-flat-footed"
                      className="px-1.5 sm:px-2 py-1 rounded-lg hover:border-primary/40 hover:bg-surface-container-high transition-all flex flex-col items-center justify-center min-w-[38px] sm:min-w-[42px] cursor-pointer"
                    >
                      <span className="font-label text-[10px] uppercase tracking-wider text-tertiary font-semibold leading-none">
                        {locale === 'it' ? 'IMP' : 'FLAT'}
                      </span>
                      <span
                        className={`font-label text-xs sm:text-sm leading-tight mt-0.5 ${
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
                  className="flex flex-1 sm:flex-initial justify-around flex-nowrap items-center shrink-0 rounded-xl bg-surface-container/85 border border-white/10 p-0.5"
                  role="group"
                  aria-label={locale === 'it' ? 'Tiri Salvezza' : 'Saving Throws'}
                >
                  {(
                    [
                      {
                        key: 'fort',
                        label: translateSaveName('fort', locale, true).toUpperCase(),
                        fullName: locale === 'it' ? 'Tiro Salvezza Tempra' : 'Fortitude Save',
                        val: effectiveSaves.fort,
                        base: char.savingThrows.fort,
                        bkd: effectiveSaves.breakdowns.fortitude,
                        align: 'center' as const,
                      },
                      {
                        key: 'ref',
                        label: translateSaveName('ref', locale, true).toUpperCase(),
                        fullName: locale === 'it' ? 'Tiro Salvezza Riflessi' : 'Reflex Save',
                        val: effectiveSaves.ref,
                        base: char.savingThrows.ref,
                        bkd: effectiveSaves.breakdowns.reflex,
                        align: 'right' as const,
                      },
                      {
                        key: 'will',
                        label: translateSaveName('will', locale, true).toUpperCase(),
                        fullName: locale === 'it' ? 'Tiro Salvezza Volontà' : 'Will Save',
                        val: effectiveSaves.will,
                        base: char.savingThrows.will,
                        bkd: effectiveSaves.breakdowns.will,
                        align: 'right' as const,
                      },
                    ] as const
                  ).map((save, sIdx) => {
                    const isBuffed = save.val > save.base
                    const isPenalized = save.val < save.base
                    const valColor = isBuffed
                      ? 'text-[#00daf3] font-black'
                      : isPenalized
                      ? 'text-[#ffb4ab] font-black'
                      : 'text-on-surface font-bold'

                    return (
                      <div key={save.key} className="flex items-center">
                        {sIdx > 0 && <div className="h-4 w-px bg-white/10 my-auto" />}
                        <StatBreakdownTooltip
                          title={save.fullName}
                          total={save.val >= 0 ? `+${save.val}` : `${save.val}`}
                          breakdown={save.bkd}
                          align={save.align}
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
                            aria-label={`${t('common.roll')} ${save.fullName}`}
                            className="px-1.5 sm:px-2 py-1 rounded-lg hover:border-secondary/60 hover:bg-secondary/10 active:scale-95 transition-all flex flex-col items-center justify-center min-w-[42px] sm:min-w-[46px] cursor-pointer group"
                          >
                            <div className="flex items-center gap-0.5">
                              <span className="font-label text-[10px] uppercase tracking-wider text-secondary group-hover:text-primary transition-colors font-semibold leading-none">
                                {save.label}
                              </span>
                              <span className="material-symbols-outlined text-[10px] text-tertiary group-hover:text-primary transition-colors leading-none">
                                casino
                              </span>
                            </div>
                            <span className={`font-label text-xs sm:text-sm leading-tight mt-0.5 ${valColor}`}>
                              {save.val >= 0 ? `+${save.val}` : save.val}
                            </span>
                          </button>
                        </StatBreakdownTooltip>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Active Conditions (Scrollable strip on mobile — never pushes HP or AC off-screen) */}
            {conditions.length > 0 && (
              <div
                className="flex w-full xl:w-auto flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 xl:shrink-0 xl:max-w-[220px]"
                role="group"
                aria-label={t('hud.activeConditions')}
              >
                {conditions.map((cond) => {
                  const info = getConditionInfo(cond, locale)
                  return (
                    <div
                      key={cond}
                      className="group inline-flex items-center rounded-xl text-[11px] font-label font-bold uppercase tracking-wider bg-error/15 border border-error/45 text-error shadow-[0_0_8px_rgba(255,75,96,0.2)] hover:bg-error/25 hover:border-error/70 transition-all flex-shrink-0"
                    >
                      <StatBreakdownTooltip
                        title={info?.name ?? cond}
                        total={t('hud.conditionTag').toUpperCase()}
                        breakdown={[]}
                        notes={info?.penalties}
                        align="left"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            openInspector({
                              type: 'condition',
                              id: cond,
                              title: info?.name ?? cond,
                              subtitle: t('hud.activeCondition'),
                              description: info?.summary ?? t('hud.conditionDetails'),
                              tags: [t('hud.conditionTag')],
                              notes: info?.penalties,
                            })
                          }}
                          aria-label={`${t('hud.inspectCondition')} ${info?.name ?? cond}`}
                          className="flex items-center gap-1 pl-2 pr-1 py-1 cursor-pointer hover:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-xs">warning</span>
                          <span className="text-[11px] leading-none">{locale === 'it' ? (info?.name ?? cond) : cond}</span>
                        </button>
                      </StatBreakdownTooltip>
                      <button
                        type="button"
                        onClick={() => toggleCondition(char.id, cond)}
                        aria-label={`${t('hud.removeCondition')} ${cond}`}
                        className="pr-2 pl-1 py-1 text-error/80 hover:text-white cursor-pointer transition-colors"
                        title={t('hud.removeCondition')}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Cockpit: Language & Cycler & Switcher & Settings */}
          <div className="col-start-2 row-start-1 flex flex-shrink-0 items-center gap-1.5 sm:gap-2 justify-self-end xl:gap-2.5">
            <div className="hidden sm:block">
              <LanguageToggle />
            </div>
            <CloudSyncBadge />
            {characters.length >= 2 && (
              <div className="hidden sm:flex items-center gap-0.5">
                <button
                  onClick={() => cycleTo(-1)}
                  aria-label={t('hud.previousCharacter')}
                  className="p-1.5 text-tertiary hover:text-primary transition-all duration-300 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base md:text-lg">chevron_left</span>
                </button>
                <button
                  onClick={() => cycleTo(1)}
                  aria-label={t('hud.nextCharacter')}
                  className="p-1.5 text-tertiary hover:text-primary transition-all duration-300 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base md:text-lg">chevron_right</span>
                </button>
              </div>
            )}

            <CharacterDropdown align="right" variant="cockpit" />

            <button
              onClick={() => setSettingsOpen(true)}
              aria-label={t('hud.settings')}
              className="p-1.5 text-tertiary hover:text-primary transition-all duration-300 rounded-lg hover:bg-white/5 cursor-pointer relative"
            >
              <span className="material-symbols-outlined text-base md:text-lg">settings</span>
              {newSheetsCount > 0 && (
                <span
                  data-testid="sheets-notification-badge"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-black font-label text-[10px] font-black flex items-center justify-center shadow-[0_0_8px_rgba(0,240,255,0.6)] animate-pulse"
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
