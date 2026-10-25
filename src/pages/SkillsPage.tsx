import { useState, useMemo } from 'react'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import { calcEffectiveAbilities, calcEffectiveSkills, getActiveActionRestrictions } from '../lib/stat-calc'
import { ActionAlertBanner } from '../components/combat/ActionAlertBanner'
import type { EffectiveSkill } from '../lib/stat-calc'

const ABILITY_SHORT = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }

export function SkillsPage() {
  const char = useCharacterStore((s) => s.activeCharacter())
  const session = useSessionStore((s) => (char ? s.getSession(char.id) : null))
  const openRoll = useDiceStore((s) => s.openRoll)
  const [search, setSearch] = useState('')
  const [trainedOnly, setTrainedOnly] = useState(false)

  const effectiveSkills = useMemo(() => {
    if (!char || !session) return []
    const allBuffs = [...char.buffs, ...(session.customBuffs ?? [])]
    const activeBuffs = allBuffs.filter((b) => session.activeBuffIds.includes(b.id))
    const effectiveAbilities = calcEffectiveAbilities(char.abilities, session.conditions, activeBuffs)

    const equippedItems = (char.inventory ?? []).filter((i) =>
      session.equippedItemIds ? session.equippedItemIds.includes(i.id) : i.equipped
    )
    const equippedAcp = equippedItems.reduce((sum, item) => sum + (item.armorCheckPenalty ?? 0), 0)
    const acp = equippedAcp || (char.armorClass?.armorCheckPenalty ?? 0)

    const calculated = calcEffectiveSkills(
      char.skills,
      char.abilities,
      effectiveAbilities,
      session.conditions,
      acp
    )

    return calculated
      .filter((s) => {
        if (trainedOnly && !s.trained) return false
        if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [char, session, search, trainedOnly])

  const { leftSkills, rightSkills } = useMemo(() => {
    const half = Math.ceil(effectiveSkills.length / 2)
    return {
      leftSkills: effectiveSkills.slice(0, half),
      rightSkills: effectiveSkills.slice(half),
    }
  }, [effectiveSkills])

  if (!char) {
    return (
      <div className="flex items-center justify-center h-64 text-tertiary font-label text-sm uppercase tracking-widest">
        No character selected
      </div>
    )
  }

  const restrictions = session ? getActiveActionRestrictions(session.conditions) : []

  return (
    <div className="p-2.5 sm:p-4 md:p-8 lg:p-12">
      {restrictions.length > 0 && <ActionAlertBanner restrictions={restrictions} />}

      {/* Header */}
      <header className="mb-3 sm:mb-6 md:mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-6">
          <div>
            <h1 className="font-headline text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-0.5 sm:mb-1 tracking-tight">
              Grimoire Skills
            </h1>
            <p className="text-tertiary font-label uppercase text-[10px] sm:text-xs md:text-sm tracking-[0.2em] hidden sm:block">
              Mechanical Proficiencies & Dynamic Calculations
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary/50 text-sm">
                search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search skills..."
                className="bg-surface-container-high/80 rounded-xl pl-9 pr-3 py-1.5 sm:py-2 md:py-2.5 font-label text-xs sm:text-sm text-on-surface placeholder:text-tertiary/50 outline-none w-full sm:w-60 border border-white/10 focus:border-primary transition-colors"
              />
            </div>
            {/* Filter */}
            <button
              onClick={() => setTrainedOnly((v) => !v)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 md:py-2.5 rounded-xl font-label text-[10px] sm:text-xs uppercase tracking-wider border transition-all cursor-pointer flex-shrink-0 ${
                trainedOnly
                  ? 'border-primary text-black bg-primary font-bold shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : 'border-white/10 text-tertiary hover:border-white/30 hover:text-white bg-surface-container'
              }`}
            >
              Trained Only
            </button>
          </div>
        </div>
      </header>

      {/* Skills Grid */}
      {effectiveSkills.length === 0 ? (
        <div className="py-12 text-center text-tertiary font-label text-sm uppercase tracking-widest">
          No skills found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4 items-start">
          <div className="flex flex-col gap-2 sm:gap-2.5 md:gap-4">
            {leftSkills.map((skill) => (
              <SkillRow
                key={skill.id}
                skill={skill}
                total={skill.effectiveTotal}
                onRoll={() =>
                  openRoll({
                    diceType: 20,
                    count: 1,
                    modifier: skill.effectiveTotal,
                    label: `${skill.name} Check`,
                    breakdown: skill.breakdown,
                  })
                }
              />
            ))}
          </div>
          {rightSkills.length > 0 && (
            <div className="flex flex-col gap-2 sm:gap-2.5 md:gap-4">
              {rightSkills.map((skill) => (
                <SkillRow
                  key={skill.id}
                  skill={skill}
                  total={skill.effectiveTotal}
                  onRoll={() =>
                    openRoll({
                      diceType: 20,
                      count: 1,
                      modifier: skill.effectiveTotal,
                      label: `${skill.name} Check`,
                      breakdown: skill.breakdown,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SkillRow({
  skill,
  total,
  onRoll,
}: {
  skill: EffectiveSkill
  total: number
  onRoll: () => void
}) {
  const breakdownSummary = (skill.breakdown ?? [])
    .filter((b) => b.value !== 0)
    .map(
      (b) =>
        `${b.label.replace(' Bonus', '').replace(' Penalty', '').replace(' Mod', '')}: ${
          b.value > 0 ? `+${b.value}` : b.value
        }`
    )
    .join(' · ')

  return (
    <button
      onClick={onRoll}
      aria-label={`Roll ${skill.name}`}
      className="w-full bg-surface-container/90 backdrop-blur-sm flex items-center justify-between p-2.5 sm:p-3 md:p-4 gap-2.5 sm:gap-4 rounded-xl border border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.25)] hover:border-primary/40 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:bg-surface-container-high transition-all active:scale-[0.99] text-left cursor-pointer group"
    >
      {/* Left: name + meta */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
        <div
          className={`w-1 sm:w-1.5 h-8 sm:h-9 rounded-full flex-shrink-0 ${
            skill.trained ? 'bg-secondary shadow-[0_0_8px_rgba(217,70,239,0.5)]' : 'bg-white/10'
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-headline text-xs sm:text-sm md:text-base font-bold text-white group-hover:text-primary truncate leading-tight transition-colors">
              {skill.name}
            </p>
            <span className="font-label text-[8px] sm:text-[9px] text-primary bg-primary/15 border border-primary/30 px-1 sm:px-1.5 py-0.2 rounded uppercase font-bold flex-shrink-0">
              {ABILITY_SHORT[skill.ability]}
            </span>
            {skill.classSkill && (
              <span className="font-label text-[8px] sm:text-[9px] text-secondary bg-secondary/15 border border-secondary/30 px-1 sm:px-1.5 py-0.2 rounded uppercase tracking-wider font-bold flex-shrink-0">
                Class
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-label text-[9px] sm:text-[10px] text-tertiary truncate" title={breakdownSummary || `Ranks: ${skill.ranks}`}>
              {breakdownSummary || `Ranks: ${skill.ranks}`}
            </span>
          </div>
        </div>
      </div>

      {/* Bonus */}
      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-r from-primary to-primary-container text-black font-black shadow-[0_0_12px_rgba(0,240,255,0.25)] group-hover:shadow-[0_0_20px_rgba(0,240,255,0.45)] transition-all">
        <span className="font-label text-base sm:text-lg md:text-xl font-black">
          {total >= 0 ? `+${total}` : total}
        </span>
      </div>
    </button>
  )
}
