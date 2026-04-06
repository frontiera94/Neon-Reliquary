import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Character } from '../types/character'
import type { ArmorClass, SavingThrow } from '../types/defense'
import type { Skill } from '../types/skills'
import type { Weapon, BuffToggle } from '../types/combat'
import type { DailyResource, SpellSlot, Spell } from '../types/resources'
import type { Feat, ClassAbility } from '../types/features'

export interface FullCharacter extends Character {
  armorClass: ArmorClass
  savingThrows: SavingThrow
  skills: Skill[]
  weapons: Weapon[]
  buffs: BuffToggle[]
  dailyResources: DailyResource[]
  feats: Feat[]
  classAbilities: ClassAbility[]
  spellSlots: SpellSlot[]
  spells: Spell[]
}

interface CharacterStore {
  characters: FullCharacter[]
  activeCharacterId: string | null
  setActiveCharacter: (id: string) => void
  loadCharacter: (c: FullCharacter) => void
  removeCharacter: (id: string) => void
  activeCharacter: () => FullCharacter | null
}

export const useCharacterStore = create<CharacterStore>()(
  persist(
    (set, get) => ({
      characters: [],
      activeCharacterId: null,
      setActiveCharacter: (id) => set({ activeCharacterId: id }),
      loadCharacter: (c) =>
        set((state) => ({
          characters: state.characters.find((x) => x.id === c.id)
            ? state.characters.map((x) => (x.id === c.id ? c : x))
            : [...state.characters, c],
        })),
      removeCharacter: (id) =>
        set((state) => ({
          characters: state.characters.filter((x) => x.id !== id),
          activeCharacterId: state.activeCharacterId === id ? null : state.activeCharacterId,
        })),
      activeCharacter: () => {
        const { characters, activeCharacterId } = get()
        return characters.find((c) => c.id === activeCharacterId) ?? null
      },
    }),
    { name: 'neon-characters' }
  )
)
