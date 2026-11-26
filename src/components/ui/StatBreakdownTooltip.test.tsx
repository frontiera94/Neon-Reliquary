// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StatBreakdownTooltip } from './StatBreakdownTooltip'

describe('StatBreakdownTooltip', () => {
  it('opens on hover and closes on mouseLeave and Escape', () => {
    render(
      <StatBreakdownTooltip
        title="Armor Class"
        total={20}
        breakdown={[
          { label: 'Base', value: 10 },
          { label: 'Armor', value: 6 },
          { label: 'Penalty', value: -2 },
        ]}
        notes={['Flat-footed ignores Dex']}
      >
        <span>AC 20</span>
      </StatBreakdownTooltip>
    )

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    const trigger = screen.getByText('AC 20').parentElement!
    fireEvent.mouseEnter(trigger)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByText('+6')).toBeInTheDocument()
    expect(screen.getByText('-2')).toBeInTheDocument()
    expect(screen.getByText('Flat-footed ignores Dex')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('supports click trigger and closes on outside mousedown', () => {
    render(
      <div>
        <div data-testid="outside">outside</div>
        <StatBreakdownTooltip title="Fortitude" total="+5" breakdown={[]} trigger="click" align="left">
          <button type="button">Fort</button>
        </StatBreakdownTooltip>
      </div>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Fort' }))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByText('Base value only')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
