import { useState } from 'react'
import type { Spell, SpellSlot } from '../../types/resources'
import type { AbilityScore } from '../../types/character'
import type { DiceRoll } from '../../types/dice'
import { abilityMod, parseDiceFormula } from '../../lib/dice-engine'

export interface CombatSpellsSectionProps {
  spells: Spell[]
  spellSlots: SpellSlot[]
  preparedSpellIds: string[]
  spentSpellSlots: Record<number, number>
  charClass: string
  charLevel: number
  abilities: AbilityScore
  baseAttackBonus: number[]
  spellFailureChance?: number
  feats?: { id?: string; name: string }[]
  casterLevel?: number
  openRoll: (roll: DiceRoll) => void
  onSpendSlot: (level: number, max: number) => void
  onRecoverSlot: (level: number) => void
}

function getSpellcastingAbility(charClass: string): 'int' | 'wis' | 'cha' {
  const cls = charClass.toLowerCase()
  if (/wizard|magus|witch|alchemist|investigator|arcanist/.test(cls)) {
    return 'int'
  }
  if (/sorcerer|bard|oracle|summoner|skald|bloodrager|paladin/.test(cls)) {
    return 'cha'
  }
  return 'wis'
}

export function CombatSpellsSection({
  spells,
  spellSlots,
  preparedSpellIds,
  spentSpellSlots,
  charClass,
  charLevel,
  abilities,
  baseAttackBonus,
  spellFailureChance = 0,
  feats = [],
  casterLevel,
  openRoll,
  onSpendSlot,
  onRecoverSlot,
}: CombatSpellsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeLevelFilter, setActiveLevelFilter] = useState<number | 'all'>('all')
  const [sortBy, setSortBy] = useState<'level' | 'offensive' | 'name'>('level')
  const [searchQuery, setSearchQuery] = useState('')
  const [pinnedSpellIds, setPinnedSpellIds] = useState<string[]>([])

  const togglePin = (spellId: string) => {
    setPinnedSpellIds((prev) =>
      prev.includes(spellId) ? prev.filter((id) => id !== spellId) : [...prev, spellId]
    )
  }

  const cl = casterLevel ?? charLevel
  const castAbil = getSpellcastingAbility(charClass)
  const castingMod = abilityMod(abilities[castAbil])
  const concentrationMod = cl + castingMod
  const hasCombatCasting = feats.some((f) => /combat casting/i.test(f.name))
  const bab = baseAttackBonus[0] ?? 0
  const dexMod = abilityMod(abilities.dex)
  const strMod = abilityMod(abilities.str)

  // Spells that are prepared, or cantrips (level 0)
  const combatSpells = spells.filter(
    (s) => s.level === 0 || preparedSpellIds.includes(s.id)
  )

  const filteredSpells = combatSpells.filter((s) => {
    if (activeLevelFilter !== 'all' && s.level !== activeLevelFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchName = s.name.toLowerCase().includes(q)
      const matchSchool = s.school.toLowerCase().includes(q)
      const matchDesc = s.description?.toLowerCase().includes(q)
      const matchDamage = s.damageDice?.toLowerCase().includes(q)
      if (!matchName && !matchSchool && !matchDesc && !matchDamage) return false
    }
    return true
  })

  const displayedSpells = [...filteredSpells].sort((a, b) => {
    const aPinned = pinnedSpellIds.includes(a.id)
    const bPinned = pinnedSpellIds.includes(b.id)
    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1

    if (sortBy === 'offensive') {
      const aOffensive = !!(a.attackType || a.damageDice)
      const bOffensive = !!(b.attackType || b.damageDice)
      if (aOffensive && !bOffensive) return -1
      if (!aOffensive && bOffensive) return 1
      if (a.level !== b.level) return a.level - b.level
      return a.name.localeCompare(b.name)
    }

    if (sortBy === 'name') {
      return a.name.localeCompare(b.name)
    }

    // Default 'level'
    if (a.level !== b.level) return a.level - b.level
    return a.name.localeCompare(b.name)
  })

  const availableLevels = [...new Set(combatSpells.map((s) => s.level))].sort((a, b) => a - b)

  function handleConcentrationCheck(defensive = false) {
    const bonus = defensive ? concentrationMod + 4 : concentrationMod
    const breakdown = [
      { label: 'Caster Level', value: cl },
      { label: `${castAbil.toUpperCase()} Mod`, value: castingMod },
    ]
    if (defensive) {
      breakdown.push({ label: 'Combat Casting', value: 4 })
    }

    openRoll({
      diceType: 20,
      count: 1,
      modifier: bonus,
      label: defensive ? 'Concentration (Defensive)' : 'Concentration Check',
      breakdown,
    })
  }

  function handleAttackRoll(spell: Spell) {
    if (!spell.attackType) return
    const bonus = spell.attackType === 'meleeTouch' ? bab + strMod : bab + dexMod
    const typeLabel =
      spell.attackType === 'meleeTouch'
        ? 'Melee Touch'
        : spell.attackType === 'rangedTouch'
        ? 'Ranged Touch'
        : 'Ray Attack'

    openRoll({
      diceType: 20,
      count: 1,
      modifier: bonus,
      label: `${spell.name} (${typeLabel})`,
      breakdown: [
        { label: 'BAB', value: bab },
        {
          label: spell.attackType === 'meleeTouch' ? 'STR Mod' : 'DEX Mod',
          value: spell.attackType === 'meleeTouch' ? strMod : dexMod,
        },
      ],
    })
  }

  function handleDamageRoll(spell: Spell) {
    if (!spell.damageDice) return
    const parsed = parseDiceFormula(spell.damageDice)
    openRoll({
      diceType: parsed.sides,
      count: parsed.count,
      modifier: (spell.damageBonus ?? 0) + parsed.bonus,
      label: `${spell.name} Damage`,
    })
  }

  function handleCast(spell: Spell) {
    const slotInfo = spellSlots.find((s) => s.level === spell.level)
    const maxSlots = slotInfo?.total ?? 0
    const spent = spentSpellSlots[spell.level] ?? 0

    // Deduct spell slot if level > 0 and slots exist
    if (spell.level > 0 && maxSlots > 0 && spent < maxSlots) {
      onSpendSlot(spell.level, maxSlots)
    }

    // Trigger attack roll if touch/ray, else direct damage roll if specified
    if (spell.attackType) {
      handleAttackRoll(spell)
    } else if (spell.damageDice) {
      handleDamageRoll(spell)
    }
  }

  if (combatSpells.length === 0) {
    return null
  }

  return (
    <div className="bg-surface-container/90 backdrop-blur-sm rounded-2xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.35)] overflow-hidden space-y-0">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-surface-container-high transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-lg">auto_fix_high</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-headline text-sm uppercase tracking-widest text-white font-bold">
                Combat Spells & Invocations
              </h3>
              <span className="font-label text-xs text-secondary font-bold">
                ({combatSpells.length} Prepared/Cantrips)
              </span>
              {spellFailureChance > 0 && (
                <span
                  className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 font-label text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-[0_0_8px_rgba(245,158,11,0.2)] cursor-help"
                  title={`Arcane Spell Failure: ${spellFailureChance}% chance of failure when casting spells with somatic components while wearing armor or shields.`}
                >
                  <span className="material-symbols-outlined text-xs text-amber-400 leading-none">warning</span>
                  ASF {spellFailureChance}%
                </span>
              )}
            </div>
            <p className="font-label text-[10px] text-tertiary tracking-wider mt-0.5">
              Instant spellcasting, touch attack rolls & automatic slot tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-label text-xs text-tertiary uppercase tracking-wider hidden sm:inline">
            {isExpanded ? 'Hide' : 'Expand'}
          </span>
          <span
            className={`material-symbols-outlined text-tertiary transition-transform duration-200 ${
              isExpanded ? 'rotate-180 text-secondary' : ''
            }`}
          >
            expand_more
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 pt-0 border-t border-white/5 space-y-4">
          {/* ASF Alert Callout Banner if wearing armor/shield */}
          {spellFailureChance > 0 && (
            <div className="mt-3 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-label">
              <span className="material-symbols-outlined text-base text-amber-400 flex-shrink-0">warning</span>
              <div className="flex-1">
                <strong className="text-amber-300 font-bold uppercase tracking-wider">
                  Arcane Spell Failure: {spellFailureChance}%
                </strong>
                <span className="text-amber-200/80 ml-2">
                  Armor or shield interference applies to arcane spells with Somatic (S) components.
                </span>
              </div>
            </div>
          )}

          {/* Level Filter, Slot Trackers & Concentration Quick Check */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              onClick={() => setActiveLevelFilter('all')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-label uppercase tracking-wider transition-all cursor-pointer ${
                activeLevelFilter === 'all'
                  ? 'bg-secondary text-black font-bold border-secondary shadow-[0_0_12px_rgba(217,70,239,0.4)]'
                  : 'bg-surface-container border-white/10 text-tertiary hover:text-white'
              }`}
            >
              All Levels
            </button>

            {/* Level Pills with Remaining Slots and Quick +1 Recover */}
            {availableLevels.map((lvl) => {
              const slot = spellSlots.find((s) => s.level === lvl)
              const max = slot?.total ?? 0
              const spent = spentSpellSlots[lvl] ?? 0
              const remaining = Math.max(0, max - spent)
              const isSelected = activeLevelFilter === lvl

              return (
                <div key={lvl} className="flex items-center">
                  <button
                    onClick={() => setActiveLevelFilter(lvl)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-label uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-secondary/20 border-secondary text-secondary shadow-[0_0_12px_rgba(217,70,239,0.3)]'
                        : 'bg-surface-container border-white/10 text-tertiary hover:text-white'
                    }`}
                  >
                    <span>{lvl === 0 ? 'Cantrips' : `Lvl ${lvl}`}</span>
                    {lvl > 0 && max > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${
                          remaining === 0
                            ? 'bg-error/20 text-error'
                            : 'bg-primary/20 text-primary'
                        }`}
                      >
                        {remaining}/{max}
                      </span>
                    )}
                  </button>

                  {/* Level Bar +1 Restore Button */}
                  {lvl > 0 && spent > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRecoverSlot(lvl)
                      }}
                      className="ml-1 px-2 py-1 rounded-lg bg-surface-container border border-white/10 hover:border-primary/50 text-primary text-[10px] font-label font-bold uppercase transition-all hover:shadow-[0_0_8px_rgba(0,240,255,0.3)] flex items-center gap-0.5 cursor-pointer active:scale-95"
                      title={`Ripristina 1 slot di livello ${lvl} (Restore 1 level ${lvl} slot)`}
                      aria-label={`Ripristina slot livello ${lvl} dalla barra`}
                    >
                      <span className="material-symbols-outlined text-[12px] leading-none">undo</span>
                      <span>+1</span>
                    </button>
                  )}
                </div>
              )
            })}

            {/* Concentration Quick Check Buttons */}
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <button
                onClick={() => handleConcentrationCheck(false)}
                className="px-3 py-1.5 rounded-xl border border-secondary/30 bg-secondary/10 hover:bg-secondary/20 text-secondary text-xs font-label uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(217,70,239,0.15)] hover:shadow-[0_0_14px_rgba(217,70,239,0.3)] active:scale-95"
                title={`Roll Concentration Check (CL ${cl} + ${castAbil.toUpperCase()} ${castingMod >= 0 ? `+${castingMod}` : castingMod})`}
              >
                <span className="material-symbols-outlined text-sm">electric_bolt</span>
                <span>Concentration ({concentrationMod >= 0 ? `+${concentrationMod}` : concentrationMod})</span>
              </button>

              {hasCombatCasting && (
                <button
                  onClick={() => handleConcentrationCheck(true)}
                  className="px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-label uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.15)] hover:shadow-[0_0_14px_rgba(0,240,255,0.3)] active:scale-95"
                  title="Roll Defensive Concentration (+4 Combat Casting)"
                >
                  <span className="material-symbols-outlined text-sm">shield</span>
                  <span>Defensive ({(concentrationMod + 4) >= 0 ? `+${concentrationMod + 4}` : concentrationMod + 4})</span>
                </button>
              )}
            </div>
          </div>

          {/* Search & Sort Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-base select-none pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search combat spells (name, school, damage)..."
                className="w-full bg-surface-container border border-white/10 hover:border-secondary/40 focus:border-secondary rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder:text-tertiary font-label outline-none transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-white cursor-pointer p-0.5"
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              )}
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-1 bg-surface-container border border-white/10 p-1 rounded-xl text-xs font-label flex-wrap sm:flex-nowrap">
              <span className="px-2 text-[10px] text-tertiary uppercase tracking-wider font-semibold select-none">
                Sort:
              </span>
              <button
                type="button"
                onClick={() => setSortBy('level')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-semibold ${
                  sortBy === 'level'
                    ? 'bg-secondary text-black font-bold shadow-[0_0_8px_rgba(217,70,239,0.4)]'
                    : 'text-tertiary hover:text-white hover:bg-white/5'
                }`}
              >
                Level
              </button>
              <button
                type="button"
                onClick={() => setSortBy('offensive')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-semibold ${
                  sortBy === 'offensive'
                    ? 'bg-secondary text-black font-bold shadow-[0_0_8px_rgba(217,70,239,0.4)]'
                    : 'text-tertiary hover:text-white hover:bg-white/5'
                }`}
                title="Attacks & Damage spells first"
              >
                Attack / Dmg
              </button>
              <button
                type="button"
                onClick={() => setSortBy('name')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-semibold ${
                  sortBy === 'name'
                    ? 'bg-secondary text-black font-bold shadow-[0_0_8px_rgba(217,70,239,0.4)]'
                    : 'text-tertiary hover:text-white hover:bg-white/5'
                }`}
              >
                A-Z
              </button>
            </div>
          </div>

          {/* Spell Cards Grid */}
          {displayedSpells.length === 0 ? (
            <div className="p-8 text-center text-tertiary font-label text-xs uppercase tracking-wider bg-surface-container-lowest/50 rounded-xl border border-white/5">
              No combat spells matching your search criteria
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {displayedSpells.map((spell) => {
                const slot = spellSlots.find((s) => s.level === spell.level)
                const max = slot?.total ?? 0
                const spent = spentSpellSlots[spell.level] ?? 0
                const hasSlots = spell.level === 0 || max === 0 || spent < max
                const remaining = Math.max(0, max - spent)
                const dc = 10 + spell.level + castingMod
                const hasSomatic = spell.components?.includes('S')
                const showsAsf = spellFailureChance > 0 && hasSomatic
                const isPinned = pinnedSpellIds.includes(spell.id)

                return (
                  <div
                    key={spell.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      isPinned
                        ? 'bg-surface-container-high/90 border-amber-400/40 shadow-[0_0_15px_rgba(251,191,36,0.12)]'
                        : hasSlots
                        ? 'bg-surface-container-high/80 border-white/10 hover:border-secondary/40 shadow-[0_4px_16px_rgba(0,0,0,0.2)]'
                        : 'bg-surface-container-lowest/60 border-white/5 opacity-55'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-secondary/15 text-secondary border border-secondary/30 text-[9px] font-label uppercase tracking-widest font-bold">
                              {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}
                            </span>
                            <span className="text-tertiary text-[10px] font-label uppercase tracking-wider">
                              {spell.school}
                            </span>
                            {showsAsf && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[9px] font-bold uppercase tracking-wider cursor-help flex items-center gap-0.5"
                                title={`Arcane Spell Failure: ${spellFailureChance}% chance of failure due to Somatic component (S)`}
                              >
                                <span className="material-symbols-outlined text-[10px] text-amber-400">warning</span>
                                ASF {spellFailureChance}%
                              </span>
                            )}
                          </div>
                          <h4 className="font-headline text-base font-bold text-white mt-1">
                            {spell.name}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {spell.savingThrow && (
                            <div className="text-right">
                              <span className="font-label text-[9px] text-tertiary uppercase tracking-widest block">
                                DC
                              </span>
                              <span className="font-mono text-sm font-black text-secondary">
                                {dc}
                              </span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              togglePin(spell.id)
                            }}
                            className={`p-1 rounded-lg transition-all cursor-pointer ${
                              isPinned
                                ? 'text-amber-400 hover:text-amber-300'
                                : 'text-tertiary/40 hover:text-tertiary hover:bg-white/5'
                            }`}
                            title={isPinned ? 'Rimuovi dai preferiti' : 'Fissa tra i preferiti in alto'}
                            aria-label={isPinned ? `Unpin ${spell.name}` : `Pin ${spell.name}`}
                          >
                            <span className="material-symbols-outlined text-lg leading-none">
                              {isPinned ? 'star' : 'star_border'}
                            </span>
                          </button>
                        </div>
                      </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] font-label text-tertiary">
                      <span>Time: <strong className="text-white">{spell.castingTime}</strong></span>
                      <span>Range: <strong className="text-white">{spell.range}</strong></span>
                      {spell.attackType && (
                        <span className="text-primary font-bold">
                          {spell.attackType === 'meleeTouch'
                            ? 'Melee Touch'
                            : spell.attackType === 'rangedTouch'
                            ? 'Ranged Touch'
                            : 'Ray'}
                        </span>
                      )}
                      {spell.components && (
                        <span className="text-tertiary">
                          Comp: <strong className="text-white/80">{spell.components}</strong>
                        </span>
                      )}
                    </div>

                    {spell.description && (
                      <p className="font-label text-[11px] text-tertiary line-clamp-2 mt-2 leading-relaxed">
                        {spell.description}
                      </p>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 flex-wrap">
                    {/* Slot quick indicator & manual refund */}
                    {spell.level > 0 && max > 0 ? (
                      <div className="flex items-center gap-2 text-xs font-label">
                        <div className="flex items-center gap-1">
                          <span className="text-tertiary text-[10px] uppercase tracking-wider">Slots:</span>
                          <span className={`font-mono text-xs font-bold ${hasSlots ? 'text-primary' : 'text-error'}`}>
                            {remaining}/{max}
                          </span>
                        </div>
                        {spent > 0 && (
                          <button
                            onClick={() => onRecoverSlot(spell.level)}
                            className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/30 hover:bg-primary/20 hover:border-primary text-primary text-[10px] font-label font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer hover:shadow-[0_0_8px_rgba(0,240,255,0.25)] active:scale-95"
                            title={`Ripristina 1 slot di livello ${spell.level} (Restore 1 level ${spell.level} slot)`}
                            aria-label={`Ripristina slot per ${spell.name}`}
                          >
                            <span className="material-symbols-outlined text-[11px] leading-none">undo</span>
                            <span>+1 Slot</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-label text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="text-xs font-black">∞</span>
                          <span>At-will</span>
                        </span>
                      </div>
                    )}

                    {/* Action Buttons: Touch Attack / Damage / Cast */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {/* Explicit Touch Attack Button if attackType */}
                      {spell.attackType && (
                        <button
                          onClick={() => handleAttackRoll(spell)}
                          className="px-2.5 py-1 rounded-lg bg-surface-container border border-primary/30 hover:border-primary text-primary font-label text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center gap-1 hover:shadow-[0_0_8px_rgba(0,240,255,0.25)]"
                          title={`Roll ${spell.attackType === 'meleeTouch' ? 'Melee Touch' : spell.attackType === 'rangedTouch' ? 'Ranged Touch' : 'Ray'} Attack`}
                        >
                          <span className="material-symbols-outlined text-xs">adjust</span>
                          <span>
                            {spell.attackType === 'meleeTouch' ? 'Touch' : spell.attackType === 'rangedTouch' ? 'R.Touch' : 'Ray'}{' '}
                            ({(spell.attackType === 'meleeTouch' ? bab + strMod : bab + dexMod) >= 0 ? `+${spell.attackType === 'meleeTouch' ? bab + strMod : bab + dexMod}` : (spell.attackType === 'meleeTouch' ? bab + strMod : bab + dexMod)})
                          </span>
                        </button>
                      )}

                      {/* Explicit Damage Roll Button if damageDice */}
                      {spell.damageDice && (
                        <button
                          onClick={() => handleDamageRoll(spell)}
                          className="px-2.5 py-1 rounded-lg bg-surface-container border border-secondary/30 hover:border-secondary text-secondary font-label text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center gap-1 hover:shadow-[0_0_8px_rgba(217,70,239,0.25)]"
                          title={`Roll Damage (${spell.damageDice})`}
                        >
                          <span className="material-symbols-outlined text-xs">swords</span>
                          <span>{spell.damageDice}{spell.damageBonus ? `+${spell.damageBonus}` : ''}</span>
                        </button>
                      )}

                      {/* Cast Button */}
                      <button
                        onClick={() => handleCast(spell)}
                        disabled={!hasSlots}
                        className={`px-3.5 py-1 rounded-lg font-label text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 ${
                          hasSlots
                            ? 'bg-secondary text-black hover:bg-secondary/90 hover:shadow-[0_0_12px_rgba(217,70,239,0.4)] cursor-pointer'
                            : 'bg-surface-container-highest text-tertiary border border-white/5 cursor-not-allowed opacity-60'
                        }`}
                        aria-label={`Cast ${spell.name}`}
                      >
                        <span className="material-symbols-outlined text-xs">bolt</span>
                        <span>{spell.level === 0 ? 'Cast' : hasSlots ? 'Cast' : 'No Slots'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )}
  </div>
)
}
