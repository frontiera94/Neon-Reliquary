// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CombatTacticalHUD } from './CombatTacticalHUD'

describe('CombatTacticalHUD component', () => {
  it('renders HP, max HP, AC, CMB, and CMD values correctly', () => {
    render(
      <CombatTacticalHUD
        hp={32}
        maxHp={40}
        ac={19}
        cmb={6}
        cmd={18}
        onAdjustHp={vi.fn()}
      />
    )

    expect(screen.getByText('32')).toBeInTheDocument()
    expect(screen.getByText('/40')).toBeInTheDocument()
    expect(screen.getByText('19')).toBeInTheDocument()
    expect(screen.getByText('+6')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
  })

  it('handles HP adjustment button clicks', () => {
    const onAdjustHp = vi.fn()
    render(
      <CombatTacticalHUD
        hp={25}
        maxHp={30}
        ac={15}
        onAdjustHp={onAdjustHp}
      />
    )

    const minusBtn = screen.getByRole('button', { name: /decrease hp/i })
    const plusBtn = screen.getByRole('button', { name: /increase hp/i })
    const minus5Btn = screen.getByRole('button', { name: /subtract 5 hp/i })
    const minus10Btn = screen.getByRole('button', { name: /subtract 10 hp/i })
    const plus5Btn = screen.getByRole('button', { name: /add 5 hp/i })
    const plus10Btn = screen.getByRole('button', { name: /add 10 hp/i })

    fireEvent.click(minusBtn)
    expect(onAdjustHp).toHaveBeenCalledWith(-1)

    fireEvent.click(minus5Btn)
    expect(onAdjustHp).toHaveBeenCalledWith(-5)

    fireEvent.click(minus10Btn)
    expect(onAdjustHp).toHaveBeenCalledWith(-10)

    fireEvent.click(plusBtn)
    expect(onAdjustHp).toHaveBeenCalledWith(1)

    fireEvent.click(plus5Btn)
    expect(onAdjustHp).toHaveBeenCalledWith(5)

    fireEvent.click(plus10Btn)
    expect(onAdjustHp).toHaveBeenCalledWith(10)
  })

  it('renders vital status alert badge when HP is 0 or negative', () => {
    const { rerender } = render(
      <CombatTacticalHUD
        hp={0}
        maxHp={30}
        ac={15}
        conScore={14}
        onAdjustHp={vi.fn()}
      />
    )
    expect(screen.getByText(/Disabled \(0 HP\)/i)).toBeInTheDocument()

    rerender(
      <CombatTacticalHUD
        hp={-5}
        maxHp={30}
        ac={15}
        conScore={14}
        onAdjustHp={vi.fn()}
      />
    )
    expect(screen.getByText(/Dying \(-5 HP\)/i)).toBeInTheDocument()

    rerender(
      <CombatTacticalHUD
        hp={-15}
        maxHp={30}
        ac={15}
        conScore={14}
        onAdjustHp={vi.fn()}
      />
    )
    expect(screen.getByText(/Dead/i)).toBeInTheDocument()
  })
})
