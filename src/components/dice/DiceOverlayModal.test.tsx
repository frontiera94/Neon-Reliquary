// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { DiceOverlayModal } from './DiceOverlayModal'
import { useDiceStore } from '../../store/useDiceStore'
import type { DiceRoll, RollResult } from '../../types/dice'

describe('DiceOverlayModal component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useDiceStore.setState({
      isOpen: false,
      isRolling: false,
      pendingRoll: null,
      lastResult: null,
      history: [],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when closed', () => {
    const { container } = render(<DiceOverlayModal />)
    expect(container.firstChild).toBeNull()
  })

  it('renders pending roll and initiates roll animation when opened', () => {
    const roll: DiceRoll = {
      diceType: 20,
      count: 1,
      modifier: 5,
      label: 'Scimitar Attack',
    }

    render(<DiceOverlayModal />)

    act(() => {
      useDiceStore.getState().openRoll(roll)
    })

    expect(screen.getByText('Scimitar Attack')).toBeInTheDocument()
    expect(screen.getAllByText('d20').length).toBeGreaterThanOrEqual(1)
  })

  it('resolves roll and displays result after 1200ms timer', () => {
    const roll: DiceRoll = {
      diceType: 20,
      count: 1,
      modifier: 4,
      label: 'Perception Check',
    }

    render(<DiceOverlayModal />)

    act(() => {
      useDiceStore.getState().openRoll(roll)
    })

    // Advance past the 1200ms rolling timer
    act(() => {
      vi.advanceTimersByTime(1250)
    })

    const state = useDiceStore.getState()
    expect(state.isRolling).toBe(false)
    expect(state.lastResult).not.toBeNull()
    expect(screen.getByText('Dismiss')).toBeInTheDocument()
  })

  it('shows Critical Threat alert and Confirm Critical button when natural roll is critical', () => {
    const mockResult: RollResult = {
      id: 'test-crit-id',
      timestamp: Date.now(),
      label: 'Keen Falchion',
      diceType: 20,
      modifier: 6,
      naturalRolls: [20],
      total: 26,
      formula: '1d20 [20] + 6 = 26',
      isCriticalThreat: true,
      isCriticalConfirmed: false,
    }

    render(<DiceOverlayModal />)

    act(() => {
      useDiceStore.setState({
        isOpen: true,
        isRolling: false,
        lastResult: mockResult,
        pendingRoll: {
          diceType: 20,
          count: 1,
          modifier: 6,
          label: 'Keen Falchion',
          critRange: 18,
        },
      })
    })

    expect(screen.getByText(/Critical Threat! — Confirm Roll/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirm Critical/i })).toBeInTheDocument()
  })

  it('closes modal on Dismiss button click', () => {
    const mockResult: RollResult = {
      id: 'test-id',
      timestamp: Date.now(),
      label: 'Reflex Save',
      diceType: 20,
      modifier: 3,
      naturalRolls: [12],
      total: 15,
      formula: '1d20 [12] + 3 = 15',
      isCriticalThreat: false,
      isCriticalConfirmed: false,
    }

    render(<DiceOverlayModal />)

    act(() => {
      useDiceStore.setState({
        isOpen: true,
        isRolling: false,
        lastResult: mockResult,
      })
    })

    const dismissBtn = screen.getByRole('button', { name: /Dismiss/i })
    fireEvent.click(dismissBtn)

    expect(useDiceStore.getState().isOpen).toBe(false)
  })

  it('closes modal when Escape key is pressed', () => {
    render(<DiceOverlayModal />)

    act(() => {
      useDiceStore.setState({
        isOpen: true,
        isRolling: false,
      })
    })

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useDiceStore.getState().isOpen).toBe(false)
  })

  it('renders direct Roll Damage button when followUpRoll is provided', () => {
    const mockResult: RollResult = {
      id: 'attack-res-id',
      timestamp: Date.now(),
      label: 'Dagger Attack',
      diceType: 20,
      modifier: 10,
      naturalRolls: [15],
      total: 25,
      formula: '1d20 [15] + 10 = 25',
      isCriticalThreat: false,
      isCriticalConfirmed: false,
    }

    render(<DiceOverlayModal />)

    act(() => {
      useDiceStore.setState({
        isOpen: true,
        isRolling: false,
        lastResult: mockResult,
        pendingRoll: {
          diceType: 20,
          count: 1,
          modifier: 10,
          label: 'Dagger Attack',
          followUpRoll: {
            diceType: 6,
            count: 1,
            modifier: 5,
            label: 'Dagger Damage',
          },
          followUpLabel: '1d3 + 5',
        },
      })
    })

    expect(screen.getByText(/Roll Damage \(1d3 \+ 5\)/i)).toBeInTheDocument()

    const rollDamageBtn = screen.getByText(/Roll Damage \(1d3 \+ 5\)/i).closest('button')
    fireEvent.click(rollDamageBtn!)

    // It initiates the damage roll in the store
    const state = useDiceStore.getState()
    expect(state.pendingRoll?.label).toBe('Dagger Damage')
    expect(state.pendingRoll?.diceType).toBe(6)
    expect(state.isRolling).toBe(true)
  })
})

