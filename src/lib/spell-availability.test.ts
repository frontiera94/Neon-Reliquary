import { describe, expect, it } from 'vitest'
import { getSpellAvailability, normalizePreparedSpells, expandPreparedSpells } from './spell-availability'
import type { Spell } from '../types/resources'

const spell = (overrides: Partial<Spell> & Pick<Spell, 'id' | 'name' | 'level'>): Spell => ({
  school: 'Evocation',
  castingTime: '1 standard action',
  range: 'Close',
  duration: 'Instantaneous',
  spellResistance: false,
  components: 'V, S',
  description: 'Test spell',
  ...overrides,
})

const abilities = { str: 10, dex: 18, con: 14, int: 18, wis: 12, cha: 8 }

const preparedBase = {
  class: 'Magus',
  level: 4,
  abilities,
  spells: [
    spell({ id: 'cantrip', name: 'Ray of Frost', level: 0, attackType: 'ray', damageDice: '1d3' }),
    spell({ id: 'shield', name: 'Shield', level: 1 }),
    spell({ id: 'grasp', name: 'Shocking Grasp', level: 1, attackType: 'meleeTouch', damageDice: '4d6' }),
    spell({ id: 'fireball', name: 'Fireball', level: 3 }),
  ],
  spellSlots: [
    { level: 1, total: 4 },
    { level: 2, total: 2 },
  ],
}

describe('getSpellAvailability', () => {
  it('counts prepared copies, capacity and remaining slots for prepared casters', () => {
    const availability = getSpellAvailability(preparedBase, {
      preparedSpells: { shield: 2 },
      spentSpellSlots: { 1: 1, 2: 5 },
    })

    expect(availability.profile.mode).toBe('prepared')
    expect(availability.getLevel(1)).toMatchObject({
      total: 4,
      spent: 1,
      remaining: 3,
      preparedCount: 2,
      preparedCapacity: 4,
    })
    expect(availability.getLevel(2)).toMatchObject({ total: 2, spent: 2, remaining: 0 })
    expect(availability.preparedCopies('shield')).toBe(2)
    expect(availability.castableIds).toEqual(expect.arrayContaining(['cantrip', 'shield']))
    expect(availability.castableIds).not.toContain('grasp')
  })

  it('does not treat a level > 0 spell with no slots as at-will', () => {
    const availability = getSpellAvailability(preparedBase, {
      preparedSpells: { fireball: 1 },
    })
    const fireball = preparedBase.spells.find((entry) => entry.id === 'fireball')!

    expect(availability.getLevel(3)?.total).toBe(0)
    expect(availability.isAtWill(fireball)).toBe(false)
    expect(availability.isCastable(fireball)).toBe(false)
    expect(availability.reasonUnavailable(fireball)).toBe('No slots at this level')
  })

  it('shows known spells for spontaneous casters without preparation', () => {
    const availability = getSpellAvailability(
      {
        class: 'Inquisitor',
        level: 4,
        abilities,
        spells: [
          spell({ id: 'cure', name: 'Cure Light Wounds', level: 1 }),
          spell({ id: 'shield', name: 'Shield', level: 1 }),
        ],
        spellSlots: [{ level: 1, total: 2 }],
      },
      { preparedSpellIds: [] }
    )

    expect(availability.profile.mode).toBe('spontaneous')
    expect(availability.combatSpells.map((entry) => entry.id)).toEqual(['cure', 'shield'])
    expect(availability.preparedCapacity).toBe(0)
    expect(availability.knownCount).toBe(2)
  })

  it('reserves domain spells from prepared capacity and keeps them always available', () => {
    const domainBase = {
      class: 'Druid',
      level: 4,
      abilities,
      spells: [
        spell({ id: 'domain', name: 'Burning Hands (Domain)', level: 1, source: 'domain' as const, alwaysPrepared: true }),
        spell({ id: 'entangle', name: 'Entangle', level: 1 }),
      ],
      spellSlots: [{ level: 1, total: 2 }],
    }
    const availability = getSpellAvailability(domainBase, { preparedSpellIds: [] })

    expect(availability.getLevel(1)).toMatchObject({
      alwaysPreparedCount: 1,
      preparedCapacity: 1,
      preparedCount: 0,
    })
    expect(availability.isCastable(domainBase.spells[0])).toBe(true)
    expect(availability.isPreparationLocked(domainBase.spells[0])).toBe(true)
  })

  it('models SLAs and at-will spells without consuming spell slots', () => {
    const rogue = {
      class: 'Rogue',
      level: 5,
      abilities,
      spells: [
        spell({ id: 'acid', name: 'Acid Splash', level: 0, atWill: true }),
        spell({ id: 'vanish', name: 'Vanish', level: 1, source: 'sla' as const, resourceId: 'vanish-uses' }),
      ],
      spellSlots: [],
      dailyResources: [{ id: 'vanish-uses', name: 'Vanish', total: 2 }],
      spellcasting: { mode: 'none' as const, ability: 'int' as const },
    }

    const available = getSpellAvailability(rogue, { spentResources: { 'vanish-uses': 1 } })
    const exhausted = getSpellAvailability(rogue, { spentResources: { 'vanish-uses': 2 } })

    expect(available.isCastable(rogue.spells[0])).toBe(true)
    expect(available.slotCost(rogue.spells[0])).toBe(0)
    expect(available.isCastable(rogue.spells[1])).toBe(true)
    expect(available.slotCost(rogue.spells[1])).toBe(0)
    expect(exhausted.isCastable(rogue.spells[1])).toBe(false)
    expect(exhausted.reasonUnavailable(rogue.spells[1])).toBe('Vanish exhausted')
  })

  it('clamps negative or over-total slot spend', () => {
    const availability = getSpellAvailability(preparedBase, { spentSpellSlots: { 1: -3, 2: 99 } })
    expect(availability.getLevel(1)?.spent).toBe(0)
    expect(availability.getLevel(1)?.remaining).toBe(4)
    expect(availability.getLevel(2)?.spent).toBe(2)
    expect(availability.getLevel(2)?.remaining).toBe(0)
  })
})

describe('prepared spell normalization', () => {
  it('converts legacy duplicate ids into explicit counts and back', () => {
    const counts = normalizePreparedSpells(undefined, ['shield', 'shield', 'grasp'])
    expect(counts).toEqual({ shield: 2, grasp: 1 })
    expect(expandPreparedSpells(counts)).toEqual(['shield', 'shield', 'grasp'])
  })

  it('prefers the canonical map when both representations exist', () => {
    expect(normalizePreparedSpells({ shield: 1 }, ['grasp'])).toEqual({ shield: 1 })
  })
})
