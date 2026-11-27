import { useChatStore } from '../../store/useChatStore'

export function ChatFab() {
  const openChat = useChatStore((s) => s.openChat)
  const isOpen = useChatStore((s) => s.isOpen)

  if (isOpen) return null

  return (
    <button
      onClick={openChat}
      aria-label="Apri oracolo del personaggio"
      className="fixed bottom-[72px] md:bottom-6 right-3.5 md:right-6 z-[55] w-11 h-11 md:w-14 md:h-14 rounded-full bg-surface-container-highest/95 md:bg-primary border border-primary/50 md:border-transparent text-primary md:text-on-primary flex items-center justify-center shadow-[0_4px_20px_rgba(0,240,255,0.3)] md:glow-pulse hover:shadow-[0_0_30px_rgba(0,218,243,0.6)] transition-all active:scale-95 cursor-pointer"
    >
      <span className="material-symbols-outlined text-xl md:text-2xl">forum</span>
    </button>
  )
}
