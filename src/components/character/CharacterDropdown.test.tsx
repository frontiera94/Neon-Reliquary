// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CharacterDropdown } from './CharacterDropdown'
import { TopBar } from '../layout/TopBar'
import { useCharacterStore } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'
import type { FullCharacter } from '../../store/useCharacterStore'

const mockChar1: FullCharacter = {
  id: 'mazikeen-noctis',
  name: 'Mazikeen Noctis',
  class: 'Witch',
  level: 6,
  race: 'Tiefling',
  alignment: 'Chaotic Neutral',
  maxHp: 44,
  initiativeBonus: 6,
  speed: 30,
  abilities: { str: 10, dex: 16, con: 14, int: 20, wis: 12, cha: 10 },
  armorClass: {
    total: 16,
    touch: 13,
    flatFooted: 13,
    armorBonus: 3,
    shieldBonus: 0,
    dexBonus: 3,
    naturalArmor: 0,
    deflection: 0,
    misc: 0,
    spellFailureChance: 0,
  },
  baseAttackBonus: [3],
  savingThrows: {
    fort: 4,
    ref: 5,
    will: 6,
    fortBase: 2,
    refBase: 2,
    willBase: 5,
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

const mockChar2: FullCharacter = {
  id: 'shotrix-blackburn',
  name: 'Shotrix Blackburn',
  class: 'Magus',
  level: 6,
  race: 'Human',
  alignment: 'Neutral Good',
  maxHp: 52,
  initiativeBonus: 4,
  speed: 30,
  abilities: { str: 12, dex: 18, con: 14, int: 16, wis: 10, cha: 10 },
  armorClass: {
    total: 18,
    touch: 14,
    flatFooted: 14,
    armorBonus: 4,
    shieldBonus: 0,
    dexBonus: 4,
    naturalArmor: 0,
    deflection: 0,
    misc: 0,
    spellFailureChance: 0,
  },
  baseAttackBonus: [4],
  savingThrows: {
    fort: 7,
    ref: 6,
    will: 5,
    fortBase: 5,
    refBase: 2,
    willBase: 5,
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

const mockChar3: FullCharacter = {
  id: 'knam',
  name: 'Knam',
  class: 'Bloodrager',
  level: 6,
  race: 'Half-Orc',
  alignment: 'Chaotic Good',
  maxHp: 68,
  initiativeBonus: 2,
  speed: 40,
  abilities: { str: 20, dex: 14, con: 16, int: 8, wis: 12, cha: 12 },
  armorClass: {
    total: 17,
    touch: 12,
    flatFooted: 15,
    armorBonus: 5,
    shieldBonus: 0,
    dexBonus: 2,
    naturalArmor: 0,
    deflection: 0,
    misc: 0,
    spellFailureChance: 0,
  },
  baseAttackBonus: [6],
  savingThrows: {
    fort: 8,
    ref: 4,
    will: 3,
    fortBase: 5,
    refBase: 2,
    willBase: 2,
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

describe('CharacterDropdown Component', () => {
  beforeEach(() => {
    useCharacterStore.setState({
      characters: [mockChar1, mockChar2, mockChar3],
      activeCharacterId: 'mazikeen-noctis',
    })
    useSessionStore.setState({
      sessions: {
        'mazikeen-noctis': {
          characterId: 'mazikeen-noctis',
          currentHp: 44,
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

  it('renders closed trigger by default with active character symbol and switcher label', () => {
    render(
      <MemoryRouter>
        <CharacterDropdown />
      </MemoryRouter>
    )

    const trigger = screen.getByTestId('character-dropdown-trigger')
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger.querySelector('svg')).toBeInTheDocument() // Active character SVG emblem
    expect(screen.queryByTestId('character-dropdown-menu')).not.toBeInTheDocument()
  })

  it('toggles dropdown menu on click', () => {
    render(
      <MemoryRouter>
        <CharacterDropdown />
      </MemoryRouter>
    )

    const trigger = screen.getByTestId('character-dropdown-trigger')
    fireEvent.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const menu = screen.getByTestId('character-dropdown-menu')
    expect(menu).toBeInTheDocument()

    // Clicking trigger again closes it
    fireEvent.click(trigger)
    expect(screen.queryByTestId('character-dropdown-menu')).not.toBeInTheDocument()
  })

  it('renders all characters in dropdown with ONLY name and symbol ("nome e simbolo e basta")', () => {
    render(
      <MemoryRouter>
        <CharacterDropdown />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByTestId('character-dropdown-trigger'))

    const menu = screen.getByTestId('character-dropdown-menu')
    expect(menu).toBeInTheDocument()

    // All characters are present
    const option1 = screen.getByTestId('character-dropdown-option-mazikeen-noctis')
    const option2 = screen.getByTestId('character-dropdown-option-shotrix-blackburn')
    const option3 = screen.getByTestId('character-dropdown-option-knam')

    expect(option1).toBeInTheDocument()
    expect(option2).toBeInTheDocument()
    expect(option3).toBeInTheDocument()

    // Each option contains an SVG emblem (simbolo) and character name (nome)
    expect(option1.querySelector('svg')).toBeInTheDocument()
    expect(within(option1).getByText('Mazikeen Noctis')).toBeInTheDocument()

    expect(option2.querySelector('svg')).toBeInTheDocument()
    expect(within(option2).getByText('Shotrix Blackburn')).toBeInTheDocument()

    expect(option3.querySelector('svg')).toBeInTheDocument()
    expect(within(option3).getByText('Knam')).toBeInTheDocument()

    // "e basta": do NOT render class, level, stats or HP in the dropdown options
    expect(within(menu).queryByText(/Witch/i)).not.toBeInTheDocument()
    expect(within(menu).queryByText(/Magus/i)).not.toBeInTheDocument()
    expect(within(menu).queryByText(/Bloodrager/i)).not.toBeInTheDocument()
    expect(within(menu).queryByText(/Lv|Level/i)).not.toBeInTheDocument()
    expect(within(menu).queryByText(/HP/i)).not.toBeInTheDocument()
  })

  it('selects a character when clicked, updates session and closes the dropdown', () => {
    const initSessionSpy = vi.spyOn(useSessionStore.getState(), 'initSession')

    render(
      <MemoryRouter>
        <CharacterDropdown />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByTestId('character-dropdown-trigger'))

    const shotrixOption = screen.getByTestId('character-dropdown-option-shotrix-blackburn')
    fireEvent.click(shotrixOption)

    // Active character updated in store
    expect(useCharacterStore.getState().activeCharacterId).toBe('shotrix-blackburn')
    expect(initSessionSpy).toHaveBeenCalledWith('shotrix-blackburn', 52)

    // Dropdown closed
    expect(screen.queryByTestId('character-dropdown-menu')).not.toBeInTheDocument()
  })

  it('closes dropdown when clicking outside', () => {
    render(
      <MemoryRouter>
        <div>
          <button data-testid="outside-element">Outside</button>
          <CharacterDropdown />
        </div>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByTestId('character-dropdown-trigger'))
    expect(screen.getByTestId('character-dropdown-menu')).toBeInTheDocument()

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside-element'))
    expect(screen.queryByTestId('character-dropdown-menu')).not.toBeInTheDocument()
  })

  it('closes dropdown when Escape key is pressed', () => {
    render(
      <MemoryRouter>
        <CharacterDropdown />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByTestId('character-dropdown-trigger'))
    expect(screen.getByTestId('character-dropdown-menu')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('character-dropdown-menu')).not.toBeInTheDocument()
  })

  it('switches character seamlessly within TopBar and updates HUD state', () => {
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    )

    // Initial character in TopBar is Mazikeen Noctis
    expect(screen.getByText('Mazikeen Noctis')).toBeInTheDocument()

    // Open dropdown via trigger in TopBar
    const trigger = screen.getByTestId('character-dropdown-trigger')
    fireEvent.click(trigger)

    // Select Knam
    const knamOption = screen.getByTestId('character-dropdown-option-knam')
    fireEvent.click(knamOption)

    // TopBar now shows Knam!
    expect(useCharacterStore.getState().activeCharacterId).toBe('knam')
    expect(screen.getByText('Knam')).toBeInTheDocument()
    expect(screen.getByText(/Level 6 Bloodrager/i)).toBeInTheDocument()
  })

  it('displays character name and level statically without dropdown trigger in Left Cockpit of TopBar', () => {
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    )

    expect(screen.getByText('Mazikeen Noctis')).toBeInTheDocument()
    expect(screen.getByText(/Level 6 Witch/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Toggle character dropdown')).not.toBeInTheDocument()
  })
})
