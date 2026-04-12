import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
}

interface ChatStore {
  chats: Record<string, ChatMessage[]>
  isOpen: boolean
  isLoading: boolean
  getMessages: (characterId: string) => ChatMessage[]
  appendMessage: (characterId: string, msg: ChatMessage) => void
  clearChat: (characterId: string) => void
  openChat: () => void
  closeChat: () => void
  setLoading: (v: boolean) => void
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chats: {},
      isOpen: false,
      isLoading: false,

      getMessages: (characterId) => get().chats[characterId] ?? [],

      appendMessage: (characterId, msg) =>
        set((s) => ({
          chats: {
            ...s.chats,
            [characterId]: [...(s.chats[characterId] ?? []), msg],
          },
        })),

      clearChat: (characterId) =>
        set((s) => ({
          chats: { ...s.chats, [characterId]: [] },
        })),

      openChat: () => set({ isOpen: true }),
      closeChat: () => set({ isOpen: false }),
      setLoading: (v) => set({ isLoading: v }),
    }),
    {
      name: 'neon-chats',
      partialize: (state) => ({ chats: state.chats }),
    }
  )
)
