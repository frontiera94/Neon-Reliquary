// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CoinPurseWidget } from './CoinPurseWidget'
import { useLocaleStore } from '../../store/useLocaleStore'

describe('CoinPurseWidget', () => {
  beforeEach(() => {
    useLocaleStore.setState({ locale: 'en' })
  })

  it('renders all four denominations and disables decrement buttons when balance is insufficient', () => {
    const onAdjust = vi.fn()
    render(<CoinPurseWidget coins={{ pp: 0, gp: 5, sp: 15, cp: 100 }} onAdjust={onAdjust} />)

    expect(screen.getByText('Platinum')).toBeInTheDocument()
    expect(screen.getByText('Gold')).toBeInTheDocument()
    expect(screen.getByText('Silver')).toBeInTheDocument()
    expect(screen.getByText('Copper')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Decrease Platinum by 1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decrease Platinum by 10' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decrease Gold by 10' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decrease Gold by 1' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decrease Silver by 10' })).not.toBeDisabled()
  })

  it('invokes onAdjust with exact deltas on click and supports Italian labels', () => {
    useLocaleStore.setState({ locale: 'it' })
    const onAdjust = vi.fn()
    render(<CoinPurseWidget coins={{ pp: 2, gp: 20, sp: 10, cp: 0 }} onAdjust={onAdjust} />)

    expect(screen.getByText('Oro')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Increase Gold by 10' }))
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Gold by 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Increase Copper by 1' }))

    expect(onAdjust).toHaveBeenNthCalledWith(1, 'gp', 10)
    expect(onAdjust).toHaveBeenNthCalledWith(2, 'gp', -1)
    expect(onAdjust).toHaveBeenNthCalledWith(3, 'cp', 1)
  })
})
