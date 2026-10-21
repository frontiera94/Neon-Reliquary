// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActionEconomyTracker } from './ActionEconomyTracker'
import type { ActionEconomyState } from '../../types/combat'

describe('ActionEconomyTracker Component', () => {
  it('renders all 5 actions and initial state correctly', () => {
    render(<ActionEconomyTracker />)

    // Header & counter
    expect(screen.getByText('Round Action Economy')).toBeInTheDocument()
    expect(screen.getByTestId('round-counter')).toHaveTextContent('Round 1')
    expect(screen.getByText('All actions available for this turn')).toBeInTheDocument()

    // Control buttons
    expect(screen.getByRole('button', { name: /reset round/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new turn/i })).toBeInTheDocument()

    // 5 Actions rendered
    expect(screen.getByText('Standard')).toBeInTheDocument()
    expect(screen.getByText('Movement')).toBeInTheDocument()
    expect(screen.getByText('Swift')).toBeInTheDocument()
    expect(screen.getByText('Immediate')).toBeInTheDocument()
    expect(screen.getByText('Full-Round')).toBeInTheDocument()

    // Sublabels
    expect(screen.getByText('Attack, Cast, Maneuver')).toBeInTheDocument()
    expect(screen.getByText('Move speed, Draw weapon')).toBeInTheDocument()
    expect(screen.getByText('Quickened spell, Stance')).toBeInTheDocument()
    expect(screen.getByText('Reaction (Feather Fall)')).toBeInTheDocument()
    expect(screen.getByText('Full Attack, Charge, Run')).toBeInTheDocument()

    // All 5 actions are initially Ready
    const readyBadges = screen.getAllByText('Ready')
    expect(readyBadges).toHaveLength(5)
    expect(screen.queryByText('Spent')).not.toBeInTheDocument()
  })

  it('toggles a single action (Standard transitions between Ready and Spent)', () => {
    render(<ActionEconomyTracker />)

    const standardBtn = screen.getByText('Standard').closest('button')!
    expect(standardBtn).not.toBeNull()

    // Click Standard action -> becomes Spent
    fireEvent.click(standardBtn)
    expect(screen.getByText('Spent')).toBeInTheDocument()
    expect(screen.getAllByText('Ready')).toHaveLength(4)
    expect(screen.getByText('1 of 5 actions committed')).toBeInTheDocument()

    // Click Standard action again -> toggles back to Ready
    fireEvent.click(standardBtn)
    expect(screen.getAllByText('Ready')).toHaveLength(5)
    expect(screen.queryByText('Spent')).not.toBeInTheDocument()
    expect(screen.getByText('All actions available for this turn')).toBeInTheDocument()
  })

  it('handles bidirectional Full-Round action interconnection with Standard and Move', () => {
    render(<ActionEconomyTracker />)

    const fullRoundBtn = screen.getByText('Full-Round').closest('button')!
    const standardBtn = screen.getByText('Standard').closest('button')!
    const moveBtn = screen.getByText('Movement').closest('button')!

    // 1. Activating Full-Round spends Full-Round, Standard, and Move
    fireEvent.click(fullRoundBtn)
    expect(screen.getAllByText('Spent')).toHaveLength(3)
    expect(screen.getAllByText('Ready')).toHaveLength(2) // Swift and Immediate are Ready
    expect(screen.getByText('3 of 5 actions committed')).toBeInTheDocument()

    // 2. Untoggling Full-Round frees Full-Round, Standard, and Move
    fireEvent.click(fullRoundBtn)
    expect(screen.getAllByText('Ready')).toHaveLength(5)
    expect(screen.queryByText('Spent')).not.toBeInTheDocument()

    // 3. Spending Standard and Move individually causes Full-Round to automatically become Spent
    fireEvent.click(standardBtn)
    expect(screen.getAllByText('Spent')).toHaveLength(1)
    expect(screen.getAllByText('Ready')).toHaveLength(4)

    fireEvent.click(moveBtn)
    // Both standard and move spent -> Full-Round should now be Spent as well
    expect(screen.getAllByText('Spent')).toHaveLength(3)
    expect(screen.getAllByText('Ready')).toHaveLength(2)

    // 4. Untoggling Standard while Full-Round was Spent frees Standard and Full-Round, but leaves Move Spent
    fireEvent.click(standardBtn)
    expect(screen.getAllByText('Spent')).toHaveLength(1) // Only Move is spent
    expect(screen.getAllByText('Ready')).toHaveLength(4)

    // 5. Untoggling Move returns everything to Ready
    fireEvent.click(moveBtn)
    expect(screen.getAllByText('Ready')).toHaveLength(5)
    expect(screen.queryByText('Spent')).not.toBeInTheDocument()
  })

  it('clicking New Turn resets all actions and increments the round counter', () => {
    render(<ActionEconomyTracker />)

    // Verify initial round is 1
    expect(screen.getByTestId('round-counter')).toHaveTextContent('Round 1')

    // Commit Standard and Swift actions
    const standardBtn = screen.getByText('Standard').closest('button')!
    const swiftBtn = screen.getByText('Swift').closest('button')!
    fireEvent.click(standardBtn)
    fireEvent.click(swiftBtn)
    expect(screen.getAllByText('Spent')).toHaveLength(2)

    // Click New Turn
    const newTurnBtn = screen.getByRole('button', { name: /new turn/i })
    fireEvent.click(newTurnBtn)

    // Round should now be 2, and all actions reset to Ready
    expect(screen.getByTestId('round-counter')).toHaveTextContent('Round 2')
    expect(screen.getAllByText('Ready')).toHaveLength(5)
    expect(screen.queryByText('Spent')).not.toBeInTheDocument()
    expect(screen.getByText('All actions available for this turn')).toBeInTheDocument()

    // Click New Turn again -> increments to Round 3
    fireEvent.click(newTurnBtn)
    expect(screen.getByTestId('round-counter')).toHaveTextContent('Round 3')
  })

  it('clicking Reset Round resets the combat counter back to Round 1 and resets actions', () => {
    render(<ActionEconomyTracker initialRound={3} />)

    expect(screen.getByTestId('round-counter')).toHaveTextContent('Round 3')

    // Spend Full-Round
    const fullRoundBtn = screen.getByText('Full-Round').closest('button')!
    fireEvent.click(fullRoundBtn)
    expect(screen.getAllByText('Spent')).toHaveLength(3)

    // Click Reset Round
    const resetRoundBtn = screen.getByRole('button', { name: /reset round/i })
    fireEvent.click(resetRoundBtn)

    // Round resets to 1 and actions are cleared
    expect(screen.getByTestId('round-counter')).toHaveTextContent('Round 1')
    expect(screen.getAllByText('Ready')).toHaveLength(5)
    expect(screen.queryByText('Spent')).not.toBeInTheDocument()
  })

  it('works smoothly as a controlled component with callbacks', () => {
    const onToggleAction = vi.fn()
    const onNewTurn = vi.fn()
    const onResetRound = vi.fn()

    const controlledEconomy: ActionEconomyState = {
      standard: true,
      move: false,
      swift: false,
      immediate: true,
      fullRound: false,
    }

    render(
      <ActionEconomyTracker
        actionEconomy={controlledEconomy}
        currentRound={4}
        onToggleAction={onToggleAction}
        onNewTurn={onNewTurn}
        onResetRound={onResetRound}
      />
    )

    // Check controlled values rendered
    expect(screen.getByTestId('round-counter')).toHaveTextContent('Round 4')
    expect(screen.getAllByText('Spent')).toHaveLength(2) // standard & immediate
    expect(screen.getAllByText('Ready')).toHaveLength(3)

    // Toggle move
    const moveBtn = screen.getByText('Movement').closest('button')!
    fireEvent.click(moveBtn)
    expect(onToggleAction).toHaveBeenCalledWith('move')

    // Click New Turn
    const newTurnBtn = screen.getByRole('button', { name: /new turn/i })
    fireEvent.click(newTurnBtn)
    expect(onNewTurn).toHaveBeenCalled()

    // Click Reset Round
    const resetRoundBtn = screen.getByRole('button', { name: /reset round/i })
    fireEvent.click(resetRoundBtn)
    expect(onResetRound).toHaveBeenCalled()
  })
})
