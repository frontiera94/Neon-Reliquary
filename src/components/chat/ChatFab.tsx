import { useChatStore } from '../../store/useChatStore'

export function ChatFab() {
  const openChat = useChatStore((s) => s.openChat)
  const isOpen = useChatStore((s) => s.isOpen)

  if (isOpen) return null

  return (
    <button
      onClick={openChat}
      aria-label="Apri oracolo del personaggio"
      className="fixed bottom-[88px] md:bottom-6 right-6 z-[55] w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_0_20px_rgba(0,218,243,0.4)] hover:shadow-[0_0_30px_rgba(0,218,243,0.6)] transition-all active:scale-95"
    >
      <span className="material-symbols-outlined text-2xl">forum</span>
    </button>
  )
}
