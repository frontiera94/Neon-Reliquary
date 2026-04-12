import { useState, useMemo } from 'react'
import { useCharacterStore } from '../store/useCharacterStore'
import { useDiceStore } from '../store/useDiceStore'
import { abilityMod } from '../lib/dice-engine'
import type { Skill } from '../types/skills'

const ABILITY_SHORT = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }

export function SkillsPage() {
  const char = useCharacterStore((s) => s.activeCharacter())
  const openRoll = useDiceStore((s) => s.openRoll)
  const [search, setSearch] = useState('')
  const [trainedOnly, setTrainedOnly] = useState(false)

  const skills = useMemo(() => {
    if (!char) return []
    return char.skills
      .filter((s) => {
        if (trainedOnly && !s.trained) return false
        if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
      .map((s) => ({
        ...s,
        total: s.ranks + (s.classSkill && s.ranks > 0 ? 3 : 0) + abilityMod(char.abilities[s.ability]) + s.miscBonus,
      }))
  }, [char, search, trainedOnly])

  if (!char) return (
    <div className="flex items-center justify-center h-64 text-tertiary font-label text-sm uppercase tracking-widest">
      No character selected
    </div>
  )

  return (
    <div className="p-4 md:p-8 lg:p-12">
      {/* Header */}
      <header className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-headline text-5xl font-bold text-on-surface mb-2 tracking-tight">
              Grimoire Skills
            </h1>
            <p className="text-tertiary font-label uppercase text-sm tracking-[0.2em]">
              Mechanical Proficiencies & Knowledge
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
            {/* Trained only toggle */}
            <button
              onClick={() => setTrainedOnly(!trainedOnly)}
              className={`flex items-center gap-2 px-4 py-3 font-label text-xs uppercase tracking-widest transition-all ${
                trainedOnly
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-tertiary hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">school</span>
              Trained Only
            </button>
          </div>
        </div>
      </header>

      {/* Skill list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {skills.map((skill) => (
          <SkillRow
            key={skill.id}
            skill={skill}
            total={skill.total}
            onRoll={() => openRoll({
              diceType: 20,
              count: 1,
              modifier: skill.total,
              label: `${skill.name} Check`,
            })}
          />
        ))}
        {skills.length === 0 && (
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
  skill: Skill & { total: number }
  total: number
  onRoll: () => void
}) {
  return (
    <button
      onClick={onRoll}
      aria-label={`Roll ${skill.name}`}
      className="w-full bg-surface-container flex items-center justify-between p-4 gap-4 border border-white/50 shadow-[0_0_18px_rgba(0,218,243,0.2)] hover:shadow-[0_0_35px_rgba(0,218,243,0.45)] hover:bg-surface-container-high transition-all active:scale-[0.99] text-left"
    >
      {/* Left: name + meta */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={`w-1.5 h-8 flex-shrink-0 ${skill.trained ? 'bg-secondary' : 'bg-outline-variant/30'}`}
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
