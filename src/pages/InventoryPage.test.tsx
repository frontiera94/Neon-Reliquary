// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InventoryPage } from './InventoryPage'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import type { FullCharacter } from '../store/useCharacterStore'
import type { InventoryItem } from '../types/inventory'

const sampleInventory: InventoryItem[] = [
  {
    id: 'potion-clw',
    name: 'Potion of Cure Light Wounds (1d8+1)',
    description: 'Heals 1d8+1 hit points when drunk.',
    category: 'consumable',
    quantity: 3,
    weight: 0.5,
  },
  {
    id: 'dagger-1',
    name: 'Masterwork Dagger',
    description: 'A finely crafted dagger.',
    category: 'weapon',
    quantity: 1,
    weight: 1.0,
    equipped: true,
  },
  {
    id: 'backpack',
    name: 'Adventurer Backpack',
    description: 'Leather backpack with pouches.',
    category: 'gear',
    quantity: 1,
    weight: 2.0,
  },
]

const testChar: FullCharacter = {
  id: 'inv-test-char',
  name: 'Inventory Tester',
  class: 'Rogue',
  level: 4,
  race: 'Human',
  alignment: 'Neutral',
  maxHp: 30,
  initiativeBonus: 3,
  speed: 30,
  abilities: { str: 10, dex: 16, con: 12, int: 14, wis: 10, cha: 12 },
  armorClass: {
    total: 15,
    touch: 13,
    flatFooted: 12,
    armorBonus: 2,
    shieldBonus: 0,
    dexBonus: 3,
    naturalArmor: 0,
    deflection: 0,
    misc: 0,
    spellFailureChance: 0,
  },
  baseAttackBonus: [3],
  savingThrows: { fort: 2, ref: 7, will: 1, fortBase: 1, refBase: 4, willBase: 1 },
  skills: [],
  feats: [],
  weapons: [],
  buffs: [],
  dailyResources: [],
  classAbilities: [],
  spellSlots: [],
  spells: [],
  inventory: sampleInventory,
}

describe('InventoryPage', () => {
  beforeEach(() => {
    useCharacterStore.setState({
      characters: [testChar],
      activeCharacterId: 'inv-test-char',
    })
    useSessionStore.setState({
      sessions: {
        'inv-test-char': {
          characterId: 'inv-test-char',
          currentHp: 30,
          tempHp: 0,
          nonlethalDamage: 0,
          conditions: [],
          spentResources: {},
          preparedSpellIds: [],
          spentSpellSlots: {},
          activeBuffIds: [],
          customBuffs: [],
          customItems: [],
          ammo: {},
          activeSummon: null,
          itemQuantities: {
            'potion-clw': 3,
            'dagger-1': 1,
            'backpack': 1,
          },
          equippedItemIds: ['dagger-1'],
          coins: { gp: 50, sp: 20, cp: 10 },
        },
      },
    })
  })

  it('renders inventory items, coins, and total weight', () => {
    render(<InventoryPage />)

    expect(screen.getByText('Potion of Cure Light Wounds (1d8+1)')).toBeInTheDocument()
    expect(screen.getByText('Masterwork Dagger')).toBeInTheDocument()
    expect(screen.getByText('Adventurer Backpack')).toBeInTheDocument()
    // 3 * 0.5 + 1 * 1.0 + 1 * 2.0 = 4.5 lbs
    expect(screen.getByText(/4\.5 lbs/i)).toBeInTheDocument()
  })

  it('filters items by search input', () => {
    render(<InventoryPage />)
    const searchInput = screen.getByPlaceholderText(/cerca oggetti/i)
    fireEvent.change(searchInput, { target: { value: 'potion' } })

    expect(screen.getByText('Potion of Cure Light Wounds (1d8+1)')).toBeInTheDocument()
    expect(screen.queryByText('Masterwork Dagger')).not.toBeInTheDocument()
  })

  it('filters items by category chip', () => {
    render(<InventoryPage />)
    const weaponsChip = screen.getByRole('button', { name: /weapons/i })
    fireEvent.click(weaponsChip)

    expect(screen.getByText('Masterwork Dagger')).toBeInTheDocument()
    expect(screen.queryByText('Potion of Cure Light Wounds (1d8+1)')).not.toBeInTheDocument()
  })

  it('uses consumable item: decrements quantity and opens dice roll if formula found', () => {
    let rollOpened = false
    useDiceStore.setState({
      openRoll: (roll) => {
        rollOpened = true
        expect(roll.diceType).toBe(8)
        expect(roll.count).toBe(1)
        expect(roll.modifier).toBe(1)
      },
    })

    render(<InventoryPage />)
    const useBtn = screen.getByRole('button', { name: /usa/i })
    fireEvent.click(useBtn)

    expect(rollOpened).toBe(true)
    const sess = useSessionStore.getState().getSession('inv-test-char')
    expect(sess.itemQuantities['potion-clw']).toBe(2)
  })

  it('allows adding and removing custom loot items', () => {
    render(<InventoryPage />)

    const addBtn = screen.getByRole('button', { name: /\+ aggiungi loot/i })
    fireEvent.click(addBtn)

    expect(screen.getByText('Aggiungi Loot / Oggetto')).toBeInTheDocument()

    const nameInput = screen.getByPlaceholderText(/es\. pozione di cura/i)
    fireEvent.change(nameInput, { target: { value: 'Antitoxin' } })

    const saveBtn = screen.getByRole('button', { name: /salva loot|save loot/i })
    fireEvent.click(saveBtn)

    expect(screen.getByText('Antitoxin')).toBeInTheDocument()

    const sess = useSessionStore.getState().getSession('inv-test-char')
    expect(sess.customItems?.some((i) => i.name === 'Antitoxin')).toBe(true)

    // Remove the loot item
    const removeBtn = screen.getByRole('button', { name: /rimuovi antitoxin/i })
    fireEvent.click(removeBtn)

    expect(screen.queryByText('Antitoxin')).not.toBeInTheDocument()
  })

  it('adjusts baseline item quantity correctly from uninitialized session state (does not drop to 0 or 1)', () => {
    // Clear itemQuantities map so it simulates a fresh un-persisted session
    useSessionStore.setState({
      sessions: {
        'inv-test-char': {
          ...useSessionStore.getState().getSession('inv-test-char'),
          itemQuantities: {},
        },
      },
    })

    render(<InventoryPage />)

    // Potion has default quantity 3. Clicking "Usa" should decrement to 2, not drop to 0!
    const useBtn = screen.getByRole('button', { name: /usa/i })
    fireEvent.click(useBtn)

    const sess = useSessionStore.getState().getSession('inv-test-char')
    expect(sess.itemQuantities['potion-clw']).toBe(2)

    // Backpack has default quantity 1. Clicking "+" should increment to 2, not jump to 1 from 0!
    const incBtn = screen.getByRole('button', { name: /increase adventurer backpack quantity/i })
    fireEvent.click(incBtn)
    expect(useSessionStore.getState().getSession('inv-test-char').itemQuantities['backpack']).toBe(2)
  })

  it('filters specifically by custom loot when Loot / Custom filter pill is selected', () => {
    useSessionStore.setState({
      sessions: {
        'inv-test-char': {
          ...useSessionStore.getState().getSession('inv-test-char'),
          customItems: [
            {
              id: 'custom-scroll-1',
              name: 'Scroll of Fireball',
              description: 'A magical scroll',
              category: 'consumable',
              quantity: 1,
            },
          ],
        },
      },
    })

    render(<InventoryPage />)

    // Custom pill should be visible
    const customPill = screen.getByRole('button', { name: /loot \/ custom/i })
    expect(customPill).toBeInTheDocument()

    // Click custom pill
    fireEvent.click(customPill)

    // Only custom item should be displayed
    expect(screen.getByText('Scroll of Fireball')).toBeInTheDocument()
    expect(screen.queryByText('Masterwork Dagger')).not.toBeInTheDocument()
    expect(screen.queryByText('Potion of Cure Light Wounds (1d8+1)')).not.toBeInTheDocument()
  })
})
