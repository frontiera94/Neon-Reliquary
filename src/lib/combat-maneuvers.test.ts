import { describe, it, expect } from 'vitest'
import { calcCombatManeuvers, calcEffectiveAbilities } from './stat-calc'
import type { ArmorClass } from '../types/defense'
import type { AbilityScore } from '../types/character'
import type { BuffToggle } from '../types/combat'

describe('calcCombatManeuvers', () => {
  const baseAbilities: AbilityScore = {
    str: 18, // mod +4
    dex: 14, // mod +2
    con: 14,
    int: 10,
    wis: 16, // mod +3
    cha: 10,
  }

  const baseAc: ArmorClass = {
    total: 16,
    touch: 16,
    flatFooted: 13,
    armorBonus: 0,
    shieldBonus: 0,
    dexBonus: 2,
    naturalArmor: 0,
    deflection: 1,
    misc: 3,
    spellFailureChance: 0,
  }

  it('calculates standard fighter CMB and CMD', () => {
    const fighter = {
      class: 'Fighter',
      level: 5,
      race: 'Human',
      baseAttackBonus: [5],
      armorClass: baseAc,
      feats: [{ name: 'Power Attack' }, { name: 'Weapon Focus' }],
    }

    const effAbilities = calcEffectiveAbilities(baseAbilities, [], [])
    const res = calcCombatManeuvers(fighter, effAbilities, [], [])

    // CMB = BAB 5 + STR 4 = 9
    expect(res.cmb).toBe(9)
    // CMD = 10 + BAB 5 + STR 4 + DEX 2 + Deflection 1 = 22
    expect(res.cmd).toBe(22)
    // No improved feats -> provokes AoO
    expect(res.maneuvers.trip.provokesAoO).toBe(true)
    expect(res.maneuvers.trip.bonus).toBe(9)
  })

  it('applies Monk class rule: uses Monk Level for CMB and adds Wisdom to CMD', () => {
    const monk = {
      class: 'Monk',
      level: 4,
      race: 'Human',
      baseAttackBonus: [3], // Monk 4 has BAB +3
      armorClass: baseAc,
      feats: [{ name: 'Improved Unarmed Strike' }],
    }

    const effAbilities = calcEffectiveAbilities(baseAbilities, [], [])
    const res = calcCombatManeuvers(monk, effAbilities, [], [])

    // CMB uses Monk Level 4 + STR 4 = 8 (instead of BAB 3 + STR 4 = 7)
    expect(res.cmb).toBe(8)
    // CMD uses Base BAB 3 + STR 4 + DEX 2 + Deflection 1 + Monk WIS 3 + Base 10 = 23
    expect(res.cmd).toBe(23)
  })

  it('detects Improved Trip feat to add +2 and prevent AoO provoke', () => {
    const fighter = {
      class: 'Fighter',
      level: 4,
      race: 'Human',
      baseAttackBonus: [4],
      armorClass: baseAc,
      feats: [{ name: 'Combat Expertise' }, { name: 'Improved Trip' }],
    }

    const effAbilities = calcEffectiveAbilities(baseAbilities, [], [])
    const res = calcCombatManeuvers(fighter, effAbilities, [], [])

    expect(res.maneuvers.trip.bonus).toBe(4 + 4 + 2) // BAB 4 + STR 4 + feat 2 = 10
    expect(res.maneuvers.trip.provokesAoO).toBe(false)
    expect(res.maneuvers.trip.featApplied).toBe('Improved trip')

    // Disarm does not have feat -> still provokes and bonus is 8
    expect(res.maneuvers.disarm.bonus).toBe(8)
    expect(res.maneuvers.disarm.provokesAoO).toBe(true)
  })

  it('applies condition penalties: Shaken, Sickened, and Prone', () => {
    const fighter = {
      class: 'Fighter',
      level: 4,
      race: 'Human',
      baseAttackBonus: [4],
      armorClass: baseAc,
      feats: [],
    }

    const effAbilities = calcEffectiveAbilities(baseAbilities, ['shaken', 'prone'], [])
    const res = calcCombatManeuvers(fighter, effAbilities, ['shaken', 'prone'], [])

    // Base CMB: BAB 4 + STR 4 - Shaken 2 - Prone 4 = 2
    expect(res.cmb).toBe(2)
    // CMD: Base 10 + BAB 4 + STR 4 + DEX 2 + Deflection 1 - Prone 4 = 17
    expect(res.cmd).toBe(17)
  })

  it('applies active attack buffs to CMB', () => {
    const fighter = {
      class: 'Fighter',
      level: 4,
      race: 'Human',
      baseAttackBonus: [4],
      armorClass: baseAc,
      feats: [],
    }

    const hasteBuff: BuffToggle = {
      id: 'haste',
      name: 'Haste',
      active: true,
      attackMod: 1,
      damageMod: 0,
      acMod: 1,
    }

    const effAbilities = calcEffectiveAbilities(baseAbilities, [], [hasteBuff])
    const res = calcCombatManeuvers(fighter, effAbilities, [], [hasteBuff])

    expect(res.cmb).toBe(4 + 4 + 1) // 9
  })

  it('detects Greater Grapple feat to add +4 and provides cmdBonus', () => {
    const fighter = {
      class: 'Fighter',
      level: 6,
      race: 'Human',
      baseAttackBonus: [6],
      armorClass: baseAc,
      feats: [{ name: 'Improved Grapple' }, { name: 'Greater Grapple' }],
    }

    const effAbilities = calcEffectiveAbilities(baseAbilities, [], [])
    const res = calcCombatManeuvers(fighter, effAbilities, [], [])

    // BAB 6 + STR 4 + feat 4 = 14
    expect(res.maneuvers.grapple.bonus).toBe(14)
    expect(res.maneuvers.grapple.provokesAoO).toBe(false)
    expect(res.maneuvers.grapple.featApplied).toBe('Greater grapple')
    expect(res.maneuvers.grapple.cmdBonus).toBe(4)
  })

  it('applies Agile Maneuvers feat to use DEX instead of STR for CMB', () => {
    const rogueAbilities: AbilityScore = {
      str: 10, // mod 0
      dex: 20, // mod +5
      con: 14,
      int: 14,
      wis: 12,
      cha: 10,
    }

    const rogue = {
      class: 'Rogue',
      level: 5,
      race: 'Elf',
      baseAttackBonus: [3],
      armorClass: baseAc,
      feats: [{ name: 'Agile Maneuvers' }],
    }

    const effAbilities = calcEffectiveAbilities(rogueAbilities, [], [])
    const res = calcCombatManeuvers(rogue, effAbilities, [], [])

    // CMB = BAB 3 + DEX 5 = 8 (instead of STR 0)
    expect(res.cmb).toBe(8)
    expect(res.breakdownCmb.some((b) => b.label.includes('Agile Maneuvers'))).toBe(true)
  })

  it('applies Size modifiers to both CMB and CMD', () => {
    const smallHalfling = {
      class: 'Fighter',
      level: 4,
      race: 'Halfling',
      baseAttackBonus: [4],
      armorClass: baseAc,
      feats: [],
    }

    const effAbilities = calcEffectiveAbilities(baseAbilities, [], [])
    const resSmall = calcCombatManeuvers(smallHalfling, effAbilities, [], [])

    // Halfling Small size = -1 CMB and -1 CMD
    expect(resSmall.breakdownCmb.some((b) => b.label === 'Small Size' && b.value === -1)).toBe(true)
    expect(resSmall.breakdownCmd.some((b) => b.label === 'Small Size' && b.value === -1)).toBe(true)

    const largeCreature = {
      class: 'Barbarian',
      level: 4,
      race: 'Minotaur',
      size: 'Large',
      baseAttackBonus: [4],
      armorClass: baseAc,
      feats: [],
    }

    const resLarge = calcCombatManeuvers(largeCreature, effAbilities, [], [])
    // Large size = +1 CMB and +1 CMD
    expect(resLarge.breakdownCmb.some((b) => b.label === 'Large Size' && b.value === 1)).toBe(true)
    expect(resLarge.breakdownCmd.some((b) => b.label === 'Large Size' && b.value === 1)).toBe(true)
  })
})

