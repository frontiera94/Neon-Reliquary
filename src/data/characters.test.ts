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

    it('has Vanish and Acid Splash with 1st-level spell slot', () => {
      expect(mariano.spells.some((s) => s.id === 'vanish')).toBe(true)
      expect(mariano.spells.some((s) => s.id === 'acid-splash')).toBe(true)
      expect(mariano.spellSlots.find((s) => s.level === 1)?.total).toBe(2)
    })

    it('has Major Magic and Rogue\'s Edge features', () => {
      expect(mariano.feats.some((f) => f.id === 'major-magic')).toBe(true)
      expect(mariano.feats.some((f) => f.id === 'rogues-edge')).toBe(true)
      expect(mariano.classAbilities.some((ca) => ca.id === 'rogues-edge-ca')).toBe(true)
      expect(mariano.classAbilities.some((ca) => ca.id === 'major-magic-ca')).toBe(true)
    })
  })
})
