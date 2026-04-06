import { useState } from 'react'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import type { Spell } from '../types/resources'

export function SpellsPage() {
  const char = useCharacterStore((s) => s.activeCharacter())
  const session = useSessionStore((s) => char ? s.getSession(char.id) : null)
  const { toggleSpellPrepared, spendSpellSlot, recoverSpellSlot } = useSessionStore()
  const openRoll = useDiceStore((s) => s.openRoll)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<number | 'all'>('all')

  if (!char) return (
    <div className="flex items-center justify-center h-64 text-tertiary font-label text-sm uppercase tracking-widest">
      No character selected
    </div>
  )

  if (!char.spells || char.spells.length === 0) return (
    <div className="p-8">
      <h1 className="font-headline text-5xl font-bold text-on-surface mb-4">The Repository</h1>
      <p className="text-tertiary font-label">This character has no spellcasting ability.</p>
    </div>
  )

  const spellLevels = [...new Set(char.spells.map((s) => s.level))].sort()
  const filteredSpells = char.spells.filter((s) => {
    if (levelFilter !== 'all' && s.level !== levelFilter) return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const preparedIds = session?.preparedSpellIds ?? []
  const spentSlots = session?.spentSpellSlots ?? {}

  const arcaneFailure = char.armorClass.spellFailureChance ?? 0

  return (
    <div className="p-4 md:p-8 lg:p-12">
      {/* Header */}
      <header className="mb-10">
        <h1 className="font-headline text-5xl font-bold text-on-surface mb-2 tracking-tight">
          The Repository
        </h1>
        <p className="text-tertiary font-label uppercase text-sm tracking-[0.2em]">
          Arcane Knowledge & Prepared Invocations
        </p>

        {arcaneFailure > 0 && (
          <div className="mt-4 px-4 py-3 bg-error-container/20 border border-error/30 flex items-center gap-3">
            <span className="material-symbols-outlined text-error text-sm">warning</span>
            <span className="font-label text-xs text-error uppercase tracking-widest">
              Arcane Spell Failure: {arcaneFailure}%
            </span>
          </div>
        )}
      </header>

      {/* Spell slot tracker */}
      {char.spellSlots.length > 0 && (
        <section className="mb-8 bg-surface-container p-6">
          <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-4">
            Spell Slots
          </h2>
          <div className="flex flex-wrap gap-6">
            {char.spellSlots.map((slot) => {
              const spent = spentSlots[slot.level] ?? 0
              const available = slot.total - spent
              return (
                <div key={slot.level}>
                  <p className="font-label text-[10px] text-primary uppercase tracking-widest mb-2">
                    Level {slot.level}: {available}/{slot.total}
                  </p>
                  <div className="flex gap-1">
                    {Array.from({ length: slot.total }).map((_, i) => {
                      const isSpent = i >= available
                      return (
                        <button
                          key={i}
                          onClick={() =>
                            !isSpent
                              ? spendSpellSlot(char.id, slot.level, slot.total)
                              : recoverSpellSlot(char.id, slot.level)
                          }
                          className={`w-7 h-7 transition-all flex items-center justify-center ${
                            isSpent
                              ? 'bg-surface-container-highest border border-primary/30'
                              : 'bg-transparent border border-primary shadow-[0_0_6px_rgba(0,218,243,0.3)] hover:bg-primary/10'
                          }`}
                          aria-label={`Spell slot level ${slot.level} ${i + 1}`}
                        >
                          {isSpent && (
                            <span className="material-symbols-outlined text-primary/50 leading-none" style={{ fontSize: '14px' }}>close</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary/50 text-sm">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search spells..."
            className="bg-surface-container-lowest pl-10 pr-4 py-3 font-label text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none w-64 border-b-2 border-transparent focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setLevelFilter('all')}
            className={`px-3 py-2 font-label text-xs uppercase tracking-widest transition-all ${levelFilter === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container text-tertiary hover:text-white'}`}
          >
            All
          </button>
          {spellLevels.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-2 font-label text-xs uppercase tracking-widest transition-all ${levelFilter === lvl ? 'bg-primary text-on-primary' : 'bg-surface-container text-tertiary hover:text-white'}`}
            >
              Lv {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Spells grouped by level */}
      {spellLevels
        .filter((lvl) => levelFilter === 'all' || lvl === levelFilter)
        .map((lvl) => {
          const levelSpells = filteredSpells.filter((s) => s.level === lvl)
          if (levelSpells.length === 0) return null
          return (
            <div key={lvl} className="mb-8">
              <div className="flex items-center gap-4 mb-3">
                <h3 className="font-label text-xs uppercase tracking-[0.2em] text-primary">
                  Level {lvl}
                </h3>
                <div className="flex-1 h-px bg-outline-variant/20" />
              </div>
              <div className="space-y-px">
                {levelSpells.map((spell) => {
                  const slotMax = char.spellSlots.find((sl) => sl.level === spell.level)?.total ?? 0
                  return (
                  <SpellRow
                    key={spell.id}
                    spell={spell}
                    isPrepared={preparedIds.includes(spell.id)}
                    onTogglePrepare={() => toggleSpellPrepared(char.id, spell.id, spell.level, slotMax)}
                    onCast={
                      spell.isAttackSpell
                        ? () => openRoll({ diceType: 20, count: 1, modifier: char.savingThrows.will, label: `${spell.name} Attack` })
                        : undefined
                    }
                  />
                  )
                })}
              </div>
            </div>
          )
        })}
    </div>
  )
}

function SpellRow({
  spell,
  isPrepared,
  onTogglePrepare,
  onCast,
}: {
  spell: Spell
  isPrepared: boolean
  onTogglePrepare: () => void
  onCast?: () => void
}) {
  return (
    <details className={`w-full group border transition-all ${isPrepared ? 'border-primary/50 shadow-[0_0_8px_rgba(0,218,243,0.15)]' : 'border-outline-variant/20'}`}>
      <summary className={`transition-all flex items-center gap-4 p-4 cursor-pointer list-none ${isPrepared ? 'bg-primary/10 hover:bg-primary/15' : 'bg-surface-container hover:bg-surface-container-high'}`}>
        {/* Prepared toggle */}
        <button
          onClick={(e) => { e.preventDefault(); onTogglePrepare() }}
          className={`w-5 h-5 flex-shrink-0 border transition-all flex items-center justify-center ${isPrepared ? 'bg-primary border-primary shadow-[0_0_6px_rgba(0,218,243,0.4)]' : 'border-outline-variant/30 hover:border-primary'}`}
          aria-label={`${isPrepared ? 'Unprepare' : 'Prepare'} ${spell.name}`}
        >
          {isPrepared && (
            <span className="material-symbols-outlined text-on-primary leading-none" style={{ fontSize: '14px' }}>check</span>
          )}
        </button>
        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`font-headline font-bold ${isPrepared ? 'text-primary' : 'text-secondary'}`}>{spell.name}</span>
            {isPrepared && (
              <span className="font-label text-[9px] text-on-primary bg-primary px-1.5 py-0.5 uppercase tracking-widest">Prepared</span>
            )}
            <span className="font-label text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 uppercase">
              {spell.school}{spell.subschool ? ` (${spell.subschool})` : ''}
            </span>
            {spell.isAttackSpell && (
              <span className="font-label text-[10px] text-error bg-error/10 px-1.5 py-0.5 uppercase">
                Attack
              </span>
            )}
          </div>
          <p className="font-label text-[10px] text-on-surface-variant mt-0.5">
            {spell.castingTime} · {spell.range} · {spell.duration}
          </p>
        </div>
        <span className="material-symbols-outlined text-primary/50 group-open:rotate-180 transition-transform flex-shrink-0">
          expand_more
        </span>
      </summary>

      <div className="bg-surface-container-low px-6 pb-6 pt-3">
        <p className="font-body text-tertiary text-sm leading-relaxed mb-4">{spell.description}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] font-label uppercase tracking-widest">
          {spell.savingThrow && (
            <div>
              <p className="text-primary mb-1">Saving Throw</p>
              <p className="text-on-surface-variant">{spell.savingThrow}</p>
            </div>
          )}
          <div>
            <p className="text-primary mb-1">Spell Resist</p>
            <p className="text-on-surface-variant">{spell.spellResistance ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-primary mb-1">Components</p>
            <p className="text-on-surface-variant">{spell.components}</p>
          </div>
        </div>
        {onCast && (
          <button
            onClick={onCast}
            className="mt-4 px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-label text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-all active:scale-95"
          >
            Cast Spell
          </button>
        )}
      </div>
    </details>
  )
}
