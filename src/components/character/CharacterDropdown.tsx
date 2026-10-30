import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCharacterStore } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'
import { CharacterEmblem } from './CharacterEmblem'
import { getCharacterLore } from '../../lib/character-lore'
import type { FullCharacter } from '../../store/useCharacterStore'

export interface CharacterDropdownProps {
  align?: 'left' | 'right'
  variant?: 'cockpit' | 'sidebar'
  className?: string
  isOpen?: boolean
  onToggle?: () => void
  onClose?: () => void
}

export function CharacterDropdown({
  align = 'right',
  variant = 'cockpit',
  className = '',
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
  onClose: controlledOnClose,
}: CharacterDropdownProps) {
  const navigate = useNavigate()
  const characters = useCharacterStore((s) => s.characters)
  const activeChar = useCharacterStore((s) => s.activeCharacter())
  const setActiveCharacter = useCharacterStore((s) => s.setActiveCharacter)
  const initSession = useSessionStore((s) => s.initSession)

  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isControlled = controlledIsOpen !== undefined
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen

  const handleToggle = () => {
    if (controlledOnToggle) {
      controlledOnToggle()
    } else {
      setInternalIsOpen((prev) => !prev)
    }
  }

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose()
    } else {
      setInternalIsOpen(false)
    }
  }

  // Click outside and Escape key listener
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (!activeChar) return null

  const handleSelect = (c: FullCharacter) => {
    setActiveCharacter(c.id)
    initSession(c.id, c.maxHp)
    handleClose()
  }

  const activeLore = getCharacterLore(activeChar.id)

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      {variant === 'cockpit' ? (
        <button
          type="button"
          onClick={handleToggle}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label="Character Switcher"
          data-testid="character-dropdown-trigger"
          className="flex items-center gap-2 px-3 py-1.5 bg-surface-container/80 backdrop-blur-sm border border-white/10 text-white font-label text-xs rounded-xl hover:border-primary/50 hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_20px_rgba(0,240,255,0.25)] transition-all duration-300 cursor-pointer"
        >
          {/* Active character cyber emblem symbol */}
          <div className="w-5 h-5 rounded-md overflow-hidden flex-shrink-0">
            <CharacterEmblem
              characterId={activeChar.id}
              lore={activeLore}
              variant="avatar"
              className="w-full h-full"
            />
          </div>
          <span className="hidden xl:inline">Character Switcher</span>
          <span
            className={`material-symbols-outlined text-sm text-primary transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          >
            expand_more
          </span>
        </button>
      ) : (
        /* Sidebar variant trigger */
        <button
          type="button"
          onClick={handleToggle}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label="Character Switcher"
          data-testid="character-dropdown-trigger-sidebar"
          className="w-full flex items-center justify-between gap-3 p-2 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-primary/40 hover:bg-white/[0.04] transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 bg-surface-container-highest border border-primary/30 overflow-hidden flex-shrink-0 rounded-xl relative">
              {activeChar.portrait ? (
                <img
                  src={activeChar.portrait}
                  alt={activeChar.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full p-1">
                  <CharacterEmblem
                    characterId={activeChar.id}
                    lore={activeLore}
                    variant="avatar"
                    className="w-full h-full"
                  />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-headline text-white text-sm font-bold leading-tight truncate group-hover:text-primary transition-colors">
                {activeChar.name}
              </h3>
              <p className="font-label text-tertiary text-[10px] uppercase tracking-wider truncate">
                Lv {activeChar.level} {activeChar.class}
              </p>
            </div>
          </div>
          <span
            className={`material-symbols-outlined text-sm text-tertiary group-hover:text-primary transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-primary' : ''
            }`}
          >
            expand_more
          </span>
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Seleziona personaggio"
          data-testid="character-dropdown-menu"
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-surface-container-high/95 backdrop-blur-xl border border-primary/30 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(0,240,255,0.2)] py-2 z-[60] overflow-hidden`}
        >
          <div className="px-3.5 py-1.5 border-b border-white/[0.08] mb-1 flex items-center justify-between">
            <span className="font-label text-[10px] uppercase tracking-widest text-tertiary">
              Seleziona Personaggio
            </span>
            <span className="font-label text-[10px] text-primary font-mono">
              {characters.length}
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1 px-1.5 custom-scrollbar">
            {characters.map((c) => {
              const isSelected = c.id === activeChar.id
              const lore = getCharacterLore(c.id)

              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-testid={`character-dropdown-option-${c.id}`}
                  onClick={() => handleSelect(c)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-primary/15 border border-primary/40 text-primary shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                      : 'hover:bg-white/[0.06] border border-transparent text-on-surface hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Simbolo */}
                    <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0">
                      <CharacterEmblem
                        characterId={c.id}
                        lore={lore}
                        variant="avatar"
                        className="w-full h-full"
                      />
                    </div>

                    {/* Nome e basta! */}
                    <span
                      className={`font-headline text-sm font-bold truncate ${
                        isSelected ? 'text-primary' : 'text-on-surface group-hover:text-white'
                      }`}
                    >
                      {c.name}
                    </span>
                  </div>

                  {/* Active check indicator */}
                  {isSelected && (
                    <span className="material-symbols-outlined text-xs text-primary flex-shrink-0">
                      check
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Roster / Full selection navigation footer */}
          <div className="border-t border-white/[0.08] mt-1.5 pt-1 px-1.5">
            <button
              type="button"
              onClick={() => {
                handleClose()
                navigate('/characters')
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-tertiary hover:text-primary hover:bg-white/[0.04] rounded-lg transition-colors text-[11px] font-label uppercase tracking-wider cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">group</span>
              <span>Tutti i personaggi (Roster)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
