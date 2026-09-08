import { describe, it, expect } from 'vitest'
import { BUFF_PRESETS } from './buff-presets'

describe('BUFF_PRESETS catalogue', () => {
  it('contains predefined buff presets', () => {
    expect(BUFF_PRESETS.length).toBeGreaterThanOrEqual(10)
  })

  it('has unique IDs for all presets', () => {
    const ids = BUFF_PRESETS.map((b) => b.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('initializes all presets as inactive (active: false)', () => {
    for (const buff of BUFF_PRESETS) {
      expect(buff.active, `Buff ${buff.name} should be inactive by default`).toBe(false)
    }
  })

  it('provides non-empty name and description for each preset', () => {
    for (const buff of BUFF_PRESETS) {
      expect(buff.name.trim().length, `Empty name for ${buff.id}`).toBeGreaterThan(0)
      expect(buff.description?.trim().length, `Empty description for ${buff.id}`).toBeGreaterThan(0)
    }
  })

  it('assigns valid Material You color tokens', () => {
    const validColors = ['primary', 'secondary', 'error']
    for (const buff of BUFF_PRESETS) {
      if (buff.color) {
        expect(validColors).toContain(buff.color)
      }
    }
  })

  it('has valid abilityMods structure when present', () => {
    const validAbilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha']
    for (const buff of BUFF_PRESETS) {
      if (buff.abilityMods) {
        for (const [k, v] of Object.entries(buff.abilityMods)) {
          expect(validAbilityKeys, `Invalid ability key ${k} in buff ${buff.id}`).toContain(k)
          expect(typeof v).toBe('number')
          expect(v).not.toBe(0)
        }
      }
    }
  })

  it('includes iconic Pathfinder buffs', () => {
    const names = BUFF_PRESETS.map((b) => b.name)
    expect(names).toContain('Haste')
    expect(names).toContain('Bless')
    expect(names).toContain('Flanking')
    expect(names).toContain("Bull's Strength")
    expect(names).toContain('Barbarian Rage')
  })

  it('defines Barbarian Rage with correct penalties and bonuses', () => {
    const rage = BUFF_PRESETS.find((b) => b.id === 'preset-rage')
    expect(rage).toBeDefined()
    expect(rage?.acMod).toBe(-2)
    expect(rage?.abilityMods?.str).toBe(4)
    expect(rage?.abilityMods?.con).toBe(4)
    expect(rage?.saveMod).toEqual({ will: 2 })
    expect(rage?.color).toBe('error')
  })
})
