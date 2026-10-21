import { useState } from 'react'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import { useInspectorStore } from '../store/useInspectorStore'
import { abilityMod, parseDiceFormula } from '../lib/dice-engine'
import { deriveBuffFromSpell, findMatchingBuffForSpell, isSpellBuffCandidate } from '../lib/stat-calc'
import { spellInspectorItem } from '../lib/inspector-items'
import type { Spell, SpellAttackType } from '../types/resources'
import type { AbilityScore } from '../types/character'

function concentrationMod(charClass: string, level: number, abilities: AbilityScore): number {
  const cls = charClass.toLowerCase()
  let abilMod: number
  if (/wizard|magus|witch|alchemist|investigator|arcanist|rogue/.test(cls)) {
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
  const { toggleSpellPrepared, prepareSpell, unprepareSpell, spendSpellSlot, recoverSpellSlot, toggleBuff, addCustomBuff } = useSessionStore()
  const openRoll = useDiceStore((s) => s.openRoll)
  const openInspector = useInspectorStore((s) => s.openInspector)
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
  const isSpontaneous = /sorcerer|bard|oracle|inquisitor|summoner|bloodrager|skald|hunter/i.test(char.class)

  const arcaneFailure = char.armorClass.spellFailureChance ?? 0
  const concMod = concentrationMod(char.class, char.level, char.abilities)
  const hasCombatCasting = char.feats.some((f) => /combat casting/i.test(f.name))

  const bab = char.baseAttackBonus[0] ?? 0
  const dexMod = abilityMod(char.abilities.dex)
  const strMod = abilityMod(char.abilities.str)
  const attackBonusFor = (t: SpellAttackType): number =>
    t === 'meleeTouch' ? bab + strMod : bab + dexMod

  const allBuffs = [...char.buffs, ...(session?.customBuffs ?? [])]

  const isSpellBuffActive = (spell: Spell) => {
    const match = findMatchingBuffForSpell(spell, allBuffs)
    return session?.activeBuffIds.includes(match?.id ?? `spell-buff-${spell.id}`) ?? false
  }

  const activateSpellBuff = (spell: Spell) => {
    if (!session) return
    const match = findMatchingBuffForSpell(spell, allBuffs)
    const buffId = match?.id ?? `spell-buff-${spell.id}`
    if (session.activeBuffIds.includes(buffId)) {
      if (match) toggleBuff(char.id, match.id)
      return
    }
    const slotMax = char.spellSlots.find((slot) => slot.level === spell.level)?.total ?? 0
    const spent = session.spentSpellSlots[spell.level] ?? 0
    if (spell.level > 0 && spent < slotMax) spendSpellSlot(char.id, spell.level, slotMax)
    if (match) toggleBuff(char.id, match.id)
    else addCustomBuff(char.id, deriveBuffFromSpell(spell))
  }

  const inspectSpell = (spell: Spell) => {
    openInspector(
      spellInspectorItem(spell, {
        tags: isSpellBuffActive(spell) ? ['Buff Active'] : [],
        actions: isSpellBuffCandidate(spell)
          ? [
              {
                label: isSpellBuffActive(spell) ? 'Deactivate Buff' : 'Activate as Buff',
                onClick: () => activateSpellBuff(spell),
                variant: isSpellBuffActive(spell) ? 'danger' : 'secondary',
              },
            ]
          : undefined,
      })
    )
  }

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
          {isSpontaneous ? 'Spontaneous Spells Known & Slot Management' : 'Arcane Knowledge & Prepared Invocations'}
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
          const slotMax = char.spellSlots.find((sl) => sl.level === lvl)?.total ?? 0
          const levelPreparedCount = preparedIds.filter((id) =>
            char.spells.some((s) => s.id === id && s.level === lvl)
          ).length
          const isLevelFull = slotMax > 0 && levelPreparedCount >= slotMax

          return (
            <div key={lvl} className="mb-8">
              <div className="flex items-center gap-4 mb-3">
                <h3 className="font-label text-xs uppercase tracking-[0.2em] text-primary font-bold">
                  Level {lvl} {!isSpontaneous && slotMax > 0 ? `· Prepared: ${levelPreparedCount}/${slotMax}` : ''}
                </h3>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <div className="space-y-2">
                {levelSpells.map((spell) => {
                  const atkBonus = spell.attackType ? attackBonusFor(spell.attackType) : 0
                  const count = preparedIds.filter((id) => id === spell.id).length
                  const isPrepared = isSpontaneous || count > 0
                  const canPrepareMore = !isLevelFull

                  return (
                    <SpellRow
                      key={spell.id}
                      spell={spell}
                      isSpontaneous={isSpontaneous}
                      isPrepared={isPrepared}
                      preparedCount={count}
                      canPrepareMore={canPrepareMore}
                      attackLabel={spell.attackType ? `${attackLabel[spell.attackType]} (${atkBonus >= 0 ? `+${atkBonus}` : atkBonus})` : undefined}
                      isBuffActive={isSpellBuffActive(spell)}
                      onActivateBuff={isSpellBuffCandidate(spell) ? () => activateSpellBuff(spell) : undefined}
                      onInspect={() => inspectSpell(spell)}
                      onTogglePrepare={() => {
                        if (!isPrepared && !canPrepareMore) return
                        toggleSpellPrepared(char.id, spell.id, spell.level, slotMax)
                      }}
                      onAddPrepare={canPrepareMore ? () => prepareSpell(char.id, spell.id) : undefined}
                      onRemovePrepare={() => unprepareSpell(char.id, spell.id)}
                      onAttack={
                        spell.attackType
                          ? () => openRoll({ diceType: 20, count: 1, modifier: atkBonus, label: `${spell.name} (Attack)` })
                          : undefined
                      }
                      onDamage={
                        spell.damageDice
                          ? () => {
                              const { count: dCount, sides, bonus } = parseDiceFormula(spell.damageDice!)
                              openRoll({ diceType: sides, count: dCount, modifier: (spell.damageBonus ?? 0) + bonus, label: `${spell.name} (Damage)` })
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
  isSpontaneous = false,
  preparedCount = 0,
  canPrepareMore = true,
  attackLabel,
  onTogglePrepare,
  onAddPrepare,
  onRemovePrepare,
  onAttack,
  onDamage,
  onActivateBuff,
  onInspect,
  isBuffActive = false,
}: {
  spell: Spell
  isPrepared: boolean
  isSpontaneous?: boolean
  preparedCount?: number
  canPrepareMore?: boolean
  attackLabel?: string
  onTogglePrepare: () => void
  onAddPrepare?: () => void
  onRemovePrepare?: () => void
  onAttack?: () => void
  onDamage?: () => void
  onActivateBuff?: () => void
  onInspect?: () => void
  isBuffActive?: boolean
}) {
  return (
    <details className={`w-full group rounded-xl overflow-hidden border transition-all ${isPrepared ? 'border-primary/50 shadow-[0_0_12px_rgba(0,240,255,0.15)]' : 'border-white/[0.08]'}`}>
      <summary className={`transition-all flex items-center gap-4 p-4 cursor-pointer list-none ${isPrepared ? 'bg-primary/10 hover:bg-primary/15' : 'bg-surface-container/90 hover:bg-surface-container-high'}`}>
        {/* Prepared toggle or Spontaneous badge */}
        {isSpontaneous ? (
          <span className="font-label text-[10px] text-primary bg-primary/15 border border-primary/40 px-2 py-0.5 rounded-md uppercase font-bold flex-shrink-0">
            Known
          </span>
        ) : (
          <button
            onClick={(e) => { e.preventDefault(); onTogglePrepare() }}
            disabled={!isPrepared && !canPrepareMore}
            className={`w-5 h-5 rounded-md flex-shrink-0 border transition-all flex items-center justify-center ${
              isPrepared
                ? 'bg-primary border-primary shadow-[0_0_8px_rgba(0,240,255,0.5)] cursor-pointer'
                : !canPrepareMore
                ? 'border-white/10 opacity-30 cursor-not-allowed'
                : 'border-white/20 hover:border-primary cursor-pointer'
            }`}
            aria-label={`${isPrepared ? 'Unprepare' : 'Prepare'} ${spell.name}`}
            title={!isPrepared && !canPrepareMore ? 'All slots prepared for this level' : undefined}
          >
            {isPrepared && (
              <span className="material-symbols-outlined text-black leading-none font-bold" style={{ fontSize: '14px' }}>check</span>
            )}
          </button>
        )}
        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault()
                onInspect?.()
              }}
              className={`font-headline font-bold text-left cursor-pointer hover:underline underline-offset-4 ${isPrepared ? 'text-primary' : isBuffActive ? 'text-secondary' : 'text-white'}`}
            >
              {spell.name}
            </button>
            {isBuffActive && (
              <span className="font-label text-[9px] text-white font-bold bg-secondary px-2 py-0.5 rounded-full uppercase tracking-widest">
                Buff Active
              </span>
            )}
            {!isSpontaneous && isPrepared && (
              <div
                className="flex items-center gap-1.5 bg-primary/20 border border-primary/40 rounded-full px-2 py-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-label text-[9px] text-primary font-bold uppercase tracking-widest">
                  Prepared {preparedCount > 1 ? `x${preparedCount}` : ''}
                </span>
                {onRemovePrepare && (
                  <button
                    onClick={(e) => { e.preventDefault(); onRemovePrepare() }}
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-primary hover:text-white hover:bg-primary/40 text-[10px] font-bold cursor-pointer"
                    title="Remove one prepared copy"
                    aria-label={`Remove one prepared ${spell.name}`}
                  >
                    -
                  </button>
                )}
                {onAddPrepare && (
                  <button
                    onClick={(e) => { e.preventDefault(); onAddPrepare() }}
                    disabled={!canPrepareMore}
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-primary text-[10px] font-bold ${
                      canPrepareMore
                        ? 'hover:text-white hover:bg-primary/40 cursor-pointer'
                        : 'opacity-30 cursor-not-allowed'
                    }`}
                    title={canPrepareMore ? 'Prepare an additional copy' : 'No more slots available for this level'}
                    aria-label={`Prepare another copy of ${spell.name}`}
                  >
                    +
                  </button>
                )}
              </div>
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
          {onActivateBuff && (
            <button
              type="button"
              onClick={onActivateBuff}
              className={`px-5 py-2.5 border font-label text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 cursor-pointer ${
                isBuffActive
                  ? 'bg-secondary/20 border-secondary/60 text-secondary hover:bg-secondary/30'
                  : 'bg-secondary/10 border-secondary/40 text-secondary hover:bg-secondary/20'
              }`}
            >
              {isBuffActive ? 'Deactivate Buff' : 'Activate as Buff'}
            </button>
          )}
          {onInspect && (
            <button
              type="button"
              onClick={onInspect}
              className="px-5 py-2.5 bg-white/5 border border-white/10 text-tertiary font-label text-xs uppercase tracking-widest rounded-xl hover:text-primary hover:border-primary/40 transition-all cursor-pointer"
            >
              Inspect
            </button>
          )}
        </div>
      </div>
    </details>
  )
}
