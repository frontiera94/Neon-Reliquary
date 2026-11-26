import { describe, it, expect } from 'vitest'
import { isBuffSpell, spellToBuff } from './spell-buffs'
import type { Spell } from '../types/resources'

const baseSpell: Spell = {
  id: 'sp-1',
  name: 'Fireball',
  level: 3,
  school: 'Evocation',
  castingTime: '1 standard action',
  range: 'Long',
  duration: 'Instantaneous',
  savingThrow: 'Reflex half',
  spellResistance: true,
  components: 'V, S, M',
  description: 'Deals 1d6 per caster level fire damage.',
  damageDice: '5d6',
}

describe('spell-buffs', () => {
  it('excludes instantaneous damage spells', () => {
    expect(isBuffSpell(baseSpell)).toBe(false)
  })

  it('includes known tactical buff spells even with attack/damage fields when non-instantaneous', () => {
    expect(
      isBuffSpell({
        ...baseSpell,
        name: 'Divine Favor',
        duration: '1 minute',
        damageDice: undefined,
      })
    ).toBe(true)
    expect(
      isBuffSpell({
        ...baseSpell,
        name: 'Shield',
        duration: '1 min./level',
        damageDice: undefined,
      })
    ).toBe(true)
  })

  it('includes non-instantaneous abjuration/transmutation/enchantment spells', () => {
    expect(
      isBuffSpell({
        ...baseSpell,
        name: 'Custom Ward',
        school: 'Abjuration',
        duration: '10 minutes/level',
        damageDice: undefined,
      })
    ).toBe(true)
  })

  it('excludes permanent spells without known buff name or effect text', () => {
    expect(
      isBuffSpell({
        ...baseSpell,
        name: 'Permanency Utility',
        school: 'Transmutation',
        duration: 'Permanent',
        damageDice: undefined,
        description: 'Makes another effect permanent.',
      })
    ).toBe(false)
  })

  it('converts a buff spell into a BuffToggle with primary color', () => {
    const buff = spellToBuff({
      ...baseSpell,
      id: 'shield',
      name: 'Shield',
      school: 'Abjuration',
      duration: '1 min./level',
      damageDice: undefined,
      description: 'Grants a +4 shield bonus to AC.',
    })
    expect(buff.color).toBe('primary')
    expect(buff.acMod).toBe(4)
  })
})
