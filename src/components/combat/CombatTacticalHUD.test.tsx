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

    fireEvent.click(minusBtn)
    expect(onAdjustHp).toHaveBeenCalledWith(-1)

    fireEvent.click(plusBtn)
    expect(onAdjustHp).toHaveBeenCalledWith(1)
  })
})
