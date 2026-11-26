import { describe, it, expect } from 'vitest'
import {
  classifyActionEconomy,
  getDefensiveBadges,
  categorizeFeatures,
} from './action-economy'
import type { FullCharacter } from '../store/useCharacterStore'
import type { SessionState } from '../types/session'
import agelmundJson from '../data/agelmund.json'
import marianoJson from '../data/mariano-cardamomo.json'

const agelmund = agelmundJson as unknown as FullCharacter
const mariano = marianoJson as unknown as FullCharacter

const baseSession: SessionState = {
  characterId: 'agelmund',
  currentHp: 40,
  tempHp: 0,
  nonlethalDamage: 0,
  spentResources: { 'ki-pool': 2 },
  activeBuffIds: [],
  conditions: [],
  preparedSpellIds: [],
  preparedSpells: {},
  spentSpellSlots: {},
  ammo: {},
  activeSummon: null,
  customBuffs: [],
  itemQuantities: {},
  coins: { gp: 0, sp: 0, cp: 0 },
}

describe('action-economy', () => {
  it('classifies English and Italian PF1e action economy strings in priority order', () => {
    expect(classifyActionEconomy('As an immediate action, deflect')).toBe('immediate')
    expect(classifyActionEconomy('Come azione immediata')).toBe('immediate')
    expect(classifyActionEconomy('Uses a full-round action or Flurry of Blows')).toBe('full-round')
    expect(classifyActionEconomy('Azione di round completo')).toBe('full-round')
    expect(classifyActionEconomy('Spend 1 point from Ki Pool as a swift action')).toBe('swift')
    expect(classifyActionEconomy('Cackle extends hexes as a move action')).toBe('move')
    expect(classifyActionEconomy('Activate as a standard action')).toBe('standard')
    expect(classifyActionEconomy('Permanent passive bonus')).toBe('passive')
  })

  it('extracts defensive badges and racial defenses without duplicates', () => {
    const monkBadges = getDefensiveBadges(agelmund)
    expect(monkBadges.some((b) => /evasion|dodge|still mind|monk ac/i.test(b.name))).toBe(true)

    const halflingBadges = getDefensiveBadges(mariano)
    expect(halflingBadges.some((b) => b.id === 'racial-halfling-luck')).toBe(true)
  })

  it('categorizes character feats and class abilities with remaining resource uses', () => {
    const features = categorizeFeatures(agelmund, baseSession)
    expect(features.length).toBe(agelmund.feats.length + agelmund.classAbilities.length)
    const kiFeature = features.find((f) => /ki pool/i.test(f.name))
    if (kiFeature && kiFeature.maxUses !== undefined) {
      expect(kiFeature.remainingUses).toBe(Math.max(0, kiFeature.maxUses - 2))
    }
  })
})
