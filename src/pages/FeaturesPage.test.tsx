// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeaturesPage } from './FeaturesPage'
import { useCharacterStore, type FullCharacter } from '../store/useCharacterStore'
import { useInspectorStore } from '../store/useInspectorStore'
import { useLocaleStore } from '../store/useLocaleStore'
import agelmundJson from '../data/agelmund.json'

const agelmund = agelmundJson as unknown as FullCharacter

describe('FeaturesPage', () => {
  beforeEach(() => {
    useCharacterStore.setState({ characters: [agelmund], activeCharacterId: agelmund.id })
    useInspectorStore.setState({ isOpen: false, currentItem: null })
    useLocaleStore.setState({ locale: 'en' })
  })

  it('shows empty state when no character is selected', () => {
    useCharacterStore.setState({ characters: [], activeCharacterId: '' })
    render(<FeaturesPage />)
    expect(screen.getByText(/no character selected/i)).toBeInTheDocument()
  })

  it('renders signature ability, feats, and class abilities and switches tabs', () => {
    render(<FeaturesPage />)
    expect(screen.getByText(/Features &/i)).toBeInTheDocument()
    expect(screen.getByText(agelmund.name)).toBeInTheDocument()

    // Switch to Feats tab and Class Abilities tab
    const featsTab = screen.getByRole('button', { name: /feats/i })
    fireEvent.click(featsTab)
    expect(screen.getByText(agelmund.feats[0].name)).toBeInTheDocument()

    const classTab = screen.getByRole('button', { name: /class/i })
    fireEvent.click(classTab)
    expect(screen.getAllByText(agelmund.classAbilities[0].name).length).toBeGreaterThanOrEqual(1)
  })

  it('filters feats and abilities by search query and clears search', () => {
    render(<FeaturesPage />)
    const input = screen.getByPlaceholderText(/search/i)
    const firstFeat = agelmund.feats[0].name
    fireEvent.change(input, { target: { value: firstFeat } })
    expect(screen.getByText(firstFeat)).toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'zzzzzz_nonexistent_feature' } })
    expect(screen.queryByText(firstFeat)).not.toBeInTheDocument()

    const clearBtn = screen.getByRole('button', { name: /clear/i })
    fireEvent.click(clearBtn)
    expect(screen.getByText(firstFeat)).toBeInTheDocument()
  })

  it('opens InspectorDrawer store when clicking a feat or class ability', () => {
    render(<FeaturesPage />)
    const inspectBtn = screen.getByRole('button', { name: `Inspect ${agelmund.feats[0].name}` })
    fireEvent.click(inspectBtn)
    expect(useInspectorStore.getState().isOpen).toBe(true)
    expect(useInspectorStore.getState().currentItem?.id).toBe(agelmund.feats[0].id)
  })
})
