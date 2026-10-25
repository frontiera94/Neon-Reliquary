// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TacticalHUD } from './TacticalHUD'
import { useCharacterStore } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'
import { useDiceStore } from '../../store/useDiceStore'
import type { FullCharacter } from '../../store/useCharacterStore'

function calculateDamageApplication(
  damage: number,
  currentHp: number,
  tempHp: number,
  conScore: number
): { newCurrentHp: number; newTempHp: number; absorbedByTemp: number } {
  if (damage <= 0) return { newCurrentHp: currentHp, newTempHp: tempHp, absorbedByTemp: 0 }
  const absorbedByTemp = Math.min(tempHp, damage)
  const newTempHp = tempHp - absorbedByTemp
  const remainingDamage = damage - absorbedByTemp
  const deathThreshold = -Math.max(1, conScore)
  const newCurrentHp = Math.max(deathThreshold, currentHp - remainingDamage)
  return { newCurrentHp, newTempHp, absorbedByTemp }
}

function calculateHealingApplication(
  healing: number,
  currentHp: number,
  nonlethalDamage: number,
  maxHp: number
): { newCurrentHp: number; newNonlethal: number; nonlethalCleared: number } {
  if (healing <= 0) return { newCurrentHp: currentHp, newNonlethal: nonlethalDamage, nonlethalCleared: 0 }
  const nonlethalCleared = Math.min(nonlethalDamage, healing)
  const newNonlethal = nonlethalDamage - nonlethalCleared
  const remainingHealing = healing - nonlethalCleared
  const newCurrentHp = Math.min(maxHp, currentHp + remainingHealing)
  return { newCurrentHp, newNonlethal, nonlethalCleared }
}

const mockChar1: FullCharacter = {
  id: 'char-1',
  name: 'Mazikeen Noctis',
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
  savingThrows: {
    fort: 6,
    ref: 5,
    will: 5,
    fortBase: 4,
    refBase: 1,
    willBase: 4,
  },
  skills: [],
  weapons: [],
  buffs: [
    {
      id: 'buff-shield',
      name: 'Shield Spell',
      active: false,
      acMod: 4,
      attackMod: 0,
      damageMod: 0,
    },
  ],
  dailyResources: [],
  feats: [],
  classAbilities: [],
  spellSlots: [],
  spells: [],
  inventory: [],
}

const mockChar2: FullCharacter = {
  id: 'char-2',
  name: 'Noorie',
  class: 'Hunter',
  level: 4,
  race: 'Human',
  alignment: 'Neutral Good',
  maxHp: 34,
  initiativeBonus: 3,
  speed: 30,
  abilities: { str: 14, dex: 16, con: 14, int: 10, wis: 16, cha: 10 },
  armorClass: {
    total: 17,
    touch: 13,
    flatFooted: 14,
    armorBonus: 4,
    shieldBonus: 0,
    dexBonus: 3,
    naturalArmor: 0,
    deflection: 0,
    misc: 0,
    spellFailureChance: 0,
  },
  baseAttackBonus: [3],
  savingThrows: {
    fort: 6,
    ref: 7,
    will: 4,
    fortBase: 4,
    refBase: 4,
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

const mockClumsyChar: FullCharacter = {
  id: 'clumsy-char',
  name: 'Clumsy Knight',
  class: 'Fighter',
  level: 1,
  race: 'Human',
  alignment: 'Neutral',
  maxHp: 45,
  initiativeBonus: -1,
  speed: 30,
  abilities: { str: 16, dex: 8, con: 16, int: 10, wis: 10, cha: 12 },
  armorClass: {
    total: 9,
    touch: 9,
    flatFooted: 10,
    armorBonus: 0,
    shieldBonus: 0,
    dexBonus: -1,
    naturalArmor: 0,
    deflection: 0,
    misc: 0,
    spellFailureChance: 0,
  },
  baseAttackBonus: [1],
  savingThrows: {
    fort: 5,
    ref: -1,
    will: 0,
    fortBase: 2,
    refBase: 0,
    willBase: 0,
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

describe('TacticalHUD Component', () => {
  beforeEach(() => {
    useCharacterStore.setState({
      characters: [mockChar1, mockChar2],
      activeCharacterId: 'char-1',
    })
    useSessionStore.setState({
      sessions: {
        'char-1': {
          characterId: 'char-1',
          currentHp: 28,
          tempHp: 0,
          nonlethalDamage: 0,
          conditions: ['shaken'],
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
    useDiceStore.setState({
      isOpen: false,
      isRolling: false,
      pendingRoll: null,
      lastResult: null,
      history: [],
    })
  })

  describe('Suite 1: Rendering & Character State', () => {
    it('renders active character name, level, and class', () => {
      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      expect(screen.getByText('NEON RELIQUARY')).toBeInTheDocument()
      expect(screen.getByText('Mazikeen Noctis')).toBeInTheDocument()
      expect(screen.getByText(/Level 4 Magus \(Kensai\)/i)).toBeInTheDocument()
    })

    it('renders graceful fallback when no character is active', () => {
      useCharacterStore.setState({
        characters: [],
        activeCharacterId: null,
      })

      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      expect(screen.getByText('NEON RELIQUARY')).toBeInTheDocument()
      expect(screen.getByText('No Active Character')).toBeInTheDocument()
    })

    it('updates immediately when active character changes', () => {
      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      const nextBtn = screen.getByRole('button', { name: /Next character/i })
      fireEvent.click(nextBtn)

      expect(useCharacterStore.getState().activeCharacterId).toBe('char-2')
      expect(screen.getByText('Noorie')).toBeInTheDocument()
      expect(screen.getByText(/Level 4 Hunter/i)).toBeInTheDocument()
    })
  })

  describe('Suite 2: Multi-Track HP Display', () => {
    it('renders base HP numbers and percentage bar correctly', () => {
      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      expect(screen.getByText('28 / 38 HP')).toBeInTheDocument()
    })

    it('displays temporary HP badge when tempHp > 0', () => {
      useSessionStore.setState({
        sessions: {
          'char-1': {
            ...useSessionStore.getState().getSession('char-1'),
            tempHp: 10,
          },
        },
      })

      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      expect(screen.getByText('+10 TEMP')).toBeInTheDocument()
    })

    it('displays nonlethal damage badge when nonlethalDamage > 0', () => {
      useSessionStore.setState({
        sessions: {
          'char-1': {
            ...useSessionStore.getState().getSession('char-1'),
            nonlethalDamage: 8,
          },
        },
      })

      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      expect(screen.getByText('8 NL')).toBeInTheDocument()
    })

    it('indicates Staggered state when nonlethalDamage equals currentHp', () => {
      useSessionStore.setState({
        sessions: {
          'char-1': {
            ...useSessionStore.getState().getSession('char-1'),
            currentHp: 15,
            nonlethalDamage: 15,
          },
        },
      })

      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      expect(screen.getByText('STAGGERED')).toBeInTheDocument()
    })

    it('indicates Unconscious state when nonlethalDamage exceeds currentHp', () => {
      useSessionStore.setState({
        sessions: {
          'char-1': {
            ...useSessionStore.getState().getSession('char-1'),
            currentHp: 15,
            nonlethalDamage: 18,
          },
        },
      })

      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      expect(screen.getByText('UNCONSCIOUS')).toBeInTheDocument()
    })

    it('indicates Dying state when currentHp is negative', () => {
      useSessionStore.setState({
        sessions: {
          'char-1': {
            ...useSessionStore.getState().getSession('char-1'),
            currentHp: -5,
          },
        },
      })

      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      expect(screen.getByText('DYING')).toBeInTheDocument()
    })

    it('indicates Dead state when currentHp <= -conScore', () => {
      useSessionStore.setState({
        sessions: {
          'char-1': {
            ...useSessionStore.getState().getSession('char-1'),
            currentHp: -14, // Con is 14
          },
        },
      })

      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      expect(screen.getByText('DEAD')).toBeInTheDocument()
    })
  })

  describe('Suite 3: Tactical HP Popover (Damage & Healing Rules)', () => {
    it('pure math: absorbs damage into tempHp first', () => {
      const res = calculateDamageApplication(12, 30, 8, 14)
      expect(res.absorbedByTemp).toBe(8)
      expect(res.newTempHp).toBe(0)
      expect(res.newCurrentHp).toBe(26) // 30 - 4
    })

    it('pure math: healing clears nonlethal damage before restoring current HP', () => {
      const res = calculateHealingApplication(10, 20, 6, 38)
      expect(res.nonlethalCleared).toBe(6)
      expect(res.newNonlethal).toBe(0)
      expect(res.newCurrentHp).toBe(24) // 20 + 4
    })

    it('pure math: healing caps current HP at maxHp', () => {
      const res = calculateHealingApplication(20, 30, 0, 38)
      expect(res.newCurrentHp).toBe(38)
    })

    it('pure math: damage clamps at negative Constitution death threshold', () => {
      const res = calculateDamageApplication(100, 10, 0, 14)
      expect(res.newCurrentHp).toBe(-14)
    })

    it('opens popover when clicking the HP bar trigger', () => {
      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      expect(screen.queryByTestId('hp-popover')).not.toBeInTheDocument()

      const trigger = screen.getByTestId('hp-popover-trigger')
      fireEvent.click(trigger)

      expect(screen.getByTestId('hp-popover')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /Tactical HP Adjust/i })).toBeInTheDocument()
    })

    it('applies damage: absorbs temp HP first before reducing current HP', () => {
      useSessionStore.setState({
        sessions: {
          'char-1': {
            ...useSessionStore.getState().getSession('char-1'),
            currentHp: 28,
            tempHp: 8,
          },
        },
      })

      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByTestId('hp-popover-trigger'))

      // Click preset "-5" damage
      const dmg5 = screen.getByRole('button', { name: /Damage 5/i })
      fireEvent.click(dmg5)

      const sess = useSessionStore.getState().getSession('char-1')
      expect(sess.tempHp).toBe(3)
      expect(sess.currentHp).toBe(28)
    })

    it('applies damage: depletes temp HP and deducts remainder from current HP', () => {
      useSessionStore.setState({
        sessions: {
          'char-1': {
            ...useSessionStore.getState().getSession('char-1'),
            currentHp: 28,
            tempHp: 5,
          },
        },
      })

      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByTestId('hp-popover-trigger'))

      // Click preset "-10" damage
      const dmg10 = screen.getByRole('button', { name: /Damage 10/i })
      fireEvent.click(dmg10)

      const sess = useSessionStore.getState().getSession('char-1')
      expect(sess.tempHp).toBe(0)
      expect(sess.currentHp).toBe(23) // 28 - 5
    })

    it('applies healing: clears nonlethal damage first before restoring current HP', () => {
      useSessionStore.setState({
        sessions: {
          'char-1': {
            ...useSessionStore.getState().getSession('char-1'),
            currentHp: 20,
            nonlethalDamage: 6,
          },
        },
      })

      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByTestId('hp-popover-trigger'))

      // Click preset "+10" heal: 6 clears NL, 4 heals current HP to 24
      const heal10 = screen.getByRole('button', { name: /Heal 10/i })
      fireEvent.click(heal10)

      const sess = useSessionStore.getState().getSession('char-1')
      expect(sess.nonlethalDamage).toBe(0)
      expect(sess.currentHp).toBe(24)
    })

    it('closes popover when close button is clicked', () => {
      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByTestId('hp-popover-trigger'))
      expect(screen.getByTestId('hp-popover')).toBeInTheDocument()

      const closeBtn = screen.getByRole('button', { name: /Close HP popover/i })
      fireEvent.click(closeBtn)

      expect(screen.queryByTestId('hp-popover')).not.toBeInTheDocument()
    })
  })

  describe('Suite 4: Persistent AC Badges & Stat Breakdown Tooltips', () => {
    it('displays Total, Touch, and Flat-Footed AC badges from calcEffectiveArmorClass', () => {
      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      // Base AC for Mazikeen: Total 18, Touch 14, Flat-Footed 14
      expect(screen.getByTestId('ac-total')).toHaveTextContent('18')
      expect(screen.getByTestId('ac-touch')).toHaveTextContent('14')
      expect(screen.getByTestId('ac-flat-footed')).toHaveTextContent('14')
    })

    it('updates AC values dynamically when buffs (e.g. Shield +4) are active', () => {
      useSessionStore.setState({
        sessions: {
          'char-1': {
            ...useSessionStore.getState().getSession('char-1'),
            activeBuffIds: ['buff-shield'],
          },
        },
      })

      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      // Shield spell adds +4 to AC and Flat-Footed
      expect(screen.getByTestId('ac-total')).toHaveTextContent('22')
    })

    it('updates AC values dynamically when conditions (e.g. Blinded) are active', () => {
      useSessionStore.setState({
        sessions: {
          'char-1': {
            ...useSessionStore.getState().getSession('char-1'),
            conditions: ['blinded'],
          },
        },
      })

      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      // Blinded: loses DEX (+4) and takes -2 penalty -> 18 - 4 - 2 = 12
      expect(screen.getByTestId('ac-total')).toHaveTextContent('12')
    })

    it('correctly handles negative DEX modifier under Blinded without double deduction', () => {
      useCharacterStore.setState({
        characters: [mockClumsyChar],
        activeCharacterId: 'clumsy-char',
      })
      useSessionStore.setState({
        sessions: {
          'clumsy-char': {
            characterId: 'clumsy-char',
            currentHp: 45,
            tempHp: 0,
            nonlethalDamage: 0,
            conditions: ['blinded'],
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

      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      // Clumsy Knight has Base AC 9 (10 - 1 Dex). Under Blinded, negative Dex remains (-1) and takes -2 penalty -> 7
      expect(screen.getByTestId('ac-total')).toHaveTextContent('7')
    })

    it('renders AC breakdown tooltip on hover/focus', () => {
      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      const acTotalEl = screen.getByTestId('ac-total')
      fireEvent.mouseEnter(acTotalEl.parentElement!)

      expect(screen.getByText('Armor Class (Total)')).toBeInTheDocument()
      expect(screen.getByText('DEX Mod')).toBeInTheDocument()
    })
  })

  describe('Suite 5: Interactive Saving Throws & Dice Store Dispatch', () => {
    it('displays calculated Fortitude, Reflex, and Will save modifiers', () => {
      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      // Mazikeen has shaken (-2 all saves): Fort 6-2=4, Ref 5-2=3, Will 5-2=3
      expect(screen.getByRole('button', { name: /Roll Fortitude Save/i })).toHaveTextContent('+4')
      expect(screen.getByRole('button', { name: /Roll Reflex Save/i })).toHaveTextContent('+3')
      expect(screen.getByRole('button', { name: /Roll Will Save/i })).toHaveTextContent('+3')
    })

    it('clicking Fortitude save invokes useDiceStore.openRoll with correct payload', () => {
      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      const fortBtn = screen.getByRole('button', { name: /Roll Fortitude Save/i })
      fireEvent.click(fortBtn)

      const diceState = useDiceStore.getState()
      expect(diceState.isOpen).toBe(true)
      expect(diceState.pendingRoll).toMatchObject({
        diceType: 20,
        count: 1,
        modifier: 4,
        label: 'Fortitude Save',
      })
    })

    it('clicking Reflex save invokes useDiceStore.openRoll with correct payload', () => {
      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      const refBtn = screen.getByRole('button', { name: /Roll Reflex Save/i })
      fireEvent.click(refBtn)

      const diceState = useDiceStore.getState()
      expect(diceState.isOpen).toBe(true)
      expect(diceState.pendingRoll).toMatchObject({
        diceType: 20,
        count: 1,
        modifier: 3,
        label: 'Reflex Save',
      })
    })

    it('clicking Will save invokes useDiceStore.openRoll with correct payload', () => {
      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      const willBtn = screen.getByRole('button', { name: /Roll Will Save/i })
      fireEvent.click(willBtn)

      const diceState = useDiceStore.getState()
      expect(diceState.isOpen).toBe(true)
      expect(diceState.pendingRoll).toMatchObject({
        diceType: 20,
        count: 1,
        modifier: 3,
        label: 'Will Save',
      })
    })
  })

  describe('Suite 6: Active Buffs & Condition Pills', () => {
    it('renders danger red pills for active conditions', () => {
      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      const conditionPill = screen.getByText('shaken')
      expect(conditionPill).toBeInTheDocument()
    })

    it('clicking a condition pill removes it via useSessionStore', () => {
      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      const conditionBtn = screen.getByRole('button', { name: /Remove condition shaken/i })
      fireEvent.click(conditionBtn)

      const session = useSessionStore.getState().getSession('char-1')
      expect(session.conditions).not.toContain('shaken')
    })

    it('does not render pills for active buffs in the top bar TacticalHUD', () => {
      useSessionStore.setState({
        sessions: {
          'char-1': {
            ...useSessionStore.getState().getSession('char-1'),
            activeBuffIds: ['buff-shield'],
          },
        },
      })

      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      expect(screen.queryByText('Shield Spell')).not.toBeInTheDocument()
    })
  })

  describe('Suite 7: Mobile Compact HUD & Tray Toggle', () => {
    it('toggles mobile tactical tray when toggle button is clicked', () => {
      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      const toggleBtn = screen.getByRole('button', { name: /Espandi dettagli HUD/i })
      expect(toggleBtn).toBeInTheDocument()
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(toggleBtn)

      expect(screen.getByRole('button', { name: /Chiudi dettagli HUD/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Chiudi dettagli HUD/i })).toHaveAttribute('aria-expanded', 'true')
    })

    it('renders the mobile AI chat assistant button', () => {
      render(
        <MemoryRouter>
          <TacticalHUD />
        </MemoryRouter>
      )

      const chatBtn = screen.getByRole('button', { name: /Apri assistente PG/i })
      expect(chatBtn).toBeInTheDocument()
    })
  })
})
