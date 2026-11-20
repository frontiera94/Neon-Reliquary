import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import type { FullCharacter } from '../store/useCharacterStore'
import { calcEffectiveAbilities, calcEffectiveSkills } from '../lib/stat-calc'

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

  describe('Shotrix Blackburn Level 5 specific checks', () => {
    const raw = fs.readFileSync(path.join(dataDir, 'shotrix-blackburn.json'), 'utf8')
    const shotrix = JSON.parse(raw) as FullCharacter

    it('has level 5, 54 HP, Rapier +8, and Arcane Pool +2 weapon buff', () => {
      expect(shotrix.level).toBe(5)
      expect(shotrix.maxHp).toBe(54)
      expect(shotrix.weapons.find((w) => w.id === 'rapier')?.attackBonus).toEqual([8])
      const poolBuff = shotrix.buffs.find((b) => b.id === 'arcane-pool-weapon')
      expect(poolBuff?.attackMod).toBe(2)
      expect(poolBuff?.damageMod).toBe(2)
      expect(shotrix.dailyResources.find((r) => r.id === 'arcane-pool')?.total).toBe(6)
    })

    it('allocates exactly 35 skill ranks and matches Level 5 PDF totals with ACP -1', () => {
      const totalRanks = shotrix.skills.reduce((sum, s) => sum + s.ranks, 0)
      expect(totalRanks).toBe(35)
      const effAb = calcEffectiveAbilities(shotrix.abilities, [], [])
      const computed = calcEffectiveSkills(shotrix.skills, shotrix.abilities, effAb, [], -1)
      const byId = Object.fromEntries(computed.map((s) => [s.id, s.effectiveTotal]))
      expect(byId['acrobatics']).toBe(8)
      expect(byId['bluff']).toBe(-1)
      expect(byId['diplomacy']).toBe(5)
      expect(byId['fly']).toBe(7)
      expect(byId['knowledge-arcana']).toBe(12)
      expect(byId['knowledge-planes']).toBe(8)
      expect(byId['perception']).toBe(6)
      expect(byId['spellcraft']).toBe(12)
      expect(byId['stealth']).toBe(7)
      expect(byId['swim']).toBe(1)
      expect(byId['use-magic-device']).toBe(6)
    })

    it('has Level 5 feats, scaled CL 5 spells, slots 5/3, and handwritten coins/potions', () => {
      expect(shotrix.feats.some((f) => f.id === 'intensified-spell')).toBe(true)
      expect(shotrix.feats.some((f) => f.id === 'weapon-focus-rapier')).toBe(true)
      expect(shotrix.spellSlots).toEqual([
        { level: 1, total: 5 },
        { level: 2, total: 3 },
      ])
      expect(shotrix.spells.find((s) => s.id === 'burning-hands')?.damageDice).toBe('5d4')
      expect(shotrix.spells.find((s) => s.id === 'shocking-grasp')?.damageDice).toBe('5d6')
      expect(shotrix.spells.find((s) => s.id === 'frostbite')?.damageBonus).toBe(5)
      expect(shotrix.spells.find((s) => s.id === 'magic-missile')?.damageDice).toBe('3d4')
      expect(shotrix.startingCoins).toEqual({ gp: 2106, sp: 5, cp: 1 })
      expect(shotrix.inventory.some((i) => i.id === 'sb-cure-light' && i.quantity === 1)).toBe(true)
      expect(shotrix.inventory.some((i) => i.id === 'sb-cure-mod' && i.quantity === 1)).toBe(true)
      expect(shotrix.inventory.some((i) => i.id === 'sb-tarocchi')).toBe(true)
    })
  })

  describe('Noorie Level 5 specific checks', () => {
    const raw = fs.readFileSync(path.join(dataDir, 'noorie.json'), 'utf8')
    const noorie = JSON.parse(raw) as FullCharacter

    it('has level 5, 45 HP, Natural Spell, and 5-hour Wild Shape', () => {
      expect(noorie.level).toBe(5)
      expect(noorie.maxHp).toBe(45)
      expect(noorie.feats.some((f) => f.id === 'natural-spell')).toBe(true)
      expect(noorie.feats.some((f) => f.id === 'endure-pain')).toBe(true)
      expect(noorie.feats.some((f) => f.id === 'flame-tested-survivor')).toBe(true)
      expect(noorie.dailyResources.find((r) => r.id === 'wild-shape')?.name).toContain('5 hrs')
    })

    it('allocates exactly 30 skill ranks and matches Level 5 PDF totals', () => {
      const totalRanks = noorie.skills.reduce((sum, s) => sum + s.ranks, 0)
      expect(totalRanks).toBe(30)
      const effAb = calcEffectiveAbilities(noorie.abilities, [], [])
      const computed = calcEffectiveSkills(noorie.skills, noorie.abilities, effAb, [], 0)
      const byId = Object.fromEntries(computed.map((s) => [s.id, s.effectiveTotal]))
      expect(byId['acrobatics']).toBe(7)
      expect(byId['diplomacy']).toBe(2)
      expect(byId['knowledge-local']).toBe(6)
      expect(byId['knowledge-nature']).toBe(12)
      expect(byId['perception']).toBe(13)
      expect(byId['spellcraft']).toBe(7)
      expect(byId['stealth']).toBe(10)
      expect(byId['survival']).toBe(14)
    })

    it('has Level 3 spell slots, Fireball domain spell, SNA III, PDF gear, and Level 5 Ignis', () => {
      expect(noorie.spellSlots).toEqual([
        { level: 1, total: 6 },
        { level: 2, total: 4 },
        { level: 3, total: 3 },
      ])
      const fireball = noorie.spells.find((s) => s.id === 'fireball-n')
      expect(fireball?.level).toBe(3)
      expect(fireball?.source).toBe('domain')
      expect(fireball?.alwaysPrepared).toBe(true)
      expect(fireball?.damageDice).toBe('5d6')
      const sna3 = noorie.spells.find((s) => s.id === 'summon-natures-ally-3')
      expect(sna3?.summonOptions?.length).toBeGreaterThanOrEqual(3)
      expect(noorie.startingCoins).toEqual({ gp: 55, sp: 9, cp: 0 })
      expect(noorie.companions?.[0]?.level).toBe(5)
      expect(noorie.companions?.[0]?.maxHp).toBe(32)
    })
  })

  describe('Mazikeen Noctis & Salem Level 5 specific checks', () => {
    const raw = fs.readFileSync(path.join(dataDir, 'mazikeen-noctis.json'), 'utf8')
    const maze = JSON.parse(raw) as FullCharacter

    it('has level 5, 48 HP, Flight Hex, and Flight daily resources', () => {
      expect(maze.level).toBe(5)
      expect(maze.maxHp).toBe(48)
      expect(maze.feats.some((f) => f.id === 'hex-flight')).toBe(true)
      expect(maze.dailyResources.find((r) => r.id === 'flight-fly')?.total).toBe(5)
      expect(maze.dailyResources.find((r) => r.id === 'flight-levitate')?.total).toBe(1)
    })

    it('allocates exactly 35 skill ranks and matches Level 5 PDF totals including Swim +4', () => {
      const totalRanks = maze.skills.reduce((sum, s) => sum + s.ranks, 0)
      expect(totalRanks).toBe(35)
      const effAb = calcEffectiveAbilities(maze.abilities, [], [])
      const computed = calcEffectiveSkills(maze.skills, maze.abilities, effAb, [], 0)
      const byId = Object.fromEntries(computed.map((s) => [s.id, s.effectiveTotal]))
      expect(byId['bluff']).toBe(2)
      expect(byId['diplomacy']).toBe(8)
      expect(byId['fly']).toBe(8)
      expect(byId['intimidate']).toBe(10)
      expect(byId['knowledge-arcana']).toBe(10)
      expect(byId['knowledge-religion']).toBe(9)
      expect(byId['perception']).toBe(10)
      expect(byId['spellcraft']).toBe(12)
      expect(byId['stealth']).toBe(12)
      expect(byId['swim']).toBe(4)
      expect(byId['use-magic-device']).toBe(8)
    })

    it('has Level 3 Lightning Bolt, Vomit Swarm, no Snowball, 134 gp, and Level 5 Salem', () => {
      expect(maze.spellSlots).toEqual([
        { level: 1, total: 5 },
        { level: 2, total: 3 },
        { level: 3, total: 2 },
      ])
      const lb = maze.spells.find((s) => s.id === 'lightning-bolt')
      expect(lb?.level).toBe(3)
      expect(lb?.damageDice).toBe('5d6')
      expect(maze.spells.some((s) => s.id === 'vomit-swarm')).toBe(true)
      expect(maze.spells.some((s) => s.id === 'snowball')).toBe(false)
      expect(maze.startingCoins).toEqual({ gp: 134, sp: 0, cp: 0 })

      const salem = maze.companions?.[0]
      expect(salem?.maxHp).toBe(24)
      expect(salem?.abilities.int).toBe(8)
      expect(salem?.armorClass.naturalArmor).toBe(3)
      expect(salem?.savingThrows).toEqual({ fort: 2, ref: 5, will: 5 })
      expect(salem?.skills.find((s) => s.name === 'Stealth')?.bonus).toBe(18)
      expect(salem?.skills.find((s) => s.name === 'Perception')?.bonus).toBe(9)
      expect(salem?.specialQualities.some((q) => q.name.includes('Speak with Master'))).toBe(true)
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
