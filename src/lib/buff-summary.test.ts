import { describe, it, expect } from 'vitest'
import {
  summarizeBuffModifiers,
  buffModifierTokens,
  modifierColor,
} from './buff-summary'
import type { BuffToggle } from '../types/combat'

const emptyBuff: BuffToggle = {
  id: 'b1',
  name: 'Test Buff',
  description: 'desc',
  active: false,
  attackMod: 0,
  damageMod: 0,
  acMod: 0,
  saveMod: 0,
}

describe('buff-summary', () => {
  it('formats numeric and per-save modifiers into summary string', () => {
    expect(
      summarizeBuffModifiers({
        ...emptyBuff,
        attackMod: 2,
        damageMod: -1,
        acMod: 4,
        saveMod: 1,
        abilityMods: { str: 4, dex: -2 },
        extraDamageDice: '2d6',
      })
    ).toBe('+2 ATK | -1 DMG | +4 AC | +1 SAVES | +4 STR | -2 DEX | +2d6 DMG')
  })

  it('formats object saveMod (fort/ref/will)', () => {
    expect(
      summarizeBuffModifiers({
        ...emptyBuff,
        saveMod: { fort: 2, ref: -1, will: 3 },
      })
    ).toBe('+2 FORT | -1 REF | +3 WILL')
  })

  it('returns empty string for zero-modifier buff', () => {
    expect(summarizeBuffModifiers(emptyBuff)).toBe('')
  })

  it('produces structured modifier tokens including extraDamageDice with null value', () => {
    const tokens = buffModifierTokens({
      ...emptyBuff,
      attackMod: 1,
      saveMod: { fort: 2 },
      extraDamageDice: '1d6',
    })
    expect(tokens).toEqual([
      { label: 'ATK', value: 1 },
      { label: 'FORT', value: 2 },
      { label: '1d6', value: null },
    ])
  })

  it('maps positive, negative, and neutral values to semantic color classes', () => {
    expect(modifierColor(2)).toBe('text-[#00daf3]')
    expect(modifierColor(-2)).toBe('text-[#ffb4ab]')
    expect(modifierColor(0)).toBe('text-on-surface')
    expect(modifierColor(null)).toBe('text-on-surface')
  })
})
