import { useState } from 'react'
import { useDiceStore } from '../../store/useDiceStore'
import { useChatStore } from '../../store/useChatStore'
import { useCharacterStore } from '../../store/useCharacterStore'
import type { DiceType } from '../../types/dice'

const DICE_TYPES: DiceType[] = [4, 6, 8, 10, 12, 20, 100]

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { history, clearHistory, openRoll } = useDiceStore()
  const clearChat = useChatStore((s) => s.clearChat)
  const chats = useChatStore((s) => s.chats)
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId)
  const activeChar = useCharacterStore((s) => s.activeCharacter())
  const chatCount = activeCharacterId ? (chats[activeCharacterId]?.length ?? 0) : 0

  const [diceType, setDiceType] = useState<DiceType>(20)
  const [diceCount, setDiceCount] = useState(1)
  const [modifier, setModifier] = useState(0)
  const [rollLabel, setRollLabel] = useState('')

  return (
    <>
      {/* Backdrop — z-[40] keeps it below the sticky TopBar (z-50) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[40] bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Slide-in panel — z-[45] so the sticky TopBar always renders on top */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[45] w-full max-w-sm bg-surface-container/95 backdrop-blur-xl border-l border-white/10 flex flex-col transition-transform duration-300"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.7), -4px 0 30px -10px rgba(0,240,255,0.15)',
        }}
      >
        {/* Spacer to clear the sticky TopBar */}
        <div className="h-[73px] flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 flex-shrink-0 bg-surface-container-high/40">
          <h2 className="font-headline text-secondary text-sm uppercase tracking-widest neon-glow-accent font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="text-tertiary hover:text-primary transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
            aria-label="Chiudi"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Freeform Dice Roller */}
        <div className="px-6 py-4 border-b border-white/10 space-y-3">
          <span className="font-label text-xs text-tertiary uppercase tracking-widest">Custom Roll</span>
          <div className="flex flex-wrap gap-1.5">
            {DICE_TYPES.map((d) => (
              <button
                key={d}
                onClick={() => setDiceType(d)}
                className={`px-2.5 py-1 font-label text-[10px] uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                  diceType === d
                    ? 'bg-primary text-black font-bold shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                    : 'bg-surface-container-high text-tertiary hover:text-white hover:bg-surface-container-highest border border-white/5'
                }`}
              >
                d{d}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDiceCount((c) => Math.max(1, c - 1))}
                className="w-7 h-7 bg-surface-container-high text-tertiary hover:text-primary font-label text-sm rounded-md transition-all flex items-center justify-center cursor-pointer"
              >−</button>
              <span className="font-label text-sm text-on-surface w-6 text-center">{diceCount}</span>
              <button
                onClick={() => setDiceCount((c) => Math.min(10, c + 1))}
                className="w-7 h-7 bg-surface-container-high text-tertiary hover:text-primary font-label text-sm rounded-md transition-all flex items-center justify-center cursor-pointer"
              >+</button>
            </div>
            <span className="font-label text-xs text-tertiary">d{diceType}</span>
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setModifier((m) => m - 1)}
                className="w-7 h-7 bg-surface-container-high text-tertiary hover:text-primary font-label text-sm rounded-md transition-all flex items-center justify-center cursor-pointer"
              >−</button>
              <span className="font-label text-sm text-on-surface w-10 text-center">
                {modifier >= 0 ? `+${modifier}` : modifier}
              </span>
              <button
                onClick={() => setModifier((m) => m + 1)}
                className="w-7 h-7 bg-surface-container-high text-tertiary hover:text-primary font-label text-sm rounded-md transition-all flex items-center justify-center cursor-pointer"
              >+</button>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={rollLabel}
              onChange={(e) => setRollLabel(e.target.value)}
              placeholder="Label (optional)"
              className="flex-1 bg-surface-container-high px-3 py-2 font-label text-xs text-on-surface placeholder:text-tertiary/50 rounded-xl border border-white/10 focus:border-primary/50 focus:outline-none transition-colors"
            />
            <button
              onClick={() => openRoll({
                diceType,
                count: diceCount,
                modifier,
                label: rollLabel.trim() || `${diceCount}d${diceType}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`,
              })}
              className="px-4 py-2 bg-primary text-black font-bold font-label text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all active:scale-95 cursor-pointer"
            >
              Roll
            </button>
          </div>
        </div>

        {/* Chat AI */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
          <span className="font-label text-xs text-tertiary uppercase tracking-widest">
            Chat AI ({chatCount})
          </span>
          {chatCount > 0 && activeCharacterId && (
            <button
              onClick={() => clearChat(activeCharacterId)}
              className="font-label text-[10px] uppercase tracking-widest text-tertiary hover:text-error transition-colors cursor-pointer"
            >
              Cancella
            </button>
          )}
        </div>

        {/* Character Sheet PDF */}
        {activeChar?.pdfPath && (
          <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
            <span className="font-label text-xs text-tertiary uppercase tracking-widest">
              Character Sheet
            </span>
            <button
              onClick={() => window.open(activeChar.pdfPath, '_blank', 'noopener,noreferrer')}
              className="flex items-center gap-1.5 font-label text-[10px] uppercase tracking-widest text-tertiary hover:text-primary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">picture_as_pdf</span>
              Open PDF
            </button>
          </div>
        )}

        {/* Roll History */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
            <span className="font-label text-xs text-tertiary uppercase tracking-widest">
              Roll History ({history.length})
            </span>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="font-label text-[10px] uppercase tracking-widest text-tertiary hover:text-error transition-colors cursor-pointer"
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
            <ul className="divide-y divide-white/5">
              {history.map((roll) => (
                <li key={roll.id} className="px-6 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-label text-xs text-on-surface truncate">{roll.label}</p>
                    <p className="font-label text-[10px] text-tertiary mt-0.5">{roll.formula}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {roll.isCriticalThreat && (
                      <span className="font-label text-[9px] uppercase tracking-widest text-secondary border border-secondary/50 bg-secondary/15 px-2 py-0.5 rounded-full font-bold">
                        CRIT
                      </span>
                    )}
                    <span
                      className="font-label text-2xl font-black"
                      style={{ color: roll.isCriticalThreat ? '#d946ef' : '#00f0ff' }}
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
