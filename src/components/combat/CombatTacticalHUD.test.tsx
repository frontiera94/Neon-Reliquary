// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CombatTacticalHUD } from './CombatTacticalHUD'
import type { ActionEconomyState } from '../../types/combat'

describe('CombatTacticalHUD component', () => {
  const defaultEconomy: ActionEconomyState = {
    standard: false,
    move: false,
    swift: false,
    immediate: false,
    fullRound: false,
  }

  it('renders HP, max HP, AC, CMB, and CMD values correctly', () => {
    render(
      <CombatTacticalHUD
        hp={32}
        maxHp={40}
        ac={19}
        cmb={6}
        cmd={18}
        currentRound={1}
        actionEconomy={defaultEconomy}
        onAdjustHp={vi.fn()}
        onToggleAction={vi.fn()}
        onNewTurn={vi.fn()}
      />
    )

    expect(screen.getByText('32')).toBeInTheDocument()
    expect(screen.getByText('/40')).toBeInTheDocument()
    expect(screen.getByText('19')).toBeInTheDocument()
    expect(screen.getByText('+6')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
    expect(screen.getByText('Round 1')).toBeInTheDocument()
    expect(screen.getByText('Round Action Economy')).toBeInTheDocument()
  })

  it('handles HP adjustment button clicks', () => {
    const onAdjustHp = vi.fn()
    render(
      <CombatTacticalHUD
        hp={25}
        maxHp={30}
        ac={15}
        currentRound={1}
        actionEconomy={defaultEconomy}
        onAdjustHp={onAdjustHp}
        onToggleAction={vi.fn()}
        onNewTurn={vi.fn()}
      />
    )

    const minusBtn = screen.getByRole('button', { name: /decrease hp/i })
    const plusBtn = screen.getByRole('button', { name: /increase hp/i })

    fireEvent.click(minusBtn)
    expect(onAdjustHp).toHaveBeenCalledWith(-1)

    fireEvent.click(plusBtn)
    expect(onAdjustHp).toHaveBeenCalledWith(1)
  })

  it('renders action pills and triggers onToggleAction on click', () => {
    const onToggleAction = vi.fn()
    render(
      <CombatTacticalHUD
        hp={30}
        maxHp={30}
        ac={16}
        currentRound={2}
        actionEconomy={{
          ...defaultEconomy,
          standard: true,
        }}
        onAdjustHp={vi.fn()}
        onToggleAction={onToggleAction}
        onNewTurn={vi.fn()}
      />
    )

    const standardBtn = screen.getByText('Standard').closest('button')!
    const moveBtn = screen.getByText('Movement').closest('button')!

    fireEvent.click(standardBtn)
    expect(onToggleAction).toHaveBeenCalledWith('standard')

    fireEvent.click(moveBtn)
    expect(onToggleAction).toHaveBeenCalledWith('move')
  })

  it('triggers onNewTurn and onResetRound callbacks', () => {
    const onNewTurn = vi.fn()
    const onResetRound = vi.fn()

    render(
      <CombatTacticalHUD
        hp={20}
        maxHp={20}
        ac={14}
        currentRound={3}
        actionEconomy={defaultEconomy}
        onAdjustHp={vi.fn()}
        onToggleAction={vi.fn()}
        onNewTurn={onNewTurn}
        onResetRound={onResetRound}
      />
    )

    const newTurnBtn = screen.getByText('New Turn').closest('button')!
    fireEvent.click(newTurnBtn)
    expect(onNewTurn).toHaveBeenCalledTimes(1)

    const resetBtn = screen.getByTitle('Reset Combat to Round 1')
    fireEvent.click(resetBtn)
    expect(onResetRound).toHaveBeenCalledTimes(1)
  })
})
