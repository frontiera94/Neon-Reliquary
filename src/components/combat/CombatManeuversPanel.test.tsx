// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CombatManeuversPanel } from './CombatManeuversPanel'
import type { CombatManeuversCalculated } from '../../types/combat'

const mockManeuversCalc: CombatManeuversCalculated = {
  cmb: 7,
  cmd: 21,
  breakdownCmb: [
    { label: 'Base BAB (+4)', value: 4 },
    { label: 'STR Mod', value: 3 },
  ],
  breakdownCmd: [
    { label: 'Base', value: 10 },
    { label: 'Base BAB (+4)', value: 4 },
    { label: 'STR Mod', value: 3 },
    { label: 'DEX Mod', value: 3 },
    { label: 'Deflection', value: 1 },
  ],
  maneuvers: {
    trip: {
      type: 'trip',
      name: 'Sbilanciare (Trip)',
      bonus: 9,
      provokesAoO: false,
      featApplied: 'Improved trip',
      description: 'Fa cadere a terra prono il bersaglio.',
      cmdBonus: 2,
      breakdown: [
        { label: 'Base BAB (+4)', value: 4 },
        { label: 'STR Mod', value: 3 },
        { label: 'Improved trip', value: 2 },
      ],
    },
    disarm: {
      type: 'disarm',
      name: 'Disarmare (Disarm)',
      bonus: 7,
      provokesAoO: true,
      description: "Fa cadere l'arma o l'oggetto impugnato dal bersaglio.",
      breakdown: [
        { label: 'Base BAB (+4)', value: 4 },
        { label: 'STR Mod', value: 3 },
      ],
    },
    grapple: {
      type: 'grapple',
      name: 'Lotta (Grapple)',
      bonus: 11,
      provokesAoO: false,
      featApplied: 'Greater grapple',
      description: 'Trattiene o blocca un avversario nello stesso spazio.',
      cmdBonus: 4,
      breakdown: [
        { label: 'Base BAB (+4)', value: 4 },
        { label: 'STR Mod', value: 3 },
        { label: 'Greater grapple', value: 4 },
      ],
    },
    bullRush: {
      type: 'bullRush',
      name: 'Spingere (Bull Rush)',
      bonus: 7,
      provokesAoO: true,
      description: 'Spinge indietro il bersaglio di 1,5m o più.',
      breakdown: [
        { label: 'Base BAB (+4)', value: 4 },
        { label: 'STR Mod', value: 3 },
      ],
    },
    sunder: {
      type: 'sunder',
      name: 'Spezzare (Sunder)',
      bonus: 7,
      provokesAoO: true,
      description: "Danneggia un'arma o un oggetto portato dall'avversario.",
      breakdown: [
        { label: 'Base BAB (+4)', value: 4 },
        { label: 'STR Mod', value: 3 },
      ],
    },
    overrun: {
      type: 'overrun',
      name: 'Oltrepassare (Overrun)',
      bonus: 7,
      provokesAoO: true,
      description: "Travolge l'avversario durante il movimento superando il suo spazio.",
      breakdown: [
        { label: 'Base BAB (+4)', value: 4 },
        { label: 'STR Mod', value: 3 },
      ],
    },
    dirtyTrick: {
      type: 'dirtyTrick',
      name: 'Sporco Trucco (Dirty Trick)',
      bonus: 7,
      provokesAoO: true,
      description: 'Acceca, scuote o rende infermo temporaneamente il bersaglio.',
      breakdown: [
        { label: 'Base BAB (+4)', value: 4 },
        { label: 'STR Mod', value: 3 },
      ],
    },
    reposition: {
      type: 'reposition',
      name: 'Riposizionare (Reposition)',
      bonus: 7,
      provokesAoO: true,
      description: "Sposta l'avversario in un altro quadretto vicino entro portata.",
      breakdown: [
        { label: 'Base BAB (+4)', value: 4 },
        { label: 'STR Mod', value: 3 },
      ],
    },
    steal: {
      type: 'steal',
      name: 'Rubare (Steal)',
      bonus: 7,
      provokesAoO: true,
      description: "Sottrae rapidamente un oggetto non impugnato all'avversario.",
      breakdown: [
        { label: 'Base BAB (+4)', value: 4 },
        { label: 'STR Mod', value: 3 },
      ],
    },
  },
}

describe('CombatManeuversPanel', () => {
  it('renders total CMB and CMD values in header', () => {
    const openRoll = vi.fn()
    render(<CombatManeuversPanel maneuversCalc={mockManeuversCalc} openRoll={openRoll} />)

    expect(screen.getByText('Maneuvers & Tactics (CMB / CMD)')).toBeInTheDocument()
    expect(screen.getByTestId('header-cmb-value')).toHaveTextContent('CMB +7')
    expect(screen.getByTestId('header-cmd-value')).toHaveTextContent('CMD 21')
    expect(screen.getByText(/Trip, Disarm, Grapple/i)).toBeInTheDocument()
  })

  it('expands and collapses the panel on header click', () => {
    const openRoll = vi.fn()
    render(<CombatManeuversPanel maneuversCalc={mockManeuversCalc} openRoll={openRoll} />)

    // Initially collapsed
    expect(screen.queryByText('Sbilanciare (Trip)')).not.toBeInTheDocument()

    // Expand
    const header = screen.getByText('Maneuvers & Tactics (CMB / CMD)')
    fireEvent.click(header)

    expect(screen.getByText('Sbilanciare (Trip)')).toBeInTheDocument()
    expect(screen.getByText('Disarmare (Disarm)')).toBeInTheDocument()

    // Collapse
    fireEvent.click(header)
    expect(screen.queryByText('Sbilanciare (Trip)')).not.toBeInTheDocument()
  })

  it('toggles CMB and CMD detailed breakdown views', () => {
    const openRoll = vi.fn()
    render(<CombatManeuversPanel maneuversCalc={mockManeuversCalc} openRoll={openRoll} />)

    // Expand panel
    fireEvent.click(screen.getByText('Maneuvers & Tactics (CMB / CMD)'))

    // Breakdown panels initially hidden
    expect(screen.queryByTestId('cmb-breakdown-panel')).not.toBeInTheDocument()
    expect(screen.queryByTestId('cmd-breakdown-panel')).not.toBeInTheDocument()

    // Open CMB breakdown
    fireEvent.click(screen.getByRole('button', { name: /cmb breakdown/i }))
    const cmbPanel = screen.getByTestId('cmb-breakdown-panel')
    expect(cmbPanel).toBeInTheDocument()
    expect(cmbPanel).toHaveTextContent('Base Combat Maneuver Bonus (CMB)')
    expect(cmbPanel).toHaveTextContent('Base BAB (+4)')
    expect(cmbPanel).toHaveTextContent('STR Mod')
    expect(cmbPanel).toHaveTextContent('Total: +7')

    // Toggle off CMB breakdown
    fireEvent.click(screen.getByRole('button', { name: /cmb breakdown/i }))
    expect(screen.queryByTestId('cmb-breakdown-panel')).not.toBeInTheDocument()

    // Open CMD breakdown
    fireEvent.click(screen.getByRole('button', { name: /cmd breakdown/i }))
    const cmdPanel = screen.getByTestId('cmd-breakdown-panel')
    expect(cmdPanel).toBeInTheDocument()
    expect(cmdPanel).toHaveTextContent('Combat Maneuver Defense (CMD)')
    expect(cmdPanel).toHaveTextContent('DEX Mod')
    expect(cmdPanel).toHaveTextContent('Deflection')
    expect(cmdPanel).toHaveTextContent('Total: 21')
  })

  it("displays 'No AoO' badge for maneuvers with feat and 'Provokes' badge for others", () => {
    const openRoll = vi.fn()
    render(<CombatManeuversPanel maneuversCalc={mockManeuversCalc} openRoll={openRoll} />)

    fireEvent.click(screen.getByText('Maneuvers & Tactics (CMB / CMD)'))

    // Sbilanciare (Trip) and Lotta (Grapple) have feats -> No AoO
    const noAoOBadges = screen.getAllByText('No AoO')
    expect(noAoOBadges.length).toBe(2)

    // 7 other maneuvers provoke
    const provokesBadges = screen.getAllByText('Provokes')
    expect(provokesBadges.length).toBe(7)

    // Check feat label display for Trip and Grapple
    expect(screen.getByText('Improved trip')).toBeInTheDocument()
    expect(screen.getByText('Greater grapple')).toBeInTheDocument()

    // Check CMD defense bonus display
    expect(screen.getByText(/CMD vs trip:/i)).toBeInTheDocument()
    expect(screen.getByText(/CMD vs grapple:/i)).toBeInTheDocument()
  })

  it('filters maneuvers by search query', () => {
    const openRoll = vi.fn()
    render(<CombatManeuversPanel maneuversCalc={mockManeuversCalc} openRoll={openRoll} />)

    fireEvent.click(screen.getByText('Maneuvers & Tactics (CMB / CMD)'))

    const searchInput = screen.getByPlaceholderText(/search maneuvers/i)
    fireEvent.change(searchInput, { target: { value: 'Trip' } })

    // Trip is visible
    expect(screen.getByText('Sbilanciare (Trip)')).toBeInTheDocument()
    // Other maneuvers are filtered out
    expect(screen.queryByText('Disarmare (Disarm)')).not.toBeInTheDocument()
    expect(screen.queryByText('Lotta (Grapple)')).not.toBeInTheDocument()

    // Clear search using clear button
    const clearBtn = screen.getByRole('button', { name: /clear search/i })
    fireEvent.click(clearBtn)

    expect(screen.getByText('Disarmare (Disarm)')).toBeInTheDocument()
    expect(screen.getByText('Lotta (Grapple)')).toBeInTheDocument()
  })

  it('filters maneuvers using filter buttons (All, No AoO, Provokes)', () => {
    const openRoll = vi.fn()
    render(<CombatManeuversPanel maneuversCalc={mockManeuversCalc} openRoll={openRoll} />)

    fireEvent.click(screen.getByText('Maneuvers & Tactics (CMB / CMD)'))

    // Click No AoO filter
    fireEvent.click(screen.getByRole('button', { name: /no aoo \(2\)/i }))
    expect(screen.getByText('Sbilanciare (Trip)')).toBeInTheDocument()
    expect(screen.getByText('Lotta (Grapple)')).toBeInTheDocument()
    expect(screen.queryByText('Disarmare (Disarm)')).not.toBeInTheDocument()
    expect(screen.queryByText('Spingere (Bull Rush)')).not.toBeInTheDocument()

    // Click Provokes filter
    fireEvent.click(screen.getByRole('button', { name: /provokes \(7\)/i }))
    expect(screen.getByText('Disarmare (Disarm)')).toBeInTheDocument()
    expect(screen.getByText('Spingere (Bull Rush)')).toBeInTheDocument()
    expect(screen.queryByText('Sbilanciare (Trip)')).not.toBeInTheDocument()
    expect(screen.queryByText('Lotta (Grapple)')).not.toBeInTheDocument()

    // Click All filter
    fireEvent.click(screen.getByRole('button', { name: /all \(9\)/i }))
    expect(screen.getByText('Sbilanciare (Trip)')).toBeInTheDocument()
    expect(screen.getByText('Disarmare (Disarm)')).toBeInTheDocument()
  })

  it('shows empty state when no maneuvers match search and resets properly', () => {
    const openRoll = vi.fn()
    render(<CombatManeuversPanel maneuversCalc={mockManeuversCalc} openRoll={openRoll} />)

    fireEvent.click(screen.getByText('Maneuvers & Tactics (CMB / CMD)'))

    const searchInput = screen.getByPlaceholderText(/search maneuvers/i)
    fireEvent.change(searchInput, { target: { value: 'InexistentQueryXYZ' } })

    expect(screen.getByText(/no maneuvers found matching your search/i)).toBeInTheDocument()

    // Click Reset Filters
    fireEvent.click(screen.getByRole('button', { name: /reset filters/i }))
    expect(screen.getByText('Sbilanciare (Trip)')).toBeInTheDocument()
  })

  it('invokes openRoll with correct bonus and breakdown when clicking Check button', () => {
    const openRoll = vi.fn()
    render(<CombatManeuversPanel maneuversCalc={mockManeuversCalc} openRoll={openRoll} />)

    fireEvent.click(screen.getByText('Maneuvers & Tactics (CMB / CMD)'))

    // Find the Check button for Sbilanciare (Trip)
    const tripCheckBtn = screen.getByRole('button', {
      name: /roll sbilanciare \(trip\) check \(\+9\)/i,
    })
    fireEvent.click(tripCheckBtn)

    expect(openRoll).toHaveBeenCalledTimes(1)
    expect(openRoll).toHaveBeenCalledWith({
      diceType: 20,
      count: 1,
      modifier: 9,
      label: 'Sbilanciare (Trip) Check',
      breakdown: mockManeuversCalc.maneuvers.trip.breakdown,
    })

    // Find the Check button for Disarmare (Disarm)
    const disarmCheckBtn = screen.getByRole('button', {
      name: /roll disarmare \(disarm\) check \(\+7\)/i,
    })
    fireEvent.click(disarmCheckBtn)

    expect(openRoll).toHaveBeenCalledTimes(2)
    expect(openRoll).toHaveBeenLastCalledWith({
      diceType: 20,
      count: 1,
      modifier: 7,
      label: 'Disarmare (Disarm) Check',
      breakdown: mockManeuversCalc.maneuvers.disarm.breakdown,
    })
  })

  it('allows expanding individual maneuver breakdown on the card', () => {
    const openRoll = vi.fn()
    render(<CombatManeuversPanel maneuversCalc={mockManeuversCalc} openRoll={openRoll} />)

    fireEvent.click(screen.getByText('Maneuvers & Tactics (CMB / CMD)'))

    // Filter to Trip only to easily find its breakdown button
    const searchInput = screen.getByPlaceholderText(/search maneuvers/i)
    fireEvent.change(searchInput, { target: { value: 'Trip' } })

    const viewBreakdownBtn = screen.getByRole('button', { name: /view breakdown/i })
    fireEvent.click(viewBreakdownBtn)

    expect(screen.getByRole('button', { name: /hide breakdown/i })).toBeInTheDocument()
    expect(screen.getByText(/improved trip:/i)).toBeInTheDocument()
  })
})
