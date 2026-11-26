// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SpellUsePips } from './SpellUsePips'

describe('SpellUsePips', () => {
  it('renders remaining count and prefix badge', () => {
    render(<SpellUsePips label="Lvl 1 Slots" prefix="L1" total={4} spent={1} onSpend={vi.fn()} />)
    expect(screen.getByRole('group', { name: 'Lvl 1 Slots: 3 of 4 remaining' })).toBeInTheDocument()
    expect(screen.getByText('L1')).toBeInTheDocument()
  })

  it('spends and recovers pips via onSpend and onSetSpent', () => {
    const onSpend = vi.fn()
    const onSetSpent = vi.fn()
    render(<SpellUsePips label="Magic Missile" total={3} spent={1} onSpend={onSpend} onSetSpent={onSetSpent} />)

    // Index 0 is spent -> clicking recovers to 0
    fireEvent.click(screen.getByRole('button', { name: 'Recover Magic Missile 1 of 3' }))
    expect(onSetSpent).toHaveBeenCalledWith(0)

    // Index 1 === spent -> clicking calls onSpend
    fireEvent.click(screen.getByRole('button', { name: 'Spend Magic Missile 2 of 3' }))
    expect(onSpend).toHaveBeenCalledTimes(1)

    // Index 2 > spent -> clicking calls onSetSpent(3)
    fireEvent.click(screen.getByRole('button', { name: 'Spend Magic Missile 3 of 3' }))
    expect(onSetSpent).toHaveBeenCalledWith(3)
  })

  it('disables interaction when disabled=true', () => {
    const onSpend = vi.fn()
    render(<SpellUsePips label="Slot" total={2} spent={0} disabled onSpend={onSpend} />)
    const btn = screen.getByRole('button', { name: 'Spend Slot 1 of 2' })
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(onSpend).not.toHaveBeenCalled()
  })
})
