import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import type { FullCharacter } from '../store/useCharacterStore'

const dataDir = path.resolve(__dirname)
const jsonFiles = fs
  .readdirSync(dataDir)
  .filter((file) => file.endsWith('.json'))

describe('Character JSON integrity', () => {
  it('finds character json files in src/data', () => {
    expect(jsonFiles.length).toBeGreaterThanOrEqual(5)
  })

  for (const filename of jsonFiles) {
    describe(filename, () => {
      const filepath = path.join(dataDir, filename)
      const raw = fs.readFileSync(filepath, 'utf8')
      let char: FullCharacter

      it('parses as valid JSON', () => {
        expect(() => {
          char = JSON.parse(raw)
        }).not.toThrow()
      })

      it('has required base character fields (id, name, class, level, race, alignment, maxHp, abilities)', () => {
        char = JSON.parse(raw)
        expect(typeof char.id).toBe('string')
        expect(char.id.length).toBeGreaterThan(0)
        expect(typeof char.name).toBe('string')
        expect(char.name.length).toBeGreaterThan(0)
        expect(typeof char.class).toBe('string')
        expect(typeof char.level).toBe('number')
        expect(char.level).toBeGreaterThanOrEqual(1)
        expect(typeof char.race).toBe('string')
        expect(typeof char.alignment).toBe('string')

        // HP check
        expect(typeof char.maxHp).toBe('number')
        expect(char.maxHp).toBeGreaterThan(0)

        // Abilities check
        const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
        expect(char.abilities).toBeDefined()
        for (const ab of abilities) {
          expect(typeof char.abilities[ab], `Missing ability score: ${ab}`).toBe('number')
          expect(char.abilities[ab]).toBeGreaterThan(0)
        }
      })

      it('has valid defense fields (armorClass, savingThrows)', () => {
        char = JSON.parse(raw)
        expect(char.armorClass).toBeDefined()
        expect(typeof char.armorClass.total).toBe('number')
        expect(typeof char.armorClass.touch).toBe('number')
        expect(typeof char.armorClass.flatFooted).toBe('number')

        expect(char.savingThrows).toBeDefined()
        const fort = char.savingThrows.fort ?? (char.savingThrows as unknown as { fortitude: number }).fortitude
        const ref = char.savingThrows.ref ?? (char.savingThrows as unknown as { reflex: number }).reflex
        expect(typeof fort).toBe('number')
        expect(typeof ref).toBe('number')
        expect(typeof char.savingThrows.will).toBe('number')
      })

      it('has valid combat arrays (weapons, buffs, skills)', () => {
        char = JSON.parse(raw)
        expect(Array.isArray(char.weapons)).toBe(true)
        expect(Array.isArray(char.buffs)).toBe(true)
        expect(Array.isArray(char.skills)).toBe(true)

        for (const w of char.weapons) {
          expect(typeof w.id).toBe('string')
          expect(typeof w.name).toBe('string')
          expect(Array.isArray(w.attackBonus)).toBe(true)
          expect(typeof w.damageDice).toBe('string')
        }

        for (const b of char.buffs) {
          expect(typeof b.id).toBe('string')
          expect(typeof b.name).toBe('string')
          expect(typeof b.attackMod).toBe('number')
          expect(typeof b.damageMod).toBe('number')
          expect(typeof b.acMod).toBe('number')
        }
      })
    })
  }

  describe('Mariano Cardamomo Level 5 specific checks', () => {
    const raw = fs.readFileSync(path.join(dataDir, 'mariano-cardamomo.json'), 'utf8')
    const mariano = JSON.parse(raw) as FullCharacter

    it('has level 5 and 47 HP', () => {
      expect(mariano.level).toBe(5)
      expect(mariano.maxHp).toBe(47)
    })

    it('has sneak attack +3d6 in buffs', () => {
      const sa = mariano.buffs.find((b) => b.id === 'sneak-attack')
      expect(sa).toBeDefined()
      expect(sa?.extraDamageDice).toBe('3d6')
      expect(sa?.name).toContain('3d6')
    })

    it('has 60 total skill ranks allocated across skills', () => {
      const totalRanks = mariano.skills.reduce((sum, s) => sum + s.ranks, 0)
      expect(totalRanks).toBe(60)
    })

    it('models Vanish as a 2/day SLA and Acid Splash as at-will', () => {
      const vanish = mariano.spells.find((s) => s.id === 'vanish')
      const acidSplash = mariano.spells.find((s) => s.id === 'acid-splash')
      expect(vanish?.source).toBe('sla')
      expect(vanish?.resourceId).toBe('major-magic-vanish')
      expect(acidSplash?.atWill).toBe(true)
      expect(mariano.spellSlots).toHaveLength(0)
      expect(mariano.dailyResources.find((r) => r.id === 'major-magic-vanish')?.total).toBe(2)
    })

    it('has Major Magic and Rogue\'s Edge features', () => {
      expect(mariano.feats.some((f) => f.id === 'major-magic')).toBe(true)
      expect(mariano.feats.some((f) => f.id === 'rogues-edge')).toBe(true)
      expect(mariano.classAbilities.some((ca) => ca.id === 'rogues-edge-ca')).toBe(true)
      expect(mariano.classAbilities.some((ca) => ca.id === 'major-magic-ca')).toBe(true)
    })

    it('has flanking buff configured with meleeOnly', () => {
      const flanking = mariano.buffs.find((b) => b.id === 'flanking')
      expect(flanking).toBeDefined()
      expect(flanking?.meleeOnly).toBe(true)
    })
  })

  describe('Knam Level 5 specific checks', () => {
    const raw = fs.readFileSync(path.join(dataDir, 'knam.json'), 'utf8')
    const knam = JSON.parse(raw) as FullCharacter

    it('has level 5 and 66 HP', () => {
      expect(knam.level).toBe(5)
      expect(knam.maxHp).toBe(66)
    })

    it('has BAB [5], speed 40, and initiative bonus +6', () => {
      expect(knam.baseAttackBonus).toEqual([5])
      expect(knam.speed).toBe(40)
      expect(knam.initiativeBonus).toBe(6)
    })

    it('has AC 19, touch 13, and saves fort 9, ref 3, will 4', () => {
      expect(knam.armorClass.total).toBe(19)
      expect(knam.armorClass.touch).toBe(13)
      expect(knam.savingThrows.fort).toBe(9)
      expect(knam.savingThrows.ref).toBe(3)
      expect(knam.savingThrows.will).toBe(4)
    })

    it('has bloodrage rounds set to 16 in daily resources', () => {
      const rage = knam.dailyResources.find((r) => r.id === 'bloodrage-rounds')
      expect(rage).toBeDefined()
      expect(rage?.total).toBe(16)
    })

    it('has 3 1st-level spells including Ear-Piercing Scream and Burning Hands with 5d4', () => {
      expect(knam.spells.length).toBe(3)
      expect(knam.spells.some((s) => s.id === 'ear-piercing-scream')).toBe(true)
      const bh = knam.spells.find((s) => s.id === 'burning-hands-k')
      expect(bh?.damageDice).toBe('5d4')
    })

    it('has Masterwork Earth Breaker with attack bonus +10', () => {
      const eb = knam.weapons.find((w) => w.id === 'earth-breaker')
      expect(eb).toBeDefined()
      expect(eb?.attackBonus).toEqual([10])
    })

    it('has Improved Uncanny Dodge feature', () => {
      expect(knam.classAbilities.some((ca) => ca.id === 'improved-uncanny-dodge')).toBe(true)
    })
  })

  describe('Agelmund Level 5 specific checks', () => {
    const raw = fs.readFileSync(path.join(dataDir, 'agelmund.json'), 'utf8')
    const agelmund = JSON.parse(raw) as FullCharacter

    it('has level 5 and 48 HP', () => {
      expect(agelmund.level).toBe(5)
      expect(agelmund.maxHp).toBe(48)
    })

    it('has BAB [5] and speed 40', () => {
      expect(agelmund.baseAttackBonus).toEqual([5])
      expect(agelmund.speed).toBe(40)
    })

    it('has AC 17, touch 17, flat-footed 14', () => {
      expect(agelmund.armorClass.total).toBe(17)
      expect(agelmund.armorClass.touch).toBe(17)
      expect(agelmund.armorClass.flatFooted).toBe(14)
    })

    it('has Unarmed Strike flurry +10/+10', () => {
      const strike = agelmund.weapons.find((w) => w.id === 'unarmed-strike')
      expect(strike).toBeDefined()
      expect(strike?.attackBonus).toEqual([10, 10])
    })

    it('has Stunning Fist with 5 daily uses and stamina pool of 7', () => {
      const sf = agelmund.dailyResources.find((r) => r.id === 'stunning-fist')
      expect(sf).toBeDefined()
      expect(sf?.total).toBe(5)
      const sp = agelmund.dailyResources.find((r) => r.id === 'stamina-pool')
      expect(sp).toBeDefined()
      expect(sp?.total).toBe(7)
    })

    it('has Purity of Body and Defensive Spin style strike', () => {
      expect(agelmund.classAbilities.some((ca) => ca.id === 'purity-of-body')).toBe(true)
      expect(agelmund.classAbilities.some((ca) => ca.id === 'style-strike')).toBe(true)
      expect(agelmund.feats.some((f) => f.id === 'defensive-spin')).toBe(true)
    })

    it('has defensive-spin buff configured with +4 AC', () => {
      const spin = agelmund.buffs.find((b) => b.id === 'defensive-spin')
      expect(spin).toBeDefined()
      expect(spin?.acMod).toBe(4)
    })
  })

  describe('Combat buff meleeOnly restrictions for ranged weapon characters', () => {
    it('sample-kaelen has power-attack configured as meleeOnly', () => {
      const raw = fs.readFileSync(path.join(dataDir, 'sample-kaelen.json'), 'utf8')
      const kaelen = JSON.parse(raw) as FullCharacter
      const pa = kaelen.buffs.find((b) => b.id === 'power-attack')
      expect(pa).toBeDefined()
      expect(pa?.meleeOnly).toBe(true)
    })

    it('sample-valerius has power-attack configured as meleeOnly', () => {
      const raw = fs.readFileSync(path.join(dataDir, 'sample-valerius.json'), 'utf8')
      const valerius = JSON.parse(raw) as FullCharacter
      const pa = valerius.buffs.find((b) => b.id === 'power-attack')
      expect(pa).toBeDefined()
      expect(pa?.meleeOnly).toBe(true)
    })

    it('knam has power-attack configured as meleeOnly', () => {
      const raw = fs.readFileSync(path.join(dataDir, 'knam.json'), 'utf8')
      const knam = JSON.parse(raw) as FullCharacter
      const pa = knam.buffs.find((b) => b.id === 'power-attack')
      expect(pa).toBeDefined()
      expect(pa?.meleeOnly).toBe(true)
    })
  })
})
