import { describe, it, expect } from 'vitest'
import { calcEffectiveWeapon, formatAttackBonus, formatDamage } from './combat-calc'
import type { Weapon, BuffToggle } from '../types/combat'

// ─── fixtures ────────────────────────────────────────────────────────────────

const meleeWeapon: Weapon = {
  id: 'sword',
  name: 'Longsword',
  type: 'melee',
  attackBonus: [10, 5],
  damageDice: '1d8',
  damageBonus: 3,
  critRange: 19,
  critMultiplier: 2,
  tags: [],
}

const rangedWeapon: Weapon = {
  id: 'bow',
  name: 'Longbow',
  type: 'ranged',
  attackBonus: [8],
  damageDice: '1d8',
  damageBonus: 0,
  critRange: 20,
  critMultiplier: 3,
  tags: [],
}

const powerAttackBuff: BuffToggle = {
  id: 'power-attack',
  name: 'Power Attack',
  active: false,
  attackMod: -3,
  damageMod: 6,
  acMod: 0,
  meleeOnly: true,
}

const hasteBuffBuff: BuffToggle = {
  id: 'haste',
  name: 'Haste',
  active: false,
  attackMod: 1,
  damageMod: 0,
  acMod: 1,
}

const allBuffs = [powerAttackBuff, hasteBuffBuff]

// ─── calcEffectiveWeapon ─────────────────────────────────────────────────────

describe('calcEffectiveWeapon', () => {
  it('returns base stats when no buffs are active', () => {
    const result = calcEffectiveWeapon(meleeWeapon, allBuffs, [])
    expect(result.attackBonus).toEqual([10, 5])
    expect(result.damageBonus).toBe(3)
    expect(result.acMod).toBe(0)
    expect(result.activeBuffNames).toEqual([])
  })

  it('applies attack and damage mods from active buffs', () => {
    const result = calcEffectiveWeapon(meleeWeapon, allBuffs, ['power-attack'])
    expect(result.attackBonus).toEqual([7, 2])   // 10-3, 5-3
    expect(result.damageBonus).toBe(9)            // 3+6
    expect(result.activeBuffNames).toContain('Power Attack')
  })

  it('stacks multiple active buffs', () => {
    const result = calcEffectiveWeapon(meleeWeapon, allBuffs, ['power-attack', 'haste'])
    expect(result.attackBonus).toEqual([8, 3])   // 10-3+1, 5-3+1
    expect(result.damageBonus).toBe(9)            // 3+6+0
    expect(result.acMod).toBe(1)
  })

  it('excludes meleeOnly buffs from ranged weapons (attack/damage)', () => {
    const result = calcEffectiveWeapon(rangedWeapon, allBuffs, ['power-attack', 'haste'])
    // power-attack is meleeOnly — attack and damage mods should not apply
    expect(result.attackBonus).toEqual([9])       // 8+1 (only haste)
    expect(result.damageBonus).toBe(0)            // 0+0
    expect(result.activeBuffNames).not.toContain('Power Attack')
    expect(result.activeBuffNames).toContain('Haste')
  })

  it('still applies acMod from all active buffs regardless of meleeOnly on ranged weapons', () => {
    // acMod comes from activeBuffs (not applicableBuffs), so meleeOnly doesn't filter it
    const result = calcEffectiveWeapon(rangedWeapon, allBuffs, ['power-attack', 'haste'])
    expect(result.acMod).toBe(1)  // haste acMod=1; power-attack acMod=0
  })

  it('ignores buffs that are not in activeBuffIds', () => {
    const result = calcEffectiveWeapon(meleeWeapon, allBuffs, ['nonexistent-id'])
    expect(result.attackBonus).toEqual([10, 5])
    expect(result.damageBonus).toBe(3)
  })

  it('handles empty buffs array', () => {
    const result = calcEffectiveWeapon(meleeWeapon, [], ['power-attack'])
    expect(result.attackBonus).toEqual([10, 5])
    expect(result.damageBonus).toBe(3)
    expect(result.acMod).toBe(0)
  })

  it('handles single-entry attackBonus array', () => {
    const result = calcEffectiveWeapon(rangedWeapon, allBuffs, ['haste'])
    expect(result.attackBonus).toEqual([9])
  })
})

// ─── formatAttackBonus ───────────────────────────────────────────────────────

describe('formatAttackBonus', () => {
  it('formats positive bonuses with + sign', () => {
    expect(formatAttackBonus([10, 5])).toBe('+10 / +5')
  })

  it('formats negative bonuses without extra sign', () => {
    expect(formatAttackBonus([-1, -6])).toBe('-1 / -6')
  })

  it('formats zero as +0', () => {
    expect(formatAttackBonus([0])).toBe('+0')
  })

  it('formats mixed positive and negative', () => {
    expect(formatAttackBonus([7, 2, -3])).toBe('+7 / +2 / -3')
  })

  it('formats single entry with no slash', () => {
    expect(formatAttackBonus([8])).toBe('+8')
  })
})

// ─── formatDamage ────────────────────────────────────────────────────────────

describe('formatDamage', () => {
  it('returns just dice when bonus is 0', () => {
    expect(formatDamage('1d8', 0)).toBe('1d8')
  })

  it('appends positive bonus', () => {
    expect(formatDamage('2d6', 5)).toBe('2d6 + 5')
  })

  it('appends negative bonus with minus sign', () => {
    expect(formatDamage('1d6', -2)).toBe('1d6 - 2')
  })
})
