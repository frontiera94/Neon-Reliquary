// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InspectorDrawer } from './InspectorDrawer'
import { useInspectorStore } from '../../store/useInspectorStore'
import { useLocaleStore } from '../../store/useLocaleStore'

describe('InspectorDrawer', () => {
  beforeEach(() => {
    useInspectorStore.setState({ isOpen: false, currentItem: null })
    useLocaleStore.setState({ locale: 'en' })
    document.body.style.overflow = ''
  })

  it('renders nothing when closed', () => {
    render(<InspectorDrawer />)
    expect(screen.queryByTestId('inspector-drawer')).not.toBeInTheDocument()
  })

  it('renders dialog with title, subtitle, tags, meta, notes, breakdown, and actions', () => {
    const actionSpy = vi.fn()
    useInspectorStore.getState().openInspector({
      type: 'spell',
      id: 'sp-1',
      title: 'Haste',
      subtitle: 'Level 3 · Transmutation',
      description: 'Grants +1 attack, +1 dodge AC, and +30 ft speed.',
      tags: ['Lvl 3', 'Buff'],
      meta: [{ label: 'Duration', value: '5 rounds' }],
      notes: ['Does not stack with itself'],
      breakdown: [
        { label: 'Dodge AC', value: 1 },
        { label: 'Penalty', value: -1 },
      ],
      actions: [{ label: 'Cast Spell', onClick: actionSpy, variant: 'primary' }],
    })

    render(<InspectorDrawer />)
    const drawer = screen.getByTestId('inspector-drawer')
    expect(drawer).toBeInTheDocument()
    expect(screen.getByText('Haste')).toBeInTheDocument()
    expect(screen.getByText('Duration')).toBeInTheDocument()
    expect(screen.getByText('Does not stack with itself')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cast Spell' }))
    expect(actionSpy).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape key and on close button click', () => {
    useInspectorStore.getState().openInspector({
      type: 'feat',
      id: 'f1',
      title: 'Dodge',
      description: '+1 dodge AC',
    })

    render(<InspectorDrawer />)
    expect(screen.getByTestId('inspector-drawer')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(useInspectorStore.getState().isOpen).toBe(false)

    useInspectorStore.getState().openInspector({
      type: 'feat',
      id: 'f1',
      title: 'Dodge',
      description: '+1 dodge AC',
    })
    const closeBtns = screen.getAllByRole('button', { name: /close/i })
    fireEvent.click(closeBtns[closeBtns.length - 1])
    expect(useInspectorStore.getState().isOpen).toBe(false)
  })
})
