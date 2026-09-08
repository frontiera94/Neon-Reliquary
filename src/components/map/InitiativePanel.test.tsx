// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InitiativePanel } from './InitiativePanel'
import { useMapStore } from '../../store/useMapStore'
import type { PublicMapState } from '../../types/map'

const mockMap: PublicMapState = {
  id: 'map-test-1',
  name: 'Crypt of the Everflame',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  background: null,
  grid: { size: 50 },
  tokens: [
    {
      id: 'token-hero',
      name: 'Mazikeen',
      initial: 'M',
      color: '#00daf3',
      kind: 'pc',
      pos: { x: 100, y: 100 },
      hp: { current: 38, max: 38 },
      initiative: 19,
    },
    {
      id: 'token-goblin',
      name: 'Goblin Raider',
      initial: 'G',
      color: '#ffb4ab',
      kind: 'enemy',
      pos: { x: 200, y: 200 },
      hp: { current: 6, max: 6 },
      initiative: 12,
    },
    {
      id: 'token-wolf',
      name: 'Shadow Wolf',
      initial: 'W',
      color: '#c6c6c6',
      kind: 'npc',
      pos: { x: 300, y: 300 },
      hp: { current: 15, max: 15 },
      initiative: null,
    },
  ],
  shapes: [],
  labels: [],
  fog: { cols: 20, rows: 15, cells: new Array(300).fill(0) },
  initiative: {
    order: ['token-hero', 'token-goblin'],
    currentIndex: 0,
    round: 1,
  },
}

describe('InitiativePanel component', () => {
  beforeEach(() => {
    useMapStore.setState({
      map: mockMap,
    })
  })

  it('renders initiative header and round counter', () => {
    render(<InitiativePanel map={mockMap} isReadOnly={false} />)

    expect(screen.getByText('Iniziativa')).toBeInTheDocument()
    expect(screen.getByText('Round 1')).toBeInTheDocument()
  })

  it('renders tokens in initiative order and out-of-order tokens', () => {
    render(<InitiativePanel map={mockMap} isReadOnly={false} />)

    // Mazikeen and Goblin are in order
    expect(screen.getByText('Mazikeen')).toBeInTheDocument()
    expect(screen.getByText('Goblin Raider')).toBeInTheDocument()

    // Shadow Wolf is out of order
    expect(screen.getByText('Fuori turno')).toBeInTheDocument()
    expect(screen.getByText('Shadow Wolf')).toBeInTheDocument()
  })

  it('calls onTokenSelect when a token item is clicked', () => {
    let selectedId: string | null = null
    const onSelect = (id: string | null) => {
      selectedId = id
    }

    render(
      <InitiativePanel
        map={mockMap}
        isReadOnly={false}
        selectedTokenId={null}
        onTokenSelect={onSelect}
      />
    )

    const goblinItem = screen.getByText('Goblin Raider')
    fireEvent.click(goblinItem)

    expect(selectedId).toBe('token-goblin')
  })

  it('advances turn when Turno successivo button is clicked', () => {
    render(<InitiativePanel map={mockMap} isReadOnly={false} />)

    const advanceBtn = screen.getByRole('button', { name: /Turno successivo/i })
    fireEvent.click(advanceBtn)

    const state = useMapStore.getState()
    expect(state.map?.initiative.currentIndex).toBe(1)
  })

  it('hides controls when in readOnly mode', () => {
    render(<InitiativePanel map={mockMap} isReadOnly={true} />)

    expect(screen.queryByRole('button', { name: /Turno successivo/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Riordina/i })).not.toBeInTheDocument()
  })
})
