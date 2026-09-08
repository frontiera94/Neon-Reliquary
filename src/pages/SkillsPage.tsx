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

    const calculated = calcEffectiveSkills(
      char.skills,
      char.abilities,
      effectiveAbilities,
      session.conditions
    )

    return calculated.filter((s) => {
      if (trainedOnly && !s.trained) return false
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [char, session, search, trainedOnly])

  if (!char) {
    return (
      <div className="flex items-center justify-center h-64 text-tertiary font-label text-sm uppercase tracking-widest">
        No character selected
      </div>
    )
  }

  const restrictions = session ? getActiveActionRestrictions(session.conditions) : []

  return (
    <div className="p-4 md:p-8 lg:p-12">
      {restrictions.length > 0 && <ActionAlertBanner restrictions={restrictions} />}

      {/* Header */}
      <header className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-headline text-5xl font-bold text-on-surface mb-2 tracking-tight">
              Grimoire Skills
            </h1>
            <p className="text-tertiary font-label uppercase text-sm tracking-[0.2em]">
              Mechanical Proficiencies & Dynamic Calculations
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary/50 text-sm">
                search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search skills..."
                className="bg-surface-container-lowest pl-10 pr-4 py-3 font-label text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none w-64 border-b-2 border-transparent focus:border-primary transition-colors"
              />
            </div>
            {/* Filter */}
            <button
              onClick={() => setTrainedOnly((v) => !v)}
              className={`px-4 py-3 font-label text-xs uppercase tracking-widest border transition-all cursor-pointer ${
                trainedOnly
                  ? 'border-primary text-primary bg-primary/10 shadow-[0_0_15px_rgba(0,218,243,0.3)]'
                  : 'border-outline-variant/30 text-tertiary hover:border-outline'
              }`}
            >
              Trained Only
            </button>
          </div>
        </div>
      </header>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {effectiveSkills.map((skill) => (
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
        {effectiveSkills.length === 0 && (
          <div className="col-span-2 py-16 text-center text-tertiary font-label text-sm uppercase tracking-widest">
            No skills found
          </div>
        )}
      </div>
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
  return (
    <button
      onClick={onRoll}
      aria-label={`Roll ${skill.name}`}
      className="w-full bg-surface-container flex items-center justify-between p-4 gap-4 border border-white/50 shadow-[0_0_18px_rgba(0,218,243,0.2)] hover:shadow-[0_0_35px_rgba(0,218,243,0.45)] hover:bg-surface-container-high transition-all active:scale-[0.99] text-left cursor-pointer"
    >
      {/* Left: name + meta */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={`w-1.5 h-8 flex-shrink-0 ${
            skill.trained ? 'bg-secondary' : 'bg-outline-variant/30'
          }`}
        />
        <div className="min-w-0">
          <p className="font-headline font-bold text-secondary truncate leading-tight">
            {skill.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-label text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 uppercase">
              {ABILITY_SHORT[skill.ability]}
            </span>
            {skill.classSkill && (
              <span className="font-label text-[10px] text-secondary/70 uppercase tracking-widest">
                Class
              </span>
            )}
            <span className="font-label text-[10px] text-on-surface-variant">
              Ranks: {skill.ranks}
            </span>
          </div>
        </div>
      </div>

      {/* Bonus */}
      <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-primary to-primary-container text-on-primary">
        <span className="font-label text-2xl font-black">
          {total >= 0 ? `+${total}` : total}
        </span>
      </div>
    </button>
  )
}
