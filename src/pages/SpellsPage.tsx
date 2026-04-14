import { useState } from 'react'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import { abilityMod, parseDiceFormula } from '../lib/dice-engine'
import type { Spell, SpellAttackType } from '../types/resources'
import type { AbilityScore } from '../types/character'

function concentrationMod(charClass: string, level: number, abilities: AbilityScore): number {
  const cls = charClass.toLowerCase()
  let abilMod: number
  if (/wizard|magus|witch|alchemist|investigator|arcanist/.test(cls)) {
    abilMod = abilityMod(abilities.int)
  } else if (/sorcerer|bard|oracle|summoner|skald|bloodrager/.test(cls)) {
    abilMod = abilityMod(abilities.cha)
  } else {
    abilMod = abilityMod(abilities.wis)
  }
  return level + abilMod
}

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
  const concMod = concentrationMod(char.class, char.level, char.abilities)
  const hasCombatCasting = char.feats.some((f) => /combat casting/i.test(f.name))

  const bab = char.baseAttackBonus[0] ?? 0
  const dexMod = abilityMod(char.abilities.dex)
  const strMod = abilityMod(char.abilities.str)
  const attackBonusFor = (t: SpellAttackType): number =>
    t === 'meleeTouch' ? bab + strMod : bab + dexMod

  const attackLabel: Record<SpellAttackType, string> = {
    rangedTouch: 'Cast (Ranged Touch)',
    meleeTouch: 'Cast (Melee Touch)',
    ray: 'Cast (Ray)',
  }

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

        {/* Global Concentration Check */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openRoll({ diceType: 20, count: 1, modifier: concMod, label: 'Concentration' })}
            className="px-4 py-2 bg-surface-container border border-outline-variant/30 text-tertiary font-label text-xs uppercase tracking-widest hover:text-primary hover:border-primary/50 hover:shadow-[0_0_12px_rgba(0,218,243,0.2)] transition-all active:scale-95 flex items-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>electric_bolt</span>
            Concentration ({concMod >= 0 ? `+${concMod}` : concMod})
          </button>
          {hasCombatCasting && (
            <button
              onClick={() => openRoll({ diceType: 20, count: 1, modifier: concMod + 4, label: 'Concentration (Defensive)' })}
              className="px-4 py-2 bg-surface-container border border-outline-variant/30 text-tertiary font-label text-xs uppercase tracking-widest hover:text-secondary hover:border-secondary/50 hover:shadow-[0_0_12px_rgba(233,195,73,0.2)] transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>electric_bolt</span>
              Defensive ({concMod + 4 >= 0 ? `+${concMod + 4}` : concMod + 4})
            </button>
          )}
        </div>
      </header>

      {/* Spell slot tracker */}
      {char.spellSlots.length > 0 && (
        <section className="mb-8 bg-surface-container p-6 border border-primary/30 shadow-[0_0_15px_rgba(0,218,243,0.08)]">
          <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-4 neon-glow-gold">
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
                  const atkBonus = spell.attackType ? attackBonusFor(spell.attackType) : 0
                  return (
                    <SpellRow
                      key={spell.id}
                      spell={spell}
                      isPrepared={preparedIds.includes(spell.id)}
                      attackLabel={spell.attackType ? `${attackLabel[spell.attackType]} (${atkBonus >= 0 ? `+${atkBonus}` : atkBonus})` : undefined}
                      onTogglePrepare={() => toggleSpellPrepared(char.id, spell.id, spell.level, slotMax)}
                      onAttack={
                        spell.attackType
                          ? () => openRoll({ diceType: 20, count: 1, modifier: atkBonus, label: `${spell.name} (Attack)` })
                          : undefined
                      }
                      onDamage={
                        spell.damageDice
                          ? () => {
                              const { count, sides, bonus } = parseDiceFormula(spell.damageDice!)
                              openRoll({ diceType: sides, count, modifier: (spell.damageBonus ?? 0) + bonus, label: `${spell.name} (Damage)` })
                            }
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
  attackLabel,
  onTogglePrepare,
  onAttack,
  onDamage,
}: {
  spell: Spell
  isPrepared: boolean
  attackLabel?: string
  onTogglePrepare: () => void
  onAttack?: () => void
  onDamage?: () => void
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
            {spell.attackType && (
              <span className="font-label text-[10px] text-error bg-error/10 px-1.5 py-0.5 uppercase">
                {spell.attackType === 'meleeTouch' ? 'Melee Touch' : spell.attackType === 'ray' ? 'Ray' : 'Ranged Touch'}
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
          {spell.damageDice && (
            <div>
              <p className="text-primary mb-1">Damage</p>
              <p className="text-on-surface-variant">
                {spell.damageDice}{spell.damageBonus ? `+${spell.damageBonus}` : ''}
              </p>
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-2 flex-wrap">
          {onAttack && attackLabel && (
            <button
              onClick={onAttack}
              className="px-5 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-label text-xs uppercase tracking-widest border border-white hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-all active:scale-95"
            >
              {attackLabel}
            </button>
          )}
          {onDamage && (
            <button
              onClick={onDamage}
              className="px-5 py-3 bg-surface-container-highest border border-error/40 text-error font-label text-xs uppercase tracking-widest hover:shadow-[0_0_15px_rgba(255,180,171,0.3)] hover:bg-error/10 transition-all active:scale-95"
            >
              Roll Damage ({spell.damageDice}{spell.damageBonus ? `+${spell.damageBonus}` : ''})
            </button>
          )}
        </div>
      </div>
    </details>
  )
}
