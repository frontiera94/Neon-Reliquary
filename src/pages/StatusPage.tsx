import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import { useInspectorStore } from '../store/useInspectorStore'
import { abilityMod } from '../lib/dice-engine'
import { conditionInspectorItem } from '../lib/inspector-items'
import {
  calcEffectiveAbilities,
  calcEffectiveArmorClass,
  calcEffectiveSaves,
  calcDetailedAcBreakdowns,
  calcEffectiveMaxHp,
  getActiveActionRestrictions,
  evaluateVitalStatus,
} from '../lib/stat-calc'
import { getWildShapeView } from '../lib/class-combat'
import { ActionAlertBanner } from '../components/combat/ActionAlertBanner'
import { BuffManagerModal } from '../components/combat/BuffManagerModal'
import { DailyResourcePips } from '../components/combat/BuffResourceToggle'
import { StatBreakdownTooltip } from '../components/ui/StatBreakdownTooltip'
import type { ConditionType } from '../types/combat'
import {
  useTranslation,
  getConditionInfo,
  translateAbilityShort,
  translateAbilityFull,
  translateSaveName,
} from '../i18n'
import { STAGGER_CONTAINER, STAGGER_ITEM, SNAPPY_SPRING } from '../lib/motion-presets'

const COLOR_MAP: Record<string, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  'on-surface': 'text-on-surface',
}

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

const ALL_CONDITIONS: ConditionType[] = [
  'shaken', 'sickened', 'fatigued', 'exhausted',
  'blinded', 'confused', 'dazed', 'frightened',
  'nauseated', 'paralyzed', 'prone', 'stunned',
]

export function StatusPage() {
  const char = useCharacterStore((s) => s.activeCharacter())
  const session = useSessionStore((s) => (char ? s.getSession(char.id) : null))
  const {
    applyDamage,
    applyHealing,
    initSession,
    setNonlethal,
    setTempHp,
    toggleCondition,
    longRest,
  } = useSessionStore()
  const openRoll = useDiceStore((s) => s.openRoll)
  const openInspector = useInspectorStore((s) => s.openInspector)
  const { locale, t } = useTranslation()

  const [hpDelta, setHpDelta] = useState(1)
  const [nlEdit, setNlEdit] = useState<string | null>(null)
  const [tempEdit, setTempEdit] = useState<string | null>(null)
  const [showBuffModal, setShowBuffModal] = useState(false)

  if (!char) return <EmptyState />

  if (!session) {
    const initialEquipped = (char.inventory ?? []).filter((i) => i.equipped).map((i) => i.id)
    initSession(char.id, char.maxHp, char.startingCoins, initialEquipped)
    return null
  }

  const allBuffs = [...char.buffs, ...(session.customBuffs ?? [])]
  const activeBuffs = allBuffs.filter((b) => session.activeBuffIds.includes(b.id))

  const wildShapeView = getWildShapeView(char, session.classMechanics)
  const hasUncannyDodge = Boolean(
    char.classAbilities?.some((a) => /uncanny dodge/i.test(a.name)) ||
    char.feats?.some((f) => /uncanny dodge/i.test(f.name))
  )
  const acOptions = { hasUncannyDodge }

  const effectiveAbilities = calcEffectiveAbilities(wildShapeView.abilities, session.conditions, activeBuffs)
  const baseDexMod = abilityMod(char.abilities.dex)
  const effDexMod = effectiveAbilities.mods.dex
  const baseConMod = abilityMod(char.abilities.con)
  const effConMod = effectiveAbilities.mods.con
  const effectiveMaxHp = calcEffectiveMaxHp(char.maxHp ?? 1, char.level ?? 1, baseConMod, effConMod)

  const effectiveSaves = calcEffectiveSaves(
    char.savingThrows,
    char.abilities,
    effectiveAbilities,
    session.conditions,
    activeBuffs
  )
  const effectiveAc = calcEffectiveArmorClass(
    wildShapeView.armorClass,
    baseDexMod,
    effDexMod,
    session.conditions,
    activeBuffs,
    acOptions
  )
  const restrictions = getActiveActionRestrictions(session.conditions)

  const hp = session.currentHp
  const maxHp = effectiveMaxHp
  const vitalStatus = evaluateVitalStatus(hp, effectiveAbilities.scores.con)

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
    wildShapeView.armorClass,
    effDexMod,
    session.conditions,
    activeBuffs,
    acOptions
  )
  const initBreakdown = [
    { label: locale === 'it' ? 'Iniz Base' : 'Base Init', value: char.initiativeBonus },
    ...(effectiveAbilities.deltas.dex !== 0
      ? [{ label: locale === 'it' ? 'Var. DES' : 'DEX Shift', value: effectiveAbilities.deltas.dex }]
      : []),
  ]

  const dexShort = translateAbilityShort('dex', locale)
  const conShort = translateAbilityShort('con', locale)
  const wisShort = translateAbilityShort('wis', locale)

  return (
    <div className="p-4 md:p-8">
      <motion.div
        variants={STAGGER_CONTAINER}
        initial="initial"
        animate="animate"
        className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        {/* Tactical Restrictions Banner */}
        {restrictions.length > 0 && (
          <motion.div variants={STAGGER_ITEM} className="lg:col-span-12">
            <ActionAlertBanner restrictions={restrictions} />
          </motion.div>
        )}

        {/* Bonded Companion Quick Banner */}
        {char.companions && char.companions.length > 0 && (() => {
          const activeCompanionId = session.activeCompanionId ?? char.companions[0]?.id
          const companion = char.companions.find((c) => c.id === activeCompanionId) ?? char.companions[0]
          return (
            <motion.div
              variants={STAGGER_ITEM}
              className="lg:col-span-12 bg-surface-container/90 backdrop-blur-sm border border-primary/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-2xl">pets</span>
                <div>
                  <p className="font-headline text-sm font-bold text-on-surface">
                    {locale === 'it' ? 'Compagno Legato:' : 'Bonded Companion:'}{' '}
                    <span className="text-secondary">{companion.name}</span>
                  </p>
                  <p className="font-label text-[10px] text-tertiary uppercase">
                    {companion.type.replace('_', ' ')} • {companion.species} • {t('hud.hp')} {session.companionHp?.[companion.id] ?? companion.maxHp} / {companion.maxHp}
                  </p>
                </div>
              </div>
              <Link
                to="/companion"
                className="px-4 py-2 bg-primary/10 border border-primary text-primary font-label text-xs uppercase tracking-widest rounded-xl hover:bg-primary/20 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all flex items-center gap-2 cursor-pointer"
              >
                {locale === 'it' ? 'Apri Scheda Compagno' : 'Open Companion Sheet'}
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </Link>
            </motion.div>
          )
        })()}

        {/* Vitality Core */}
        <motion.section
          variants={STAGGER_ITEM}
          className="lg:col-span-12 flex flex-col items-center justify-center bg-surface-container/95 backdrop-blur-sm p-5 sm:p-8 relative overflow-hidden group rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(0,240,255,0.08)] hover:border-primary/40 hover:shadow-[0_0_30px_rgba(0,240,255,0.2)] transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none" />
          <h2 className="font-headline text-lg sm:text-xl font-bold uppercase tracking-wider text-secondary mb-6 sm:mb-8 neon-glow-accent">
            {locale === 'it' ? 'Nucleo Vitale' : 'Vitality Core'}
          </h2>
          <div className="text-center">
            <motion.div
              key={hp}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={SNAPPY_SPRING}
              className="font-label text-5xl sm:text-6xl font-black text-primary leading-none"
              style={{ textShadow: '0 0 30px rgba(0,240,255,0.4)' }}
            >
              {hp}
            </motion.div>
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
                  {vitalStatus === 'dead'
                    ? t('hud.dead')
                    : vitalStatus === 'dying'
                    ? t('hud.dying')
                    : locale === 'it'
                    ? 'Inabile (0 PF)'
                    : 'Disabled (0 HP)'}
                </span>
              </div>
            )}
            <div className="font-label text-tertiary tracking-widest uppercase mt-2 text-xs">
              {locale === 'it' ? 'Punti Ferita Attuali' : 'Current Hit Points'}
            </div>
            <div className="font-label text-on-surface-variant text-sm mt-1">/ {maxHp}</div>
          </div>
          <div className="mt-6 sm:mt-8 flex items-center justify-center gap-2.5 sm:gap-3 w-full">
            <button
              onClick={() => applyDamage(char.id, hpDelta, effectiveAbilities.scores.con)}
              className="px-4 sm:px-5 py-3 bg-error-container text-on-error-container hover:brightness-125 transition-all active:scale-95 font-label text-xs sm:text-sm font-bold uppercase tracking-wider sm:tracking-widest rounded-xl cursor-pointer"
              aria-label="Decrease HP"
            >
              {t('hud.damage')}
            </button>
            <input
              type="number"
              min={1}
              value={hpDelta}
              aria-label={locale === 'it' ? 'Quantità punti ferita' : 'HP delta amount'}
              onChange={(e) => setHpDelta(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 sm:w-20 bg-surface-container-high text-on-surface font-label text-xl font-bold text-center py-3 rounded-xl border border-white/15 focus:border-primary focus:outline-none"
            />
            <button
              onClick={() => applyHealing(char.id, hpDelta, maxHp)}
              className="px-4 sm:px-5 py-3 bg-primary-container text-on-primary-container hover:brightness-125 transition-all active:scale-95 font-label text-xs sm:text-sm font-bold uppercase tracking-wider sm:tracking-widest rounded-xl cursor-pointer"
              aria-label="Increase HP"
            >
              {t('hud.heal')}
            </button>
          </div>
          <div className="mt-5 sm:mt-6 flex flex-wrap justify-center gap-3">
            {tempEdit === null ? (
              <button
                onClick={() => setTempEdit(String(session.tempHp))}
                className="px-4 py-2 bg-surface-container-lowest border border-white/10 rounded-xl font-label text-xs text-primary hover:bg-surface-container-high transition-all cursor-pointer"
              >
                {locale === 'it' ? `PF TEMP: ${session.tempHp}` : `TEMP HP: ${session.tempHp}`}
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-surface-container-lowest border border-white/10 rounded-xl px-3 py-1">
                <span className="font-label text-xs text-primary">
                  {locale === 'it' ? 'PF TEMP:' : 'TEMP HP:'}
                </span>
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
                {locale === 'it' ? `NON LETALI: ${session.nonlethalDamage}` : `NONLETHAL: ${session.nonlethalDamage}`}
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-surface-container-lowest border border-white/10 rounded-xl px-3 py-1">
                <span className="font-label text-xs text-error">
                  {locale === 'it' ? 'NON LETALI:' : 'NONLETHAL:'}
                </span>
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
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => longRest(char.id, maxHp)}
              className="px-5 py-2.5 bg-surface-container-highest border border-white/15 rounded-xl font-label text-xs font-semibold text-secondary uppercase tracking-wider hover:bg-primary/10 hover:text-primary hover:border-primary/40 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm align-middle mr-1">bedtime</span>
              {locale === 'it' ? 'Riposo Lungo' : 'Long Rest'}
            </button>
            <button
              onClick={() => setShowBuffModal(true)}
              className="px-5 py-2.5 bg-primary/15 border border-primary/45 text-primary font-label text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-primary/25 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              {locale === 'it' ? 'Buff e Preset' : 'Buffs & Presets'}
            </button>
          </div>
        </motion.section>

        {/* Defense Grid */}
        <motion.section
          variants={STAGGER_ITEM}
          className="lg:col-span-6 bg-surface-container/90 backdrop-blur-sm p-5 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:border-primary/30 transition-all grid grid-cols-2 gap-4"
        >
          <DefenseCard
            label={locale === 'it' ? 'Classe Armatura' : 'Armor Class'}
            value={effectiveAc.total}
            baseValue={char.armorClass.total}
            breakdown={detailedAc.totalBreakdown}
            notes={effectiveAc.notes}
            showSign={false}
            sub={`${locale === 'it' ? 'CONT' : 'TOUCH'}: ${effectiveAc.touch} | ${locale === 'it' ? 'IMP' : 'FLAT'}: ${effectiveAc.flatFooted}${
              effectiveAc.notes.length > 0 ? ` (${effectiveAc.notes.join(', ')})` : ''
            }`}
          />
          <DefenseCard
            label={t('status.initiative')}
            value={effectiveInit}
            baseValue={char.initiativeBonus}
            breakdown={initBreakdown}
            sub={`${dexShort}: ${effectiveAbilities.mods.dex >= 0 ? `+${effectiveAbilities.mods.dex}` : effectiveAbilities.mods.dex} | ${locale === 'it' ? 'VARIE' : 'MISC'}: +${
              char.initiativeBonus - abilityMod(char.abilities.dex)
            }`}
            color="primary"
            onRoll={() =>
              openRoll({
                diceType: 20,
                count: 1,
                modifier: effectiveInit,
                label: t('status.initiative'),
                breakdown: initBreakdown,
              })
            }
          />
          <DefenseCard
            label={translateSaveName('fort', locale, false)}
            value={effectiveSaves.fort}
            baseValue={char.savingThrows.fort}
            breakdown={effectiveSaves.breakdowns.fortitude}
            sub={`BASE: +${char.savingThrows.fortBase} | ${conShort}: ${
              effectiveAbilities.mods.con >= 0 ? `+${effectiveAbilities.mods.con}` : effectiveAbilities.mods.con
            }`}
            color="secondary"
            onRoll={() =>
              openRoll({
                diceType: 20,
                count: 1,
                modifier: effectiveSaves.fort,
                label: locale === 'it' ? 'Tiro Salvezza Tempra' : 'Fortitude Save',
                breakdown: effectiveSaves.breakdowns.fortitude,
              })
            }
          />
          <DefenseCard
            label={translateSaveName('ref', locale, false)}
            value={effectiveSaves.ref}
            baseValue={char.savingThrows.ref}
            breakdown={effectiveSaves.breakdowns.reflex}
            sub={`BASE: +${char.savingThrows.refBase} | ${dexShort}: ${
              effectiveAbilities.mods.dex >= 0 ? `+${effectiveAbilities.mods.dex}` : effectiveAbilities.mods.dex
            }`}
            color="secondary"
            onRoll={() =>
              openRoll({
                diceType: 20,
                count: 1,
                modifier: effectiveSaves.ref,
                label: locale === 'it' ? 'Tiro Salvezza Riflessi' : 'Reflex Save',
                breakdown: effectiveSaves.breakdowns.reflex,
              })
            }
          />
          <DefenseCard
            label={locale === 'it' ? 'Volontà' : 'Willpower'}
            value={effectiveSaves.will}
            baseValue={char.savingThrows.will}
            breakdown={effectiveSaves.breakdowns.will}
            sub={`BASE: +${char.savingThrows.willBase} | ${wisShort}: ${
              effectiveAbilities.mods.wis >= 0 ? `+${effectiveAbilities.mods.wis}` : effectiveAbilities.mods.wis
            }`}
            color="secondary"
            onRoll={() =>
              openRoll({
                diceType: 20,
                count: 1,
                modifier: effectiveSaves.will,
                label: locale === 'it' ? 'Tiro Salvezza Volontà' : 'Will Save',
                breakdown: effectiveSaves.breakdowns.will,
              })
            }
          />
        </motion.section>

        {/* Ability Score Grid */}
        <motion.section
          variants={STAGGER_ITEM}
          className="lg:col-span-6 bg-surface-container/90 backdrop-blur-sm p-5 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:border-primary/30 transition-all grid grid-cols-3 gap-3"
        >
          {ABILITY_KEYS.map((key) => {
            const baseScore = char.abilities[key]
            const effScore = effectiveAbilities.scores[key]
            const mod = effectiveAbilities.mods[key]
            const delta = effectiveAbilities.deltas[key]
            const fullName = translateAbilityFull(key, locale)

            return (
              <button
                key={key}
                onClick={() =>
                  openRoll({
                    diceType: 20,
                    count: 1,
                    modifier: mod,
                    label: locale === 'it' ? `Prova di ${fullName}` : `${fullName} Check`,
                    breakdown: effectiveAbilities.breakdowns[key],
                  })
                }
                className="bg-surface-container hover:bg-surface-container-high rounded-xl p-3.5 sm:p-4 transition-all cursor-pointer group relative border border-white/10 hover:border-primary/40 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] text-left"
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="font-label text-[11px] text-tertiary uppercase tracking-wider font-bold">
                    {translateAbilityShort(key, locale)}
                  </p>
                  {delta !== 0 && (
                    <span
                      className={`font-label text-[11px] font-bold ${
                        delta > 0 ? 'text-primary' : 'text-error'
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  )}
                </div>
                <p
                  className={`font-label text-3xl sm:text-4xl font-black ${
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
        </motion.section>

        {/* Daily Resources */}
        {char.dailyResources.length > 0 && (
          <motion.section
            variants={STAGGER_ITEM}
            className="lg:col-span-12 bg-surface-container/90 backdrop-blur-sm p-6 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:border-primary/30 transition-all"
          >
            <h2 className="font-headline text-lg sm:text-xl font-bold uppercase tracking-wider text-secondary mb-4 neon-glow-accent">
              {t('status.dailyResources')}
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
          </motion.section>
        )}

        {/* Conditions */}
        <motion.section
          variants={STAGGER_ITEM}
          className="lg:col-span-12 bg-surface-container/90 backdrop-blur-sm p-6 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:border-primary/30 transition-all"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-headline text-lg sm:text-xl font-bold uppercase tracking-wider text-secondary neon-glow-accent">
              {t('status.conditions')}
            </h2>
            <button
              onClick={() => setShowBuffModal(true)}
              className="font-label text-xs uppercase tracking-wider text-primary hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              {locale === 'it' ? 'Gestore Completo' : 'Open Full Manager'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {ALL_CONDITIONS.map((condition) => {
              const active = session.conditions.includes(condition)
              const info = getConditionInfo(condition, locale)
              return (
                <div key={condition} className="relative group flex items-center gap-1">
                  <button
                    onClick={() => toggleCondition(char.id, condition)}
                    className={`px-3.5 py-1.5 font-label text-xs uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                      active
                        ? 'bg-error-container text-white shadow-[0_0_12px_rgba(255,107,125,0.4)] font-bold border border-error'
                        : 'bg-surface-container-high text-tertiary hover:text-error hover:bg-error-container/20 border border-white/10'
                    }`}
                  >
                    {info.name}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openInspector(
                        conditionInspectorItem(condition, () => toggleCondition(char.id, condition))
                      )
                    }
                    aria-label={`${t('hud.inspectCondition')} ${info.name}`}
                    className="min-h-[36px] min-w-[36px] rounded-lg border border-white/10 text-tertiary hover:text-primary hover:border-primary/40 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-sm">info</span>
                  </button>
                  {/* Desktop-only hover tooltip (on mobile, tap (i) opens bottom-sheet InspectorDrawer without sticky-hover covering UI) */}
                  <div className="hidden md:block pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <div className="bg-black/95 backdrop-blur-md border border-error/40 p-3.5 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
                      <p className="font-headline text-error text-xs uppercase tracking-widest mb-1 font-bold">
                        {info.name}
                      </p>
                      <p className="font-body text-on-surface-variant text-xs mb-2 leading-snug">
                        {info.summary}
                      </p>
                      <ul className="space-y-0.5">
                        {info.penalties.map((p, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-error font-label text-[11px] mt-px flex-shrink-0">
                              ▸
                            </span>
                            <span className="font-label text-[11px] text-on-surface-variant leading-snug">
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
            <p className="font-label text-xs text-tertiary uppercase tracking-widest mt-3">
              {t('status.noConditions')}
            </p>
          )}
        </motion.section>
      </motion.div>

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
      <p className={`font-label text-[11px] uppercase tracking-wider ${textColor} font-bold`}>{label}</p>
      <p className={`font-label text-3xl sm:text-4xl font-black ${valColor}`}>
        {displayVal}
      </p>
      <p className="font-label text-[11px] text-on-surface-variant mt-1 font-mono leading-snug">{sub}</p>
    </>
  )

  const card = onRoll ? (
    <button
      onClick={onRoll}
      className="bg-surface-container hover:bg-surface-container-high rounded-xl border border-white/10 hover:border-primary/40 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] p-4 sm:p-5 transition-all cursor-pointer group relative w-full text-left"
    >
      {cardContent}
    </button>
  ) : (
    <div className="bg-surface-container rounded-xl border border-white/10 p-4 sm:p-5 relative w-full">
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
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center h-64 text-tertiary font-label text-sm uppercase tracking-widest">
      {t('common.noCharacterSelected')}
    </div>
  )
}
