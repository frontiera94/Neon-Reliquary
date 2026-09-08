// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CombatPage } from './CombatPage'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import type { FullCharacter } from '../store/useCharacterStore'

const combatChar: FullCharacter = {
  id: 'combat-test-char',
  name: 'Mazikeen Test',
  class: 'Magus (Kensai)',
  level: 4,
  race: 'Tiefling',
  alignment: 'True Neutral',
  maxHp: 38,
  initiativeBonus: 7,
  speed: 30,
  abilities: { str: 10, dex: 18, con: 14, int: 18, wis: 12, cha: 8 },
  armorClass: {
    total: 18,
    touch: 14,
    flatFooted: 14,
    armorBonus: 0,
    shieldBonus: 0,
    dexBonus: 4,
    naturalArmor: 0,
    deflection: 0,
    misc: 4,
    spellFailureChance: 0,
  },
  baseAttackBonus: [3],
  savingThrows: { fort: 6, ref: 5, will: 5, fortBase: 4, refBase: 1, willBase: 4 },
  skills: [],
  feats: [{ id: 'feat-weapon-finesse', index: 0, name: 'Weapon Finesse', shortDesc: 'Use Dex for attack', fullDesc: 'Use Dex for attack' }],
  weapons: [
    {
      id: 'weap-scimitar',
      name: '+1 Scimitar',
      type: 'melee',
      attackBonus: [8],
      damageDice: '1d6',
      damageBonus: 5,
      critRange: 18,
      critMultiplier: 2,
      tags: ['Light', 'Finesse'],
    },
  ],
  buffs: [
    {
      id: 'buff-power-attack',
      name: 'Power Attack',
      description: 'Trade attack bonus for damage',
      active: false,
      attackMod: -1,
      damageMod: 2,
      acMod: 0,
      meleeOnly: true,
      color: 'secondary',
    },
    {
      id: 'buff-twf',
      name: 'Two-Weapon Fighting',
      description: 'Fight with two weapons',
      active: false,
      attackMod: -2,
      damageMod: 0,
      acMod: 0,
      isTwf: true,
      color: 'primary',
    },
  ],
  dailyResources: [],
  classAbilities: [],
  spellSlots: [],
  spells: [],
  inventory: [],
}

describe('CombatPage component', () => {
  beforeEach(() => {
    useCharacterStore.setState({
      characters: [combatChar],
      activeCharacterId: 'combat-test-char',
    })
    useSessionStore.setState({
      sessions: {
        'combat-test-char': {
          characterId: 'combat-test-char',
          currentHp: 38,
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

  it('renders "No character selected" if activeCharacter is null', () => {
    useCharacterStore.setState({ activeCharacterId: null })

    render(
      <MemoryRouter>
        <CombatPage />
      </MemoryRouter>
    )

    expect(screen.getByText('No character selected')).toBeInTheDocument()
  })

  it('renders weapons and combat buffs for the active character', () => {
    render(
      <MemoryRouter>
        <CombatPage />
      </MemoryRouter>
    )

    expect(screen.getByText('+1 Scimitar')).toBeInTheDocument()
    expect(screen.getByText('Power Attack')).toBeInTheDocument()
    expect(screen.getByText('Two-Weapon Fighting')).toBeInTheDocument()
    expect(screen.getByText('+8')).toBeInTheDocument()
  })

  it('toggles buff on click and modifies weapon attack bonus', () => {
    render(
      <MemoryRouter>
        <CombatPage />
      </MemoryRouter>
    )

    const powerAttackBtn = screen.getByText('Power Attack').closest('button')
    expect(powerAttackBtn).not.toBeNull()
    fireEvent.click(powerAttackBtn!)

    // Power attack applies -1 to attack bonus (+8 -> +7)
    const session = useSessionStore.getState().getSession('combat-test-char')
    expect(session.activeBuffIds).toContain('buff-power-attack')
    expect(screen.getByText('+7')).toBeInTheDocument()
  })

  it('reveals offhand attack button when Two-Weapon Fighting is active', () => {
    render(
      <MemoryRouter>
        <CombatPage />
      </MemoryRouter>
    )

    // Off-hand button should not be present initially
    expect(screen.queryByText('Off-hand')).not.toBeInTheDocument()

    // Activate Two-Weapon Fighting buff
    const twfBtn = screen.getByText('Two-Weapon Fighting').closest('button')
    fireEvent.click(twfBtn!)

    // Off-hand button should now be rendered
    expect(screen.getByText('Off-hand')).toBeInTheDocument()
  })
})
