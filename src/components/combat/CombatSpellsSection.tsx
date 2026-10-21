import { useMemo } from 'react'
import { useCharacterStore, type FullCharacter } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'
import { useDiceStore } from '../../store/useDiceStore'
import { useInspectorStore } from '../../store/useInspectorStore'
import { parseDiceFormula } from '../../lib/dice-engine'
import { findMatchingBuffForSpell } from '../../lib/stat-calc'
import { spellAttackBonus, spellSaveDc } from '../../lib/spell-display'
import { isBuffSpell } from '../../lib/spell-buffs'
import { spellInspectorItem } from '../../lib/inspector-items'
import type { SessionState } from '../../types/session'
import type { Spell, SpellAttackType } from '../../types/resources'

const attackLabel: Record<SpellAttackType, string> = {
  rangedTouch: 'Cast (Ranged Touch)',
  meleeTouch: 'Cast (Melee Touch)',
  ray: 'Cast (Ray)',
}

export interface SpellRowProps {
  spell: Spell
  isPrepared?: boolean
  attackLabel?: string
  dc?: number
  isBuffActive?: boolean
  onTogglePrepare?: () => void
  onAttack?: () => void
  onDamage?: () => void
  onActivateBuff?: () => void
  onInspect?: () => void
  compact?: boolean
}

export function SpellRow({
  spell,
  isPrepared = false,
  attackLabel: attackText,
  dc,
  isBuffActive = false,
  onTogglePrepare,
  onAttack,
  onDamage,
  onActivateBuff,
  onInspect,
  compact = false,
}: SpellRowProps) {
  return (
    <details
      data-testid="spell-row"
      className={`w-full group rounded-xl overflow-hidden border transition-all ${
        isPrepared
          ? 'border-primary/50 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
          : isBuffActive
          ? 'border-secondary/50 shadow-[0_0_12px_rgba(217,70,239,0.15)]'
          : 'border-white/[0.08]'
      }`}
    >
      <summary
        className={`transition-all flex items-center gap-3 cursor-pointer list-none ${
          compact ? 'p-3' : 'p-4'
        } ${isPrepared ? 'bg-primary/10 hover:bg-primary/15' : 'bg-surface-container/90 hover:bg-surface-container-high'}`}
      >
        {onTogglePrepare && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              onTogglePrepare()
            }}
            className={`w-5 h-5 rounded flex-shrink-0 border transition-all flex items-center justify-center cursor-pointer ${
              isPrepared
                ? 'bg-primary border-primary shadow-[0_0_8px_rgba(0,240,255,0.5)]'
                : 'border-white/20 hover:border-primary'
            }`}
            aria-label={`${isPrepared ? 'Unprepare' : 'Prepare'} ${spell.name}`}
          >
            {isPrepared && (
              <span className="material-symbols-outlined text-black leading-none font-bold" style={{ fontSize: '14px' }}>
                check
              </span>
            )}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault()
                onInspect?.()
              }}
              className={`font-headline font-bold text-left transition-colors ${
                isPrepared ? 'text-primary' : isBuffActive ? 'text-secondary' : 'text-white'
              } ${onInspect ? 'hover:text-primary cursor-pointer' : ''}`}
            >
              {spell.name}
            </button>
            {isPrepared && (
              <span className="font-label text-[9px] text-black font-bold bg-primary px-2 py-0.5 rounded-full uppercase tracking-widest">
                Prepared
              </span>
            )}
            {isBuffActive && (
              <span className="font-label text-[9px] text-white font-bold bg-secondary px-2 py-0.5 rounded-full uppercase tracking-widest">
                Buff Active
              </span>
            )}
            <span className="font-label text-[10px] text-primary bg-primary/15 border border-primary/30 px-2 py-0.5 rounded uppercase">
              {spell.school}
              {spell.subschool ? ` (${spell.subschool})` : ''}
            </span>
            {spell.attackType && (
              <span className="font-label text-[10px] text-error bg-error/15 border border-error/30 px-2 py-0.5 rounded uppercase">
                {spell.attackType === 'meleeTouch' ? 'Melee Touch' : spell.attackType === 'ray' ? 'Ray' : 'Ranged Touch'}
              </span>
            )}
            {dc !== undefined && (
              <span className="font-label text-[10px] text-[#00daf3] bg-[#00daf3]/10 border border-[#00daf3]/30 px-2 py-0.5 rounded uppercase tabular-nums">
                DC {dc}
              </span>
            )}
            <span
              className={`font-label text-[10px] border px-2 py-0.5 rounded uppercase ${
                spell.spellResistance
                  ? 'text-secondary bg-secondary/15 border-secondary/30'
                  : 'text-tertiary bg-surface-container-high border-white/10'
              }`}
            >
              SR {spell.spellResistance ? 'Yes' : 'No'}
            </span>
          </div>
          <p className="font-label text-[10px] text-on-surface-variant mt-0.5">
            {spell.castingTime} · {spell.range} · {spell.duration}
          </p>
        </div>
        <span className="material-symbols-outlined text-primary/50 group-open:rotate-180 transition-transform flex-shrink-0">
          expand_more
        </span>
      </summary>

      <div className={`bg-surface-container-low/90 border-t border-white/5 ${compact ? 'px-4 pb-4 pt-2' : 'px-6 pb-6 pt-3'}`}>
        <p className="font-body text-tertiary text-sm leading-relaxed mb-3">{spell.description}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-label uppercase tracking-widest">
          <div>
            <p className="text-primary mb-1 font-bold">Saving Throw</p>
            <p className="text-on-surface-variant">{spell.savingThrow ?? 'None'}</p>
          </div>
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
              <p className="text-on-surface-variant font-bold tabular-nums">
                {spell.damageDice}
                {spell.damageBonus ? `+${spell.damageBonus}` : ''}
              </p>
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-2 flex-wrap">
          {onAttack && attackText && (
            <button
              type="button"
              onClick={onAttack}
              className="min-h-[44px] px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-black font-bold font-label text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all active:scale-95 cursor-pointer"
            >
              {attackText}
            </button>
          )}
          {onDamage && (
            <button
              type="button"
              onClick={onDamage}
              className="min-h-[44px] px-4 py-2 bg-surface-container-highest border border-error/40 text-error font-label text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_0_15px_rgba(255,75,96,0.3)] hover:bg-error/10 transition-all active:scale-95 cursor-pointer tabular-nums"
            >
              Roll Damage ({spell.damageDice}
              {spell.damageBonus ? `+${spell.damageBonus}` : ''})
            </button>
          )}
          {onActivateBuff && (
            <button
              type="button"
              onClick={onActivateBuff}
              aria-label={`${isBuffActive ? 'Deactivate' : 'Activate'} ${spell.name} as Buff`}
              className={`min-h-[44px] px-4 py-2 border font-label text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 cursor-pointer ${
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
              className="min-h-[44px] px-4 py-2 bg-[#181b26] border border-white/10 text-tertiary font-label text-xs uppercase tracking-widest rounded-xl hover:text-primary hover:border-primary/40 transition-all cursor-pointer"
            >
              Inspect
            </button>
          )}
        </div>
      </div>
    </details>
  )
}

export interface CombatSpellsSectionProps {
  character?: FullCharacter
  session?: SessionState
  className?: string
  limit?: number
  compact?: boolean
}

/**
 * Compact spell strip for the combat dashboard. Buff-convertible spells can
 * be toggled directly as session buffs without visiting the Spells tab.
 */
export function CombatSpellsSection({
  character: characterProp,
  session: sessionProp,
  className = '',
  limit = 8,
  compact = false,
}: CombatSpellsSectionProps) {
  const storeCharacter = useCharacterStore((s) => s.activeCharacter())
  const character = characterProp ?? storeCharacter
  const storeSession = useSessionStore((s) => (character ? s.getSession(character.id) : null))
  const session = sessionProp ?? storeSession
  const openInspector = useInspectorStore((s) => s.openInspector)
  const openRoll = useDiceStore((s) => s.openRoll)
  const toggleSpellBuff = useSessionStore((s) => s.toggleSpellBuff)
  const toggleBuff = useSessionStore((s) => s.toggleBuff)
  const spendSpellSlot = useSessionStore((s) => s.spendSpellSlot)

  const spells = useMemo(
    () =>
      character
        ? character.spells
            .filter((spell) => spell.attackType || spell.damageDice || spell.summonOptions?.length || isBuffSpell(spell))
            .slice(0, limit)
        : [],
    [character, limit]
  )

  if (!character || !session || spells.length === 0) return null

  const allBuffs = [...character.buffs, ...(session.customBuffs ?? [])]
  const matchForSpell = (spell: Spell) => findMatchingBuffForSpell(spell, allBuffs)
  const isSpellActive = (spell: Spell) => {
    const match = matchForSpell(spell)
    return session.activeBuffIds.includes(match?.id ?? `spell-buff-${spell.id}`)
  }

  const activateBuff = (spell: Spell) => {
    const active = isSpellActive(spell)
    const match = matchForSpell(spell)
    if (!active && spell.level > 0) {
      const slotMax = character.spellSlots.find((slot) => slot.level === spell.level)?.total ?? 0
      const spent = session.spentSpellSlots[spell.level] ?? 0
      if (slotMax > spent) spendSpellSlot(character.id, spell.level, slotMax)
    }
    if (match) toggleBuff(character.id, match.id)
    else toggleSpellBuff(character.id, spell)
  }

  return (
    <section className={`bg-[#11131c] border border-white/10 rounded-xl ${compact ? 'p-3' : 'p-4'} ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-headline text-sm uppercase tracking-widest text-secondary font-bold">
          Combat Spellbook
        </h3>
        <span className="font-label text-[10px] uppercase tracking-wider text-tertiary tabular-nums">
          {spells.length} ready
        </span>
      </div>
      <div className="space-y-2">
        {spells.map((spell) => {
          const active = isSpellActive(spell)
          const attackBonus = spellAttackBonus(character, spell)
          return (
            <SpellRow
              key={spell.id}
              spell={spell}
              compact
              dc={spellSaveDc(character, spell)}
              isBuffActive={active}
              attackLabel={spell.attackType ? `${attackLabel[spell.attackType]} (${attackBonus >= 0 ? `+${attackBonus}` : attackBonus})` : undefined}
              onAttack={
                spell.attackType
                  ? () =>
                      openRoll({
                        diceType: 20,
                        count: 1,
                        modifier: attackBonus,
                        label: `${spell.name} (Attack)`,
                      })
                  : undefined
              }
              onDamage={
                spell.damageDice
                  ? () => {
                      const { count, sides, bonus } = parseDiceFormula(spell.damageDice!)
                      openRoll({
                        diceType: sides,
                        count,
                        modifier: (spell.damageBonus ?? 0) + bonus,
                        label: `${spell.name} (Damage)`,
                      })
                    }
                  : undefined
              }
              onActivateBuff={isBuffSpell(spell) ? () => activateBuff(spell) : undefined}
              onInspect={() =>
                openInspector(
                  spellInspectorItem(spell, {
                    dc: spellSaveDc(character, spell),
                    attackBonus: spell.attackType ? attackBonus : undefined,
                    tags: active ? ['Buff Active'] : [],
                    actions: isBuffSpell(spell)
                      ? [
                          {
                            label: active ? 'Deactivate Buff' : 'Activate as Buff',
                            onClick: () => activateBuff(spell),
                            variant: active ? 'danger' : 'secondary',
                          },
                        ]
                      : undefined,
                  })
                )
              }
            />
          )
        })}
      </div>
    </section>
  )
}
