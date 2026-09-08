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
        <h1 className="font-headline text-5xl font-bold text-white mb-2 tracking-tight">
          The Repository
        </h1>
        <p className="text-tertiary font-label uppercase text-sm tracking-[0.2em]">
          Arcane Knowledge & Prepared Invocations
        </p>

        {arcaneFailure > 0 && (
          <div className="mt-4 px-4 py-3 bg-error-container/20 border border-error/30 rounded-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-error text-sm">warning</span>
            <span className="font-label text-xs text-error uppercase tracking-widest font-bold">
              Arcane Spell Failure: {arcaneFailure}%
            </span>
          </div>
        )}

        {/* Global Concentration Check */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openRoll({ diceType: 20, count: 1, modifier: concMod, label: 'Concentration' })}
            className="px-4 py-2 bg-surface-container/90 border border-white/10 rounded-xl text-tertiary font-label text-xs uppercase tracking-widest hover:text-primary hover:border-primary/50 hover:shadow-[0_0_12px_rgba(0,240,255,0.25)] transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>electric_bolt</span>
            Concentration ({concMod >= 0 ? `+${concMod}` : concMod})
          </button>
          {hasCombatCasting && (
            <button
              onClick={() => openRoll({ diceType: 20, count: 1, modifier: concMod + 4, label: 'Concentration (Defensive)' })}
              className="px-4 py-2 bg-surface-container/90 border border-white/10 rounded-xl text-tertiary font-label text-xs uppercase tracking-widest hover:text-secondary hover:border-secondary/50 hover:shadow-[0_0_12px_rgba(217,70,239,0.3)] transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>electric_bolt</span>
              Defensive ({concMod + 4 >= 0 ? `+${concMod}` : concMod + 4})
            </button>
          )}
        </div>
      </header>

      {/* Spell slot tracker */}
      {char.spellSlots.length > 0 && (
        <section className="mb-8 bg-surface-container/90 backdrop-blur-sm p-6 rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(0,240,255,0.06)]">
          <h2 className="font-headline text-secondary text-sm uppercase tracking-widest mb-4 neon-glow-accent font-bold">
            Spell Slots
          </h2>
          <div className="flex flex-wrap gap-6">
            {char.spellSlots.map((slot) => {
              const spent = spentSlots[slot.level] ?? 0
              const available = slot.total - spent
              return (
                <div key={slot.level}>
                  <p className="font-label text-[10px] text-primary uppercase tracking-widest mb-2 font-bold">
                    Level {slot.level}: {available}/{slot.total}
                  </p>
                  <div className="flex gap-1.5">
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
                          className={`w-7 h-7 rounded-md transition-all flex items-center justify-center cursor-pointer ${
                            isSpent
                              ? 'bg-surface-container-highest border border-white/10'
                              : 'bg-primary/20 border border-primary shadow-[0_0_8px_rgba(0,240,255,0.35)] hover:bg-primary/40'
                          }`}
                          aria-label={`Spell slot level ${slot.level} ${i + 1}`}
                        >
                          {isSpent && (
                            <span className="material-symbols-outlined text-primary/40 leading-none" style={{ fontSize: '14px' }}>close</span>
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
            className="bg-surface-container-high/80 rounded-xl pl-10 pr-4 py-2.5 font-label text-sm text-on-surface placeholder:text-tertiary/50 outline-none w-64 border border-white/10 focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setLevelFilter('all')}
            className={`px-3 py-2 font-label text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer ${levelFilter === 'all' ? 'bg-primary text-black font-bold shadow-[0_0_12px_rgba(0,240,255,0.4)]' : 'bg-surface-container text-tertiary hover:text-white border border-white/5'}`}
          >
            All
          </button>
          {spellLevels.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-2 font-label text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer ${levelFilter === lvl ? 'bg-primary text-black font-bold shadow-[0_0_12px_rgba(0,240,255,0.4)]' : 'bg-surface-container text-tertiary hover:text-white border border-white/5'}`}
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
                <h3 className="font-label text-xs uppercase tracking-[0.2em] text-primary font-bold">
                  Level {lvl}
                </h3>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <div className="space-y-2">
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
    <details className={`w-full group rounded-xl overflow-hidden border transition-all ${isPrepared ? 'border-primary/50 shadow-[0_0_12px_rgba(0,240,255,0.15)]' : 'border-white/[0.08]'}`}>
      <summary className={`transition-all flex items-center gap-4 p-4 cursor-pointer list-none ${isPrepared ? 'bg-primary/10 hover:bg-primary/15' : 'bg-surface-container/90 hover:bg-surface-container-high'}`}>
        {/* Prepared toggle */}
        <button
          onClick={(e) => { e.preventDefault(); onTogglePrepare() }}
          className={`w-5 h-5 rounded-md flex-shrink-0 border transition-all flex items-center justify-center cursor-pointer ${isPrepared ? 'bg-primary border-primary shadow-[0_0_8px_rgba(0,240,255,0.5)]' : 'border-white/20 hover:border-primary'}`}
          aria-label={`${isPrepared ? 'Unprepare' : 'Prepare'} ${spell.name}`}
        >
          {isPrepared && (
            <span className="material-symbols-outlined text-black leading-none font-bold" style={{ fontSize: '14px' }}>check</span>
          )}
        </button>
        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`font-headline font-bold ${isPrepared ? 'text-primary' : 'text-white'}`}>{spell.name}</span>
            {isPrepared && (
              <span className="font-label text-[9px] text-black font-bold bg-primary px-2 py-0.5 rounded-full uppercase tracking-widest">Prepared</span>
            )}
            <span className="font-label text-[10px] text-primary bg-primary/15 border border-primary/30 px-2 py-0.5 rounded-md uppercase">
              {spell.school}{spell.subschool ? ` (${spell.subschool})` : ''}
            </span>
            {spell.attackType && (
              <span className="font-label text-[10px] text-error bg-error/15 border border-error/30 px-2 py-0.5 rounded-md uppercase">
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

      <div className="bg-surface-container-low/90 px-6 pb-6 pt-3 border-t border-white/5">
        <p className="font-body text-tertiary text-sm leading-relaxed mb-4">{spell.description}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] font-label uppercase tracking-widest">
          {spell.savingThrow && (
            <div>
              <p className="text-primary mb-1 font-bold">Saving Throw</p>
              <p className="text-on-surface-variant">{spell.savingThrow}</p>
            </div>
          )}
          <div>
            <p className="text-primary mb-1 font-bold">Spell Resist</p>
            <p className="text-on-surface-variant">{spell.spellResistance ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-primary mb-1 font-bold">Components</p>
            <p className="text-on-surface-variant">{spell.components}</p>
          </div>
          {spell.damageDice && (
            <div>
              <p className="text-primary mb-1 font-bold">Damage</p>
              <p className="text-on-surface-variant font-bold">
                {spell.damageDice}{spell.damageBonus ? `+${spell.damageBonus}` : ''}
              </p>
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-2 flex-wrap">
          {onAttack && attackLabel && (
            <button
              onClick={onAttack}
              className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-container text-black font-bold font-label text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all active:scale-95 cursor-pointer"
            >
              {attackLabel}
            </button>
          )}
          {onDamage && (
            <button
              onClick={onDamage}
              className="px-5 py-2.5 bg-surface-container-highest border border-error/40 text-error font-label text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_0_15px_rgba(255,75,96,0.3)] hover:bg-error/10 transition-all active:scale-95 cursor-pointer"
            >
              Roll Damage ({spell.damageDice}{spell.damageBonus ? `+${spell.damageBonus}` : ''})
            </button>
          )}
        </div>
      </div>
    </details>
  )
}
