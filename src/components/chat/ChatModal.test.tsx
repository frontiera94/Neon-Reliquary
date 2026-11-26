// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChatModal } from './ChatModal'
import { useChatStore } from '../../store/useChatStore'
import { useCharacterStore, type FullCharacter } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'
import { useLocaleStore } from '../../store/useLocaleStore'
import mazikeenJson from '../../data/mazikeen-noctis.json'

const mazikeen = mazikeenJson as unknown as FullCharacter

const mockCallChatApi = vi.fn()
vi.mock('../../lib/chat-client', () => ({
  callChatApi: (...args: unknown[]) => mockCallChatApi(...args),
}))

describe('ChatModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCharacterStore.setState({ characters: [mazikeen], activeCharacterId: mazikeen.id })
    useSessionStore.setState({ sessions: {} })
    useSessionStore.getState().initSession(mazikeen.id, mazikeen.maxHp)
    useChatStore.setState({ isOpen: false, isLoading: false, chats: {} })
    useLocaleStore.setState({ locale: 'en' })
  })

  it('does not render modal content when closed', () => {
    render(<ChatModal />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('renders suggestions when open and sends message on suggestion click', async () => {
    mockCallChatApi.mockResolvedValueOnce('Usa Evil Eye come azione standard.')
    useChatStore.setState({ isOpen: true })
    render(<ChatModal />)

    const buttons = screen.getAllByRole('button')
    const suggestionBtn = buttons.find((b) => b.textContent && b.textContent.length > 15 && !b.getAttribute('aria-label'))!
    fireEvent.click(suggestionBtn)

    await waitFor(() => {
      expect(mockCallChatApi).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(screen.getByText(/Usa Evil Eye come azione standard/i)).toBeInTheDocument()
    })
  })

  it('displays error message gracefully when API call fails', async () => {
    mockCallChatApi.mockRejectedValueOnce(new Error('Upstream HTTP 502'))
    useChatStore.setState({ isOpen: true })
    render(<ChatModal />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Come funziona Slumber?' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(screen.getByText(/Upstream HTTP 502/i)).toBeInTheDocument()
    })
  })

  it('closes on Escape key', () => {
    useChatStore.setState({ isOpen: true })
    render(<ChatModal />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useChatStore.getState().isOpen).toBe(false)
  })
})
