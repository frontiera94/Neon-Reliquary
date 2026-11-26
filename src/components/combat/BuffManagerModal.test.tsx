// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BuffManagerModal } from './BuffManagerModal'
import { useCharacterStore, type FullCharacter } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'
import { useLocaleStore } from '../../store/useLocaleStore'
import agelmundJson from '../../data/agelmund.json'

const agelmund = agelmundJson as unknown as FullCharacter

describe('BuffManagerModal', () => {
  beforeEach(() => {
    useCharacterStore.setState({ characters: [agelmund], activeCharacterId: agelmund.id })
    useSessionStore.setState({ sessions: {} })
    useSessionStore.getState().initSession(agelmund.id, agelmund.maxHp)
    useLocaleStore.setState({ locale: 'en' })
  })

  it('renders nothing when closed', () => {
    render(<BuffManagerModal isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('toggles a preset buff and creates a custom buff in session', () => {
    const onClose = vi.fn()
    render(<BuffManagerModal isOpen onClose={onClose} initialTab="create" />)

    const nameInput = screen.getByPlaceholderText(/Divine Favor/i)
    fireEvent.change(nameInput, { target: { value: 'Heroic Charge' } })

    const form = nameInput.closest('form')!
    fireEvent.submit(form)

    const session = useSessionStore.getState().getSession(agelmund.id)
    expect(session.customBuffs?.some((b) => b.name === 'Heroic Charge')).toBe(true)
    expect(session.activeBuffIds.some((id) => id.startsWith('custom-'))).toBe(true)
  })

  it('switches to conditions tab and toggles a condition', () => {
    render(<BuffManagerModal isOpen onClose={vi.fn()} initialTab="conditions" />)
    const shakenCard = screen.getByText(/shaken/i).closest('div[class*="rounded-2xl"]')!
    const toggleBtn = shakenCard.querySelector('button')!
    fireEvent.click(toggleBtn)

    const session = useSessionStore.getState().getSession(agelmund.id)
    expect(session.conditions).toContain('shaken')
  })
})
