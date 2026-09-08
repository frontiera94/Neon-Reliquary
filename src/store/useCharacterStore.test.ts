import { describe, it, expect, beforeEach } from 'vitest'
import { useCharacterStore, type FullCharacter } from './useCharacterStore'

function createFakeCharacter(id: string, name: string): FullCharacter {
  return {
    id,
    name,
    class: 'Fighter',
    level: 5,
    race: 'Human',
    alignment: 'Neutral Good',
    abilities: { str: 18, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    maxHp: 45,
    speed: 30,
    initiativeBonus: 2,
    baseAttackBonus: [5],
    armorClass: {
      total: 18,
      touch: 12,
      flatFooted: 16,
      armorBonus: 6,
      shieldBonus: 0,
      dexBonus: 2,
      naturalArmor: 0,
      deflection: 0,
      misc: 0,
      spellFailureChance: 0,
    },
    savingThrows: {
      fort: 6,
      ref: 3,
      will: 2,
      fortBase: 4,
      refBase: 1,
      willBase: 1,
    },
    skills: [],
    weapons: [],
    buffs: [],
    dailyResources: [],
    feats: [],
    classAbilities: [],
    spellSlots: [],
    spells: [],
    inventory: [],
  }
}

describe('useCharacterStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useCharacterStore.setState({ characters: [], activeCharacterId: null })
  })

  describe('initial state', () => {
    it('starts with empty characters array and null activeCharacterId', () => {
      const state = useCharacterStore.getState()
      expect(state.characters).toEqual([])
      expect(state.activeCharacterId).toBeNull()
      expect(state.activeCharacter()).toBeNull()
    })
  })

  describe('loadCharacter', () => {
    it('adds a new character to the characters list', () => {
      const c1 = createFakeCharacter('char-1', 'Valerius')
      useCharacterStore.getState().loadCharacter(c1)

      const state = useCharacterStore.getState()
      expect(state.characters).toHaveLength(1)
      expect(state.characters[0].name).toBe('Valerius')
    })

    it('updates an existing character when ID matches', () => {
      const c1 = createFakeCharacter('char-1', 'Valerius')
      useCharacterStore.getState().loadCharacter(c1)

      const c1Updated = { ...c1, name: 'Sir Valerius', maxHp: 55 }
      useCharacterStore.getState().loadCharacter(c1Updated)

      const state = useCharacterStore.getState()
      expect(state.characters).toHaveLength(1)
      expect(state.characters[0].name).toBe('Sir Valerius')
      expect(state.characters[0].maxHp).toBe(55)
    })

    it('can load multiple distinct characters', () => {
      const c1 = createFakeCharacter('char-1', 'Valerius')
      const c2 = createFakeCharacter('char-2', 'Kaelen')
      useCharacterStore.getState().loadCharacter(c1)
      useCharacterStore.getState().loadCharacter(c2)

      const state = useCharacterStore.getState()
      expect(state.characters).toHaveLength(2)
      expect(state.characters.map((c) => c.id)).toEqual(['char-1', 'char-2'])
    })
  })

  describe('setActiveCharacter and activeCharacter()', () => {
    it('sets activeCharacterId and activeCharacter() returns the matching character', () => {
      const c1 = createFakeCharacter('char-1', 'Valerius')
      const c2 = createFakeCharacter('char-2', 'Kaelen')
      useCharacterStore.getState().loadCharacter(c1)
      useCharacterStore.getState().loadCharacter(c2)

      useCharacterStore.getState().setActiveCharacter('char-2')

      const state = useCharacterStore.getState()
      expect(state.activeCharacterId).toBe('char-2')
      expect(state.activeCharacter()).toEqual(c2)
    })

    it('returns null when activeCharacterId does not exist in characters', () => {
      useCharacterStore.getState().setActiveCharacter('nonexistent')
      expect(useCharacterStore.getState().activeCharacter()).toBeNull()
    })
  })

  describe('removeCharacter', () => {
    it('removes the specified character from the list', () => {
      const c1 = createFakeCharacter('char-1', 'Valerius')
      const c2 = createFakeCharacter('char-2', 'Kaelen')
      useCharacterStore.getState().loadCharacter(c1)
      useCharacterStore.getState().loadCharacter(c2)

      useCharacterStore.getState().removeCharacter('char-1')

      const state = useCharacterStore.getState()
      expect(state.characters).toHaveLength(1)
      expect(state.characters[0].id).toBe('char-2')
    })

    it('resets activeCharacterId to null if the removed character was active', () => {
      const c1 = createFakeCharacter('char-1', 'Valerius')
      useCharacterStore.getState().loadCharacter(c1)
      useCharacterStore.getState().setActiveCharacter('char-1')

      useCharacterStore.getState().removeCharacter('char-1')

      const state = useCharacterStore.getState()
      expect(state.activeCharacterId).toBeNull()
      expect(state.activeCharacter()).toBeNull()
    })

    it('preserves activeCharacterId if a different character is removed', () => {
      const c1 = createFakeCharacter('char-1', 'Valerius')
      const c2 = createFakeCharacter('char-2', 'Kaelen')
      useCharacterStore.getState().loadCharacter(c1)
      useCharacterStore.getState().loadCharacter(c2)
      useCharacterStore.getState().setActiveCharacter('char-2')

      useCharacterStore.getState().removeCharacter('char-1')

      const state = useCharacterStore.getState()
      expect(state.activeCharacterId).toBe('char-2')
      expect(state.activeCharacter()?.id).toBe('char-2')
    })

    it('is a no-op if character ID is not in store', () => {
      const c1 = createFakeCharacter('char-1', 'Valerius')
      useCharacterStore.getState().loadCharacter(c1)
      useCharacterStore.getState().setActiveCharacter('char-1')

      useCharacterStore.getState().removeCharacter('unknown-id')

      const state = useCharacterStore.getState()
      expect(state.characters).toHaveLength(1)
      expect(state.activeCharacterId).toBe('char-1')
    })
  })
})
