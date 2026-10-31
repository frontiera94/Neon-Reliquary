import { useState } from 'react'
import type { FullCharacter } from '../../store/useCharacterStore'
import type { AbilityScore } from '../../types/character'
import { useSessionStore } from '../../store/useSessionStore'
import { useCharacterStore } from '../../store/useCharacterStore'
import { useDiceStore } from '../../store/useDiceStore'
import { WILD_SHAPE_PRESETS, type WildShapeFormId } from '../../data/wild-shape-presets'
import {
  SPELLSTRIKE_SPELLS,
  buildHeldSpellstrike,
  scaleStrDamage,
  calcHexDuration,
} from '../../lib/class-combat'
import {
  calcHexDc,
  calcStunningFistDc,
  checkBloodrageExitSafety,
  FORTUNE_HEX_BUFF_ID,
} from '../../lib/class-mechanics'
import { parseDiceFormula } from '../../lib/dice-engine'
import type {
  HexType,
  EvilEyeTargetStat,
  DebilitatingInjuryType,
  WildShapePreset,
} from '../../types/class-mechanics'
import type { BuffToggle } from '../../types/combat'

interface ClassMechanicsPanelProps {
  char: FullCharacter
  effectiveAbilities: {
    scores: AbilityScore | Record<string, number>
    mods: AbilityScore | Record<string, number>
  }
}

export function ClassMechanicsPanel({ char, effectiveAbilities }: ClassMechanicsPanelProps) {
  const session = useSessionStore((s) => s.getSession(char.id))
  const allCharacters = useCharacterStore((s) => s.characters)
  const openRoll = useDiceStore((s) => s.openRoll)

  const {
    advanceCharacterTurn,
    setWildShape,
    setHeldSpellstrike,
    consumeSpellstrikeCharge,
    setSpellCombat,
    activateArcaneWeapon,
    enterBloodrage,
    exitBloodrage,
    applyHex,
    removeHex,
    useCackle: triggerCackle,
    activateKiExtraAttack,
    activateKiDefense,
    activateKiSpeed,
    useWholenessOfBody: triggerWholeness,
    declareStunningFist,
    applyDebilitatingInjury,
    setUnderhanded,
    spendResource,
    recoverPreparedSpell,
  } = useSessionStore()

  // Local UI states
  const [selectedWildShapePreset, setSelectedWildShapePreset] = useState<WildShapeFormId>('wolf')
  const [hexTargetName, setHexTargetName] = useState('')
  const [selectedHexType, setSelectedHexType] = useState<HexType>('evil-eye')
  const [evilEyeStat, setEvilEyeStat] = useState<EvilEyeTargetStat>('ac')
  const [evilEyeSaved, setEvilEyeSaved] = useState(false)
  const [fortuneAllyId, setFortuneAllyId] = useState<string>('')
  const [debInjuryMode, setDebInjuryMode] = useState<DebilitatingInjuryType>('bewildered')
  const [debInjuryTarget, setDebInjuryTarget] = useState('')

  if (!session) return null

  const mechanics = session.classMechanics
  const currentRound = session.currentRound ?? 1

  // Class Archetype checks
  const isDruid = char.id === 'noorie' || /druid/i.test(char.class)
  const isMagus = char.id === 'shotrix-blackburn' || /magus/i.test(char.class)
  const isBloodrager = char.id === 'knam' || /bloodrager/i.test(char.class)
  const isWitch = char.id === 'mazikeen-noctis' || /witch/i.test(char.class)
  const isMonk = char.id === 'agelmund' || /monk/i.test(char.class)
  const isRogue = char.id === 'mariano-cardamomo' || /rogue/i.test(char.class)

  const hasNaturalSpell = Boolean(
    char.feats?.some((f) => /natural spell/i.test(f.name)) ||
    char.classAbilities?.some((a) => /natural spell/i.test(a.name))
  )

  // Druid State
  const druidState = mechanics?.druid ?? mechanics?.wildShape
  const isWildShapeActive = Boolean(druidState?.active ?? druidState?.wildShapeActive)
  const activeWildShapeFormId = druidState?.formId ?? druidState?.currentFormId
  const activeWildShapePreset: WildShapePreset | null = isWildShapeActive && activeWildShapeFormId
    ? WILD_SHAPE_PRESETS[activeWildShapeFormId as WildShapeFormId] ?? null
    : null

  // Magus State
  const magusState = mechanics?.magus
  const heldSpellstrike = magusState?.heldSpellstrike
  const isSpellCombatActive = Boolean(magusState?.spellCombatActive)
  const defensiveSacrifice = magusState?.defensiveCastingSacrifice ?? 0
  const arcanePoolActive = Boolean(
    magusState?.arcanePoolWeapon?.active ||
    (magusState?.arcaneWeaponActive && (magusState?.arcaneWeaponRoundsLeft ?? 0) > 0)
  )
  const arcanePoolRoundsLeft =
    magusState?.arcanePoolWeapon?.remainingRounds ?? magusState?.arcaneWeaponRoundsLeft ?? 0

  // Bloodrager State
  const bloodragerState = mechanics?.bloodrager
  const isBloodraging = Boolean(bloodragerState?.isRaging ?? bloodragerState?.isBloodraging)
  const roundsRaged = bloodragerState?.roundsRagedThisCombat ?? bloodragerState?.roundsCurrentRage ?? 0
  const fatigueCountdown = bloodragerState?.fatigueCountdown ?? bloodragerState?.fatigueRoundsLeft ?? 0
  const isFatigued = session.conditions.includes('fatigued') || fatigueCountdown > 0
  const furiousFocusReady = !bloodragerState?.furiousFocusAppliedThisRound
  const exitSafety = isBloodraging
    ? checkBloodrageExitSafety(session.currentHp, char.level ?? 4, 4, char.abilities.con ?? 16)
    : null

  // Witch State
  const witchState = mechanics?.witch
  const witchHexDc = calcHexDc(char.level ?? 4, effectiveAbilities.mods.int)
  const activeHexes = witchState?.activeHexes ?? []
  const cackleUsedThisRound = Boolean(witchState?.cackleUsedThisRound)

  // Monk State
  const monkState = mechanics?.monk
  const stunningFistDc = calcStunningFistDc(char.level ?? 4, effectiveAbilities.mods.wis)
  const kiExtraAttackActive = Boolean(monkState?.kiExtraAttackActive ?? monkState?.kiExtraAttack)
  const kiDefenseRounds = monkState?.kiDefenseRounds ?? monkState?.kiDefenseRoundsLeft ?? 0
  const kiSpeedRounds = monkState?.kiSpeedRounds ?? monkState?.kiSpeedRoundsLeft ?? 0
  const stunningFistDeclared = monkState?.stunningFistDeclared ?? monkState?.stunningFistCondition ?? null

  // Rogue State
  const rogueState = mechanics?.rogue
  const debilitatingInjury = rogueState?.debilitatingInjury
  const underhandedAvailable = rogueState?.underhandedAvailable ?? true

  // Summary badges for active effects
  const activeSummaryBadges: { label: string; color: 'primary' | 'secondary' | 'error' | 'amber' }[] = []
  if (isBloodraging) {
    activeSummaryBadges.push({ label: `Ira di Sangue (${roundsRaged} r)`, color: 'error' })
  }
  if (isFatigued) {
    activeSummaryBadges.push({ label: `Affaticato (${fatigueCountdown} r)`, color: 'amber' })
  }
  if (isWildShapeActive && activeWildShapePreset) {
    activeSummaryBadges.push({ label: `Wild Shape: ${activeWildShapePreset.name}`, color: 'primary' })
  }
  if (heldSpellstrike) {
    activeSummaryBadges.push({ label: `Spellstrike: ${heldSpellstrike.spellName} (${heldSpellstrike.chargesRemaining})`, color: 'secondary' })
  }
  if (arcanePoolActive) {
    activeSummaryBadges.push({ label: `Arma Arcana +1 (${arcanePoolRoundsLeft} r)`, color: 'primary' })
  }
  if (activeHexes.length > 0) {
    activeSummaryBadges.push({ label: `${activeHexes.length} Fatture Attive`, color: 'secondary' })
  }
  if (kiDefenseRounds > 0) {
    activeSummaryBadges.push({ label: 'Ki Defense +4 CA (1 r)', color: 'primary' })
  }
  if (kiSpeedRounds > 0) {
    activeSummaryBadges.push({ label: 'Ki Speed +6m (1 r)', color: 'primary' })
  }
  if (kiExtraAttackActive) {
    activeSummaryBadges.push({ label: 'Ki Extra Flurry (+9/+9/+9)', color: 'secondary' })
  }
  if (debilitatingInjury && (debilitatingInjury.remainingRounds ?? debilitatingInjury.roundsLeft ?? 0) > 0) {
    activeSummaryBadges.push({
      label: `Debilitating: ${debilitatingInjury.type ?? debilitatingInjury.mode}`,
      color: 'amber',
    })
  }

  return (
    <section
      aria-label="Class Mechanics Panel"
      className="rounded-2xl border border-white/10 bg-surface-container/80 p-3.5 sm:p-4 backdrop-blur-md shadow-[0_0_25px_rgba(0,0,0,0.4)] space-y-3"
    >
      {/* Top Banner: Character info, Active Status Chips, and "Fine Turno PG" */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 text-primary">
            <span className="material-symbols-outlined text-lg">
              {isDruid ? 'pets' : isMagus ? 'electric_bolt' : isBloodrager ? 'local_fire_department' : isWitch ? 'auto_fix_high' : isMonk ? 'sports_martial_arts' : 'visibility'}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-headline text-base font-bold text-white">
                {char.name}
              </h2>
              <span className="rounded-md border border-white/10 bg-surface-container-high px-1.5 py-0.5 font-label text-[10px] font-bold uppercase text-primary">
                {char.class} {char.level}
              </span>
            </div>
            <p className="font-label text-[11px] text-tertiary">
              Round <span className="font-bold text-white tabular-nums">{currentRound}</span> di combattimento
            </p>
          </div>
        </div>

        {/* Unified Turn Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => advanceCharacterTurn(char.id, char)}
            title="Avanza il round, scala le durate delle meccaniche attive e reimposta i poteri per-round"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary/20 via-primary/30 to-secondary/25 hover:from-primary/30 hover:to-secondary/35 border border-primary/50 text-white font-label text-xs font-bold uppercase tracking-wider px-3.5 py-2 shadow-[0_0_15px_rgba(0,240,255,0.25)] hover:shadow-[0_0_22px_rgba(0,240,255,0.4)] transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base text-primary">skip_next</span>
            <span>Fine Turno PG</span>
          </button>
        </div>
      </div>

      {/* Active Badges Summary Bar */}
      {activeSummaryBadges.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="font-label text-[10px] uppercase tracking-wider text-tertiary mr-1">
            Attivi:
          </span>
          {activeSummaryBadges.map((badge, idx) => {
            const colorCls =
              badge.color === 'error'
                ? 'border-error/40 bg-error/15 text-error shadow-[0_0_8px_rgba(255,75,96,0.25)]'
                : badge.color === 'secondary'
                ? 'border-secondary/40 bg-secondary/15 text-secondary shadow-[0_0_8px_rgba(217,70,239,0.25)]'
                : badge.color === 'amber'
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'border-primary/40 bg-primary/15 text-primary shadow-[0_0_8px_rgba(0,240,255,0.25)]'
            return (
              <span
                key={idx}
                className={`rounded-full border px-2 py-0.5 font-label text-[10px] font-bold tracking-wide ${colorCls}`}
              >
                {badge.label}
              </span>
            )
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. DRUID (Noorie) — Wild Shape Beast Shape I                               */}
      {/* ========================================================================= */}
      {isDruid && (
        <div className="space-y-3 rounded-xl border border-primary/20 bg-surface-container-high/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">nature</span>
              <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
                Wild Shape (Beast Shape I)
              </h3>
            </div>
            <span className="font-label text-[10px] uppercase text-tertiary">
              4 ore per uso · Lv 4
            </span>
          </div>

          {isWildShapeActive && activeWildShapePreset ? (
            <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/10 p-3 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-headline text-base font-bold text-white">
                    Forma: {activeWildShapePreset.name} ({activeWildShapePreset.size})
                  </span>
                  <p className="font-label text-[11px] text-tertiary">
                    Velocità: {activeWildShapePreset.speed} ft · Sensi: {activeWildShapePreset.senses.join(', ')} · CA Naturale: +{activeWildShapePreset.naturalArmorBonus}
                    {activeWildShapePreset.strBonus ? ` · +${activeWildShapePreset.strBonus} FOR` : ''}
                    {activeWildShapePreset.dexBonus ? ` · +${activeWildShapePreset.dexBonus} DES` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setWildShape(char.id, null)}
                  className="rounded-lg border border-white/20 bg-surface-container-high px-2.5 py-1 font-label text-xs font-bold text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Ritorna a Forma Umanoide
                </button>
              </div>

              {/* Natural attacks preview */}
              <div className="pt-1 border-t border-white/10 flex flex-wrap gap-1.5">
                <span className="font-label text-[10px] uppercase text-primary font-bold self-center">
                  Attacchi Naturali:
                </span>
                {activeWildShapePreset.naturalAttacks?.map((atk, i) => (
                  <span
                    key={i}
                    className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-label text-[11px] text-white"
                  >
                    {atk.name} ({atk.damageDice} + {scaleStrDamage(effectiveAbilities.mods.str, atk.strMultiplier)} FOR)
                    {atk.trip ? ' [Trip]' : ''}
                    {atk.grab ? ' [Grab]' : ''}
                  </span>
                ))}
              </div>

              {/* Warning banner without Natural Spell */}
              {!hasNaturalSpell && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/40 px-2.5 py-1.5 text-amber-300 font-label text-[11px]">
                  <span className="material-symbols-outlined text-amber-400 text-sm">warning</span>
                  <span>Wild Shape attiva: componenti Verbali e Somatiche bloccate (senza Natural Spell).</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Preset Wild Shape"
                value={selectedWildShapePreset}
                onChange={(e) => setSelectedWildShapePreset(e.target.value as WildShapeFormId)}
                className="rounded-lg border border-white/10 bg-surface-container-high px-2.5 py-1.5 font-label text-xs text-white focus:border-primary focus:outline-none"
              >
                {Object.values(WILD_SHAPE_PRESETS).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.size} · +{p.strBonus ?? 0} FOR, +{p.dexBonus ?? 0} DES, +{p.naturalArmorBonus} CA)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const preset = WILD_SHAPE_PRESETS[selectedWildShapePreset]
                  if (preset) {
                    setWildShape(char.id, preset)
                    spendResource(char.id, 'wild-shape', 1)
                  }
                }}
                className="rounded-lg border border-primary/40 bg-primary/20 px-3 py-1.5 font-label text-xs font-bold uppercase text-primary hover:bg-primary/30 transition-colors cursor-pointer"
              >
                Attiva Wild Shape
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAGUS (Shotrix) — Spellstrike, Spell Combat & Arcane Pool                */}
      {/* ========================================================================= */}
      {isMagus && (
        <div className="space-y-3 rounded-xl border border-secondary/20 bg-surface-container-high/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-base">electric_bolt</span>
              <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
                Magus Combat Engine
              </h3>
            </div>
            <span className="font-label text-[10px] uppercase text-tertiary">
              Shotrix Blackburn · Lv 4
            </span>
          </div>

          {/* Spellstrike subsection */}
          <div className="space-y-2 rounded-lg border border-white/10 bg-surface-container/60 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-headline text-xs font-bold text-white uppercase tracking-wider">
                Spellstrike (Trattieni Carica)
              </span>
              {heldSpellstrike && (
                <span className="rounded-full border border-secondary/40 bg-secondary/15 px-2 py-0.5 font-label text-[10px] font-bold text-secondary">
                  Cariche: {heldSpellstrike.chargesRemaining}/{heldSpellstrike.chargesMax}
                </span>
              )}
            </div>

            {heldSpellstrike ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-secondary/30 bg-secondary/10 p-2">
                <div>
                  <span className="font-label text-xs font-bold text-white">
                    {heldSpellstrike.spellName}
                  </span>
                  <span className="font-label text-[11px] text-tertiary ml-2">
                    Danni: {heldSpellstrike.damageDice} ({heldSpellstrike.damageType})
                  </span>
                  {heldSpellstrike.hasMetalBonusToggle && (
                    <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(heldSpellstrike.metalBonusActive)}
                        onChange={(e) =>
                          setHeldSpellstrike(char.id, {
                            ...heldSpellstrike,
                            metalBonusActive: e.target.checked,
                          })
                        }
                        className="rounded border-white/20 text-secondary focus:ring-0"
                      />
                      <span className="font-label text-[10px] text-secondary font-bold">
                        +3 TxC vs Bersaglio in Metallo
                      </span>
                    </label>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const { count, sides } = parseDiceFormula(heldSpellstrike.damageDice)
                      openRoll({
                        diceType: sides,
                        count,
                        modifier: 0,
                        label: `${heldSpellstrike.spellName} Spellstrike Damage`,
                      })
                      consumeSpellstrikeCharge(char.id)
                    }}
                    className="rounded-md border border-secondary/40 bg-secondary/20 px-2.5 py-1 font-label text-[11px] font-bold text-secondary hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    Tira Danni & Scarica
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeldSpellstrike(char.id, null)}
                    className="rounded-md border border-white/10 bg-surface-container px-2 py-1 font-label text-[11px] text-tertiary hover:text-white transition-colors cursor-pointer"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-label text-[10px] uppercase text-tertiary mr-1">
                  Carica rapida:
                </span>
                {Object.keys(SPELLSTRIKE_SPELLS).map((spellId) => {
                  const def = SPELLSTRIKE_SPELLS[spellId]
                  return (
                    <button
                      key={spellId}
                      type="button"
                      onClick={() => setHeldSpellstrike(char.id, buildHeldSpellstrike(spellId, char.level ?? 4))}
                      className="rounded-md border border-secondary/30 bg-secondary/10 px-2 py-1 font-label text-[10px] font-bold text-secondary hover:bg-secondary/20 transition-colors cursor-pointer"
                    >
                      {def.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Spell Combat subsection */}
          <div className="space-y-2 rounded-lg border border-white/10 bg-surface-container/60 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSpellCombatActive}
                  onChange={(e) => setSpellCombat(char.id, e.target.checked, defensiveSacrifice)}
                  className="rounded border-white/20 text-secondary focus:ring-0"
                />
                <span className="font-headline text-xs font-bold text-white uppercase tracking-wider">
                  Spell Combat (-2 TxC alle armi)
                </span>
              </label>
              {isSpellCombatActive && (
                <span className="font-label text-[10px] font-bold text-secondary">
                  Penalità TxC: -{2 + defensiveSacrifice} | Bonus Conc.: +{defensiveSacrifice}
                </span>
              )}
            </div>

            {isSpellCombatActive && (
              <div className="flex items-center gap-2 pt-1">
                <span className="font-label text-[10px] text-tertiary">Sacrificio Difensivo:</span>
                {[0, 1, 2, 3, 4].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => setSpellCombat(char.id, true, pts)}
                    className={`rounded px-2 py-0.5 font-label text-[10px] font-bold transition-all cursor-pointer ${
                      defensiveSacrifice === pts
                        ? 'border border-secondary bg-secondary text-black'
                        : 'border border-white/10 bg-surface-container-high text-tertiary hover:text-white'
                    }`}
                  >
                    -{pts} TxC / +{pts} Conc
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Arcane Pool & Spell Recall subsection */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-surface-container/60 p-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  activateArcaneWeapon(char.id, 1)
                  spendResource(char.id, 'arcane-pool', 6)
                }}
                disabled={arcanePoolActive}
                className={`rounded-lg border px-2.5 py-1 font-label text-[11px] font-bold uppercase transition-colors cursor-pointer ${
                  arcanePoolActive
                    ? 'border-primary/40 bg-primary/15 text-primary'
                    : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                }`}
              >
                {arcanePoolActive ? `Arma Arcana +1 (${arcanePoolRoundsLeft} r)` : 'Potenzia Arma (+1, 10 Round)'}
              </button>
            </div>

            {/* Spell Recall trigger */}
            {session.spentPreparedSpells && Object.keys(session.spentPreparedSpells).length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-label text-[10px] text-tertiary">Recall:</span>
                {Object.entries(session.spentPreparedSpells)
                  .filter(([, spent]) => spent > 0)
                  .map(([spId]) => {
                    const sp = char.spells.find((s) => s.id === spId)
                    if (!sp) return null
                    return (
                      <button
                        key={spId}
                        type="button"
                        onClick={() => {
                          recoverPreparedSpell(char.id, spId)
                          spendResource(char.id, 'arcane-pool', 6)
                        }}
                        title={`Riprepara ${sp.name} spendendo ${sp.level} punti Arcane Pool`}
                        className="rounded border border-secondary/30 bg-secondary/10 px-2 py-0.5 font-label text-[10px] font-bold text-secondary hover:bg-secondary/20 cursor-pointer"
                      >
                        {sp.name} ({sp.level} pt)
                      </button>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. BLOODRAGER (Knam) — Bloodrage, Fatigue & Reach                         */}
      {/* ========================================================================= */}
      {isBloodrager && (
        <div className="space-y-3 rounded-xl border border-error/20 bg-surface-container-high/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-base">local_fire_department</span>
              <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
                Bloodrage & Aberrant Lineage
              </h3>
            </div>
            <span className="font-label text-[10px] uppercase text-tertiary">
              Knam · Lv 4
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={!isBloodraging && isFatigued}
              onClick={() => {
                if (isBloodraging) {
                  exitBloodrage(char.id, char)
                } else {
                  enterBloodrage(char.id, char)
                }
              }}
              className={`rounded-xl border px-4 py-2 font-label text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isBloodraging
                  ? 'border-error/60 bg-error/20 text-white shadow-[0_0_20px_rgba(255,75,96,0.35)] hover:bg-error/30'
                  : isFatigued
                  ? 'border-white/10 bg-surface-container text-tertiary cursor-not-allowed opacity-50'
                  : 'border-error/40 bg-error/15 text-error hover:bg-error/25 shadow-[0_0_12px_rgba(255,75,96,0.2)]'
              }`}
            >
              {isBloodraging ? 'Termina Ira di Sangue' : '🔥 Entra in Ira di Sangue'}
            </button>

            {isBloodraging && (
              <span className="font-label text-xs text-white">
                Round spesi: <strong className="text-error tabular-nums">{roundsRaged}</strong>
              </span>
            )}
          </div>

          {/* Bloodrage Active Perks */}
          {isBloodraging && (
            <div className="space-y-2 rounded-xl border border-error/40 bg-error/10 p-3">
              <p className="font-label text-[11px] text-white">
                <strong>Bonus attivi:</strong> +4 FOR (+2 TxC, +2/3 Danni), +4 COS (+8 HP max/attuali, +2 Tempra), +2 Volontà, -2 CA, <strong>Portata 3m (Aberrante)</strong>.
              </p>
              <div className="flex items-center gap-2 pt-1 border-t border-error/20">
                <span className="material-symbols-outlined text-secondary text-sm">pets</span>
                <span className="font-label text-[11px] text-secondary font-bold">
                  Morso (Ring of Rat Fangs): SBLOCCATO come attacco secondario a -5 (0.5x FOR)!
                </span>
              </div>

              {/* Lethal Exit Risk Alert */}
              {exitSafety && exitSafety.severity !== 'none' && (
                <div
                  className={`rounded-lg border p-2 font-label text-[11px] font-bold animate-pulse ${
                    exitSafety.severity === 'danger'
                      ? 'border-error bg-error/20 text-error'
                      : 'border-amber-500/50 bg-amber-950/60 text-amber-300'
                  }`}
                >
                  ⚠️ {exitSafety.message}
                </div>
              )}
            </div>
          )}

          {/* Furious Focus indicator */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
            <span className="font-label text-[11px] text-tertiary">
              Furious Focus (1° attacco a 2M ignora -2 Attacco Possente):
            </span>
            <span
              className={`font-label text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                furiousFocusReady
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-white/10 bg-surface-container text-tertiary'
              }`}
            >
              {furiousFocusReady ? 'Pronto' : 'Usato questo round'}
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. WITCH (Mazikeen) — Hex Weave Tracker & Cackle                           */}
      {/* ========================================================================= */}
      {isWitch && (
        <div className="space-y-3 rounded-xl border border-secondary/20 bg-surface-container-high/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-base">auto_fix_high</span>
              <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
                Hex Weave & Cackle
              </h3>
            </div>
            <span className="font-label text-xs font-bold text-secondary">
              CD Fatture: {witchHexDc}
            </span>
          </div>

          {/* Active Hexes List */}
          <div className="space-y-1.5">
            <span className="font-label text-[10px] uppercase text-tertiary">Fatture Attive:</span>
            {activeHexes.length === 0 ? (
              <p className="font-label text-xs text-tertiary italic">Nessuna fattura attiva.</p>
            ) : (
              <div className="space-y-1">
                {activeHexes.map((hex) => (
                  <div
                    key={hex.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-secondary/30 bg-secondary/10 px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <span className="font-label text-xs font-bold text-white capitalize">
                        {hex.hexType.replace('-', ' ')}
                      </span>
                      <span className="font-label text-[11px] text-secondary ml-2">
                        su <strong>{hex.targetName}</strong>
                      </span>
                      {hex.evilEyeStat && (
                        <span className="font-label text-[10px] text-tertiary ml-1">
                          (-2 {hex.evilEyeStat.toUpperCase()})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-label text-[11px] font-bold text-secondary tabular-nums">
                        {hex.remainingRounds ?? hex.durationRounds} r
                      </span>
                      <button
                        type="button"
                        onClick={() => removeHex(char.id, hex.id)}
                        className="text-tertiary hover:text-error transition-colors p-0.5 cursor-pointer"
                        title="Rimuovi fattura"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cackle Button */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
            <button
              type="button"
              disabled={cackleUsedThisRound}
              onClick={() => triggerCackle(char.id)}
              className={`rounded-lg border px-3 py-1.5 font-label text-xs font-bold uppercase transition-all cursor-pointer ${
                cackleUsedThisRound
                  ? 'border-white/10 bg-surface-container text-tertiary opacity-50 cursor-not-allowed'
                  : 'border-secondary/40 bg-secondary/20 text-secondary hover:bg-secondary/30 shadow-[0_0_12px_rgba(217,70,239,0.2)]'
              }`}
            >
              {cackleUsedThisRound ? 'Cackle Già Usata Questo Round' : 'Cackle (+1 round a Evil Eye / Misfortune / Fortune)'}
            </button>
          </div>

          {/* Apply Hex Form */}
          <div className="space-y-2 rounded-lg border border-white/10 bg-surface-container/60 p-2.5 pt-2">
            <span className="font-headline text-[11px] font-bold text-white uppercase tracking-wider">
              Lancia Nuova Fattura
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(['evil-eye', 'misfortune', 'slumber', 'fortune'] as HexType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedHexType(type)}
                  className={`rounded px-2 py-0.5 font-label text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    selectedHexType === type
                      ? 'border border-secondary bg-secondary text-black'
                      : 'border border-white/10 bg-surface-container-high text-tertiary hover:text-white'
                  }`}
                >
                  {type.replace('-', ' ')}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {selectedHexType === 'fortune' ? (
                <select
                  value={fortuneAllyId}
                  onChange={(e) => {
                    setFortuneAllyId(e.target.value)
                    const found = allCharacters.find((c) => c.id === e.target.value)
                    if (found) setHexTargetName(found.name)
                  }}
                  className="rounded border border-white/10 bg-surface-container-high px-2 py-1 font-label text-xs text-white focus:outline-none"
                >
                  <option value="">Seleziona Compagno</option>
                  {allCharacters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.class})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Nome Bersaglio"
                  value={hexTargetName}
                  onChange={(e) => setHexTargetName(e.target.value)}
                  className="rounded border border-white/10 bg-surface-container-high px-2.5 py-1 font-label text-xs text-white focus:border-secondary focus:outline-none"
                />
              )}

              {selectedHexType === 'evil-eye' && (
                <>
                  <select
                    value={evilEyeStat}
                    onChange={(e) => setEvilEyeStat(e.target.value as EvilEyeTargetStat)}
                    className="rounded border border-white/10 bg-surface-container-high px-2 py-1 font-label text-xs text-white focus:outline-none"
                  >
                    <option value="ac">CA (-2)</option>
                    <option value="attacks">Attacchi (-2)</option>
                    <option value="saves">Tiri Salvezza (-2)</option>
                    <option value="ability">Prove Caratteristica (-2)</option>
                    <option value="skills">Abilità (-2)</option>
                  </select>
                  <label className="flex items-center gap-1 font-label text-[10px] text-tertiary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={evilEyeSaved}
                      onChange={(e) => setEvilEyeSaved(e.target.checked)}
                      className="rounded border-white/20 text-secondary focus:ring-0"
                    />
                    TS Superato (1 r)
                  </label>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  const target = hexTargetName.trim() || (selectedHexType === 'fortune' ? 'Ally' : 'Target')
                  const duration = calcHexDuration(
                    selectedHexType,
                    effectiveAbilities.mods.int,
                    char.level ?? 4,
                    evilEyeSaved ? 'passed' : 'failed'
                  )
                  applyHex(char.id, {
                    hexType: selectedHexType,
                    targetType: selectedHexType === 'fortune' ? 'ally' : 'enemy',
                    targetName: target,
                    remainingRounds: duration,
                    durationRounds: duration,
                    evilEyeStat: selectedHexType === 'evil-eye' ? evilEyeStat : undefined,
                    isExtendableByCackle: selectedHexType !== 'slumber',
                  })

                  // Cross-PG sync for Fortune
                  if (selectedHexType === 'fortune' && fortuneAllyId) {
                    const allySess = useSessionStore.getState().getSession(fortuneAllyId)
                    if (allySess) {
                      const buff: BuffToggle = {
                        id: FORTUNE_HEX_BUFF_ID,
                        name: 'Fortune Hex (Reroll)',
                        active: true,
                        attackMod: 0,
                        damageMod: 0,
                        acMod: 0,
                        duration: '1 round',
                        color: 'secondary',
                        isCustom: true,
                      }
                      useSessionStore.getState().addCustomBuff(fortuneAllyId, buff)
                    }
                  }

                  setHexTargetName('')
                }}
                className="rounded border border-secondary/40 bg-secondary/20 px-3 py-1 font-label text-xs font-bold uppercase text-secondary hover:bg-secondary/30 transition-colors cursor-pointer"
              >
                Applica Fattura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MONK (Agelmund) — Ki Pool & Stunning Fist                               */}
      {/* ========================================================================= */}
      {isMonk && (
        <div className="space-y-3 rounded-xl border border-primary/20 bg-surface-container-high/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">sports_martial_arts</span>
              <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
                Ki Pool & Martial Arts
              </h3>
            </div>
            <span className="font-label text-xs font-bold text-primary">
              CD Stunning Fist: {stunningFistDc}
            </span>
          </div>

          {/* Ki Actions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                activateKiExtraAttack(char.id)
                spendResource(char.id, 'ki-pool', 4)
              }}
              className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 p-2 hover:bg-primary/20 transition-colors cursor-pointer"
            >
              <div className="text-left">
                <span className="block font-headline text-xs font-bold text-white">Extra Flurry Attack</span>
                <span className="block font-label text-[10px] text-tertiary">3° attacco (+9/+9/+9)</span>
              </div>
              <span className="rounded bg-primary/20 px-1.5 py-0.5 font-label text-[10px] font-bold text-primary">
                1 Ki
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                activateKiDefense(char.id)
                spendResource(char.id, 'ki-pool', 4)
              }}
              className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 p-2 hover:bg-primary/20 transition-colors cursor-pointer"
            >
              <div className="text-left">
                <span className="block font-headline text-xs font-bold text-white">Ki Defense (+4 CA)</span>
                <span className="block font-label text-[10px] text-tertiary">+4 Schivare a Tot/Contatto/DMC</span>
              </div>
              <span className="rounded bg-primary/20 px-1.5 py-0.5 font-label text-[10px] font-bold text-primary">
                1 Ki
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                activateKiSpeed(char.id)
                spendResource(char.id, 'ki-pool', 4)
              }}
              className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 p-2 hover:bg-primary/20 transition-colors cursor-pointer"
            >
              <div className="text-left">
                <span className="block font-headline text-xs font-bold text-white">Ki Speed (+6m)</span>
                <span className="block font-label text-[10px] text-tertiary">+20 ft velocità per 1 round</span>
              </div>
              <span className="rounded bg-primary/20 px-1.5 py-0.5 font-label text-[10px] font-bold text-primary">
                1 Ki
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                const rolled = Math.floor(Math.random() * 8) + 1 + 4
                triggerWholeness(char.id, rolled)
                spendResource(char.id, 'ki-pool', 4)
              }}
              className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 p-2 hover:bg-primary/20 transition-colors cursor-pointer"
            >
              <div className="text-left">
                <span className="block font-headline text-xs font-bold text-white">Wholeness of Body</span>
                <span className="block font-label text-[10px] text-tertiary">Cura istantanea 1d8+4 HP</span>
              </div>
              <span className="rounded bg-primary/20 px-1.5 py-0.5 font-label text-[10px] font-bold text-primary">
                2 Ki
              </span>
            </button>
          </div>

          {/* Stunning Fist & Jabbing Style */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="font-label text-[11px] text-tertiary">Stunning Fist:</span>
              <button
                type="button"
                onClick={() => {
                  declareStunningFist(char.id, 'stunned')
                  spendResource(char.id, 'stunning-fist', 4)
                }}
                className={`rounded px-2 py-0.5 font-label text-[10px] font-bold cursor-pointer ${
                  stunningFistDeclared === 'stunned'
                    ? 'border border-primary bg-primary text-black'
                    : 'border border-white/10 bg-surface-container text-tertiary hover:text-white'
                }`}
              >
                Stunned (CD 14)
              </button>
              <button
                type="button"
                onClick={() => {
                  declareStunningFist(char.id, 'fatigued')
                  spendResource(char.id, 'stunning-fist', 4)
                }}
                className={`rounded px-2 py-0.5 font-label text-[10px] font-bold cursor-pointer ${
                  stunningFistDeclared === 'fatigued'
                    ? 'border border-primary bg-primary text-black'
                    : 'border border-white/10 bg-surface-container text-tertiary hover:text-white'
                }`}
              >
                Fatigued (CD 14)
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                openRoll({
                  diceType: 6,
                  count: 1,
                  modifier: 0,
                  label: 'Jabbing Style Bonus Damage',
                })
              }}
              className="rounded border border-secondary/30 bg-secondary/10 px-2 py-1 font-label text-[10px] font-bold text-secondary hover:bg-secondary/20 transition-colors cursor-pointer"
            >
              +1d6 Jabbing Style Dmg
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ROGUE (Mariano) — Debilitating Injury & Underhanded                     */}
      {/* ========================================================================= */}
      {isRogue && (
        <div className="space-y-3 rounded-xl border border-secondary/20 bg-surface-container-high/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-base">visibility</span>
              <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
                Unchained Rogue Tactics
              </h3>
            </div>
            <span className="font-label text-xs font-bold text-primary">
              +3 Favored Class Crit Confirm Daggers
            </span>
          </div>

          {/* Debilitating Injury Target Badges */}
          <div className="space-y-2 rounded-lg border border-white/10 bg-surface-container/60 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-headline text-xs font-bold text-white uppercase tracking-wider">
                Debilitating Injury (Promemoria Bersaglio)
              </span>
              {debilitatingInjury && (debilitatingInjury.remainingRounds ?? 0) > 0 && (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-label text-[10px] font-bold text-amber-300">
                  {debilitatingInjury.type ?? debilitatingInjury.mode} su {debilitatingInjury.targetName || 'Bersaglio'} (1 r)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['bewildered', 'disoriented', 'hampered'] as DebilitatingInjuryType[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDebInjuryMode(mode)}
                  className={`rounded px-2 py-0.5 font-label text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    debInjuryMode === mode
                      ? 'border border-amber-500 bg-amber-500 text-black'
                      : 'border border-white/10 bg-surface-container-high text-tertiary hover:text-white'
                  }`}
                >
                  {mode === 'bewildered' ? 'Bewildered (-2/-4 CA)' : mode === 'disoriented' ? 'Disoriented (-2/-4 TxC)' : 'Hampered (1/2 Vel)'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Nome Bersaglio"
                value={debInjuryTarget}
                onChange={(e) => setDebInjuryTarget(e.target.value)}
                className="rounded border border-white/10 bg-surface-container-high px-2.5 py-1 font-label text-xs text-white focus:border-secondary focus:outline-none flex-1 max-w-[200px]"
              />
              <button
                type="button"
                onClick={() => {
                  applyDebilitatingInjury(char.id, debInjuryMode, debInjuryTarget.trim() || 'Bersaglio')
                  setDebInjuryTarget('')
                }}
                className="rounded border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 font-label text-[11px] font-bold uppercase text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
              >
                Applica Promemoria
              </button>
            </div>
            <p className="font-label text-[10px] text-tertiary/70 italic">
              * Non altera i tuoi tiri personali per evitare doppi conteggi col Master.
            </p>
          </div>

          {/* Underhanded 1-click */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
            <span className="font-label text-[11px] text-tertiary">
              Underhanded (Danno furtivo massimizzato nel round di sorpresa):
            </span>
            <button
              type="button"
              disabled={!underhandedAvailable}
              onClick={() => {
                openRoll({
                  diceType: 6,
                  count: 0,
                  modifier: 18,
                  label: 'Underhanded Maximized Sneak Attack (18 flat)',
                })
                setUnderhanded(char.id, false)
              }}
              className="rounded border border-secondary/40 bg-secondary/20 px-3 py-1 font-label text-xs font-bold uppercase text-secondary hover:bg-secondary/30 transition-colors cursor-pointer disabled:opacity-40"
            >
              18 Flat Sneak Damage
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
