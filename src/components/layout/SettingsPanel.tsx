import { useDiceStore } from '../../store/useDiceStore'
import { useChatStore } from '../../store/useChatStore'
import { useCharacterStore } from '../../store/useCharacterStore'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { history, clearHistory } = useDiceStore()
  const clearChat = useChatStore((s) => s.clearChat)
  const getMessages = useChatStore((s) => s.getMessages)
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId)
  const chatCount = activeCharacterId ? getMessages(activeCharacterId).length : 0

  return (
    <>
      {/* Backdrop — z-[40] keeps it below the sticky TopBar (z-50) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[40] bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Slide-in panel — z-[45] so the sticky TopBar always renders on top */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[45] w-full max-w-sm bg-surface-container border-l border-outline-variant/20 shadow-[-10px_0_40px_rgba(0,0,0,0.6)] flex flex-col transition-transform duration-300"
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Spacer to clear the sticky TopBar */}
        <div className="h-[73px] flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/20 flex-shrink-0">
          <h2 className="font-headline text-secondary text-sm uppercase tracking-widest">Settings</h2>
          <button
            onClick={onClose}
            className="text-tertiary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Chat AI */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-outline-variant/10">
          <span className="font-label text-xs text-tertiary uppercase tracking-widest">
            Chat AI ({chatCount})
          </span>
          {chatCount > 0 && activeCharacterId && (
            <button
              onClick={() => clearChat(activeCharacterId)}
              className="font-label text-[10px] uppercase tracking-widest text-tertiary hover:text-error transition-colors"
            >
              Cancella
            </button>
          )}
        </div>

        {/* Roll History */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 flex items-center justify-between border-b border-outline-variant/10">
            <span className="font-label text-xs text-tertiary uppercase tracking-widest">
              Roll History ({history.length})
            </span>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="font-label text-[10px] uppercase tracking-widest text-tertiary hover:text-error transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-label text-xs text-tertiary/50 uppercase tracking-widest">No rolls yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant/10">
              {history.map((roll) => (
                <li key={roll.id} className="px-6 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-label text-xs text-on-surface truncate">{roll.label}</p>
                    <p className="font-label text-[10px] text-tertiary mt-0.5">{roll.formula}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {roll.isCriticalThreat && (
                      <span className="font-label text-[9px] uppercase tracking-widest text-secondary border border-secondary/50 px-1.5 py-0.5">
                        CRIT
                      </span>
                    )}
                    <span
                      className="font-label text-2xl font-black"
                      style={{ color: roll.isCriticalThreat ? '#e9c349' : '#00daf3' }}
                    >
                      {roll.total}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
