// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CompanionPage } from './CompanionPage'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import type { FullCharacter } from '../store/useCharacterStore'

const testDruid: FullCharacter = {
  id: 'test-druid-companion',
  name: 'Noorie Test',
  class: 'Druid',
  level: 4,
  race: 'Human',
  alignment: 'TN',
  maxHp: 28,
  initiativeBonus: 2,
  speed: 30,
  abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 16, cha: 10 },
  armorClass: {
    total: 15,
    touch: 12,
    flatFooted: 13,
    armorBonus: 3,
    shieldBonus: 0,
    dexBonus: 2,
    naturalArmor: 0,
    deflection: 0,
    misc: 0,
    spellFailureChance: 0,
  },
  baseAttackBonus: [3],
  savingThrows: { fort: 5, ref: 3, will: 7, fortBase: 4, refBase: 1, willBase: 4 },
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

describe('CompanionPage component', () => {
  beforeEach(() => {
    useCharacterStore.setState({
      characters: [testDruid],
      activeCharacterId: 'test-druid-companion',
    })
    useSessionStore.setState({
      sessions: {
        'test-druid-companion': {
          characterId: 'test-druid-companion',
          currentHp: 28,
          tempHp: 0,
          nonlethalDamage: 0,
          conditions: [],
          spentResources: {},
          preparedSpellIds: [],
          spentSpellSlots: {},
          activeBuffIds: [],
          customBuffs: [],
          ammo: {},
          activeSummon: null,
          itemQuantities: {},
          coins: { gp: 0, sp: 0, cp: 0 },
        },
      },
    })
  })

  it('renders "Manifest a Companion" when character has no companion', () => {
    render(
      <MemoryRouter>
        <CompanionPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Manifest a Companion')).toBeInTheDocument()
    const manifestButtons = screen.getAllByRole('button', { name: /manifest/i })
    expect(manifestButtons.length).toBeGreaterThan(0)
  })

  it('renders single bonded companion bar with Replace and Dismiss buttons', () => {
    const charWithWolf: FullCharacter = {
      ...testDruid,
      companions: [
        {
          id: 'wolf-companion-1',
          name: 'Ignis',
          type: 'animal_companion',
          species: 'Wolf',
          size: 'Medium',
          maxHp: 26,
          speed: '50 ft.',
          initiativeBonus: 3,
          armorClass: { total: 17, touch: 13, flatFooted: 14 },
          savingThrows: { fort: 5, ref: 6, will: 2 },
          abilities: { str: 14, dex: 16, con: 14, int: 2, wis: 12, cha: 6 },
          baseAttackBonus: 3,
          attacks: [{ name: 'Bite', bonus: 5, damageDice: '1d6+3' }],
          skills: [],
          specialQualities: [],
        },
      ],
    }

    useCharacterStore.setState({
      characters: [charWithWolf],
      activeCharacterId: 'test-druid-companion',
    })

    render(
      <MemoryRouter>
        <CompanionPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Bonded Companion')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /replace companion/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
  })

  it('allows dismissing the companion through modal confirmation', () => {
    const charWithWolf: FullCharacter = {
      ...testDruid,
      companions: [
        {
          id: 'wolf-companion-1',
          name: 'Ignis',
          type: 'animal_companion',
          species: 'Wolf',
          size: 'Medium',
          maxHp: 26,
          speed: '50 ft.',
          initiativeBonus: 3,
          armorClass: { total: 17, touch: 13, flatFooted: 14 },
          savingThrows: { fort: 5, ref: 6, will: 2 },
          abilities: { str: 14, dex: 16, con: 14, int: 2, wis: 12, cha: 6 },
          baseAttackBonus: 3,
          attacks: [{ name: 'Bite', bonus: 5, damageDice: '1d6+3' }],
          skills: [],
          specialQualities: [],
        },
      ],
    }

    useCharacterStore.setState({
      characters: [charWithWolf],
      activeCharacterId: 'test-druid-companion',
    })

    render(
      <MemoryRouter>
        <CompanionPage />
      </MemoryRouter>
    )

    // Click Dismiss
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.getByText('Dismiss Companion?')).toBeInTheDocument()

    // Confirm Dismiss
    fireEvent.click(screen.getByRole('button', { name: /confirm dismiss/i }))

    // Character should now have 0 companions and show manifest screen
    const updatedChar = useCharacterStore.getState().characters.find((c) => c.id === 'test-druid-companion')
    expect(updatedChar?.companions?.length).toBe(0)
  })
})
