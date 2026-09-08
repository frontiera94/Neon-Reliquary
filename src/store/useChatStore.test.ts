import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore, type ChatMessage } from './useChatStore'

describe('useChatStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useChatStore.setState({
      chats: {},
      isOpen: false,
      isLoading: false,
    })
  })

  describe('initial state', () => {
    it('initializes with closed chat, not loading, and empty chats map', () => {
      const state = useChatStore.getState()
      expect(state.chats).toEqual({})
      expect(state.isOpen).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(state.getMessages('any-char')).toEqual([])
    })
  })

  describe('openChat and closeChat', () => {
    it('sets isOpen to true when opened', () => {
      useChatStore.getState().openChat()
      expect(useChatStore.getState().isOpen).toBe(true)
    })

    it('sets isOpen to false when closed', () => {
      useChatStore.getState().openChat()
      useChatStore.getState().closeChat()
      expect(useChatStore.getState().isOpen).toBe(false)
    })
  })

  describe('setLoading', () => {
    it('updates isLoading boolean', () => {
      useChatStore.getState().setLoading(true)
      expect(useChatStore.getState().isLoading).toBe(true)

      useChatStore.getState().setLoading(false)
      expect(useChatStore.getState().isLoading).toBe(false)
    })
  })

  describe('appendMessage and getMessages', () => {
    it('appends messages to the specified character conversation', () => {
      const msg1: ChatMessage = { id: 'm1', role: 'user', content: 'Hello', ts: 1000 }
      const msg2: ChatMessage = { id: 'm2', role: 'assistant', content: 'Greetings!', ts: 2000 }

      useChatStore.getState().appendMessage('char-1', msg1)
      useChatStore.getState().appendMessage('char-1', msg2)

      const messages = useChatStore.getState().getMessages('char-1')
      expect(messages).toHaveLength(2)
      expect(messages[0]).toEqual(msg1)
      expect(messages[1]).toEqual(msg2)
    })

    it('isolates messages between different characters', () => {
      const msg1: ChatMessage = { id: 'm1', role: 'user', content: 'Hello Valerius', ts: 1000 }
      const msg2: ChatMessage = { id: 'm2', role: 'user', content: 'Hello Kaelen', ts: 2000 }

      useChatStore.getState().appendMessage('char-1', msg1)
      useChatStore.getState().appendMessage('char-2', msg2)

      expect(useChatStore.getState().getMessages('char-1')).toHaveLength(1)
      expect(useChatStore.getState().getMessages('char-1')[0].content).toBe('Hello Valerius')

      expect(useChatStore.getState().getMessages('char-2')).toHaveLength(1)
      expect(useChatStore.getState().getMessages('char-2')[0].content).toBe('Hello Kaelen')
    })
  })

  describe('clearChat', () => {
    it('clears messages only for the specified character', () => {
      const msg1: ChatMessage = { id: 'm1', role: 'user', content: 'A', ts: 1000 }
      const msg2: ChatMessage = { id: 'm2', role: 'user', content: 'B', ts: 1000 }

      useChatStore.getState().appendMessage('char-1', msg1)
      useChatStore.getState().appendMessage('char-2', msg2)

      useChatStore.getState().clearChat('char-1')

      expect(useChatStore.getState().getMessages('char-1')).toEqual([])
      expect(useChatStore.getState().getMessages('char-2')).toEqual([msg2])
    })
  })
})
