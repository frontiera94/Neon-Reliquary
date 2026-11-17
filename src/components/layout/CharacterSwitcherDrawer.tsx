import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCharacterStore } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'

const DESKTOP_QUERY = '(min-width: 1024px)'

function subscribeDesktop(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(DESKTOP_QUERY)
  query.addEventListener?.('change', callback)
  return () => query.removeEventListener?.('change', callback)
}

function getDesktopSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(DESKTOP_QUERY).matches
}

function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, () => false)
}

interface CharacterSwitcherDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function CharacterSwitcherDrawer({ isOpen, onClose }: CharacterSwitcherDrawerProps) {
  const navigate = useNavigate()
  const characters = useCharacterStore((s) => s.characters)
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId)
  const setActiveCharacter = useCharacterStore((s) => s.setActiveCharacter)
  const sessions = useSessionStore((s) => s.sessions)
  const initSession = useSessionStore((s) => s.initSession)
  const isDesktop = useIsDesktop()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 40)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(focusTimer)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSelectCharacter = (charId: string, maxHp: number) => {
    setActiveCharacter(charId)
    initSession(charId, maxHp)
    onClose()
  }

  const handleOpenFullRoster = () => {
    onClose()
    navigate('/characters')
  }

  return (
    <div className="fixed inset-0 z-[80]">
      {/* Backdrop */}
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        aria-label="Close character menu backdrop"
        onClick={onClose}
        className="absolute inset-0 w-full h-full bg-black/70 backdrop-blur-sm cursor-default"
      />

      {/* Drawer / Bottom-Sheet */}
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-switcher-title"
        data-testid="character-switcher-drawer"
        initial={isDesktop ? { x: '100%' } : { y: '100%' }}
        animate={isDesktop ? { x: 0 } : { y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="absolute right-0 bottom-0 left-0 lg:top-0 lg:left-auto lg:bottom-0 lg:w-[440px] max-h-[85vh] lg:max-h-none bg-[#11131c] border border-white/10 lg:border-y-0 lg:border-r-0 rounded-t-3xl lg:rounded-none shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden"
      >
        {/* Grab Handle for Mobile */}
        <div className="lg:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10 bg-[#181b26]/70">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-label text-[10px] uppercase tracking-[0.2em] text-secondary font-bold">
                Party Roster
              </span>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-label text-[10px] font-bold">
                {characters.length}
              </span>
            </div>
            <h2 id="character-switcher-title" className="font-headline text-lg font-bold text-white mt-0.5 truncate">
              Switch Character
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close character menu"
            className="text-tertiary hover:text-primary transition-colors p-1.5 rounded-xl hover:bg-white/5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Character Cards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {characters.map((char) => {
            const isActive = char.id === activeCharacterId
            const session = sessions[char.id]
            const hp = session?.currentHp ?? char.maxHp
            const maxHp = char.maxHp
            const tempHp = session?.tempHp ?? 0
            const nonlethal = session?.nonlethalDamage ?? 0
            const conScore = char.abilities.con ?? 10

            const scaleMax = Math.max(maxHp, Math.max(0, hp) + tempHp)
            const pctCurrent = Math.max(0, Math.min(100, (Math.max(0, hp) / scaleMax) * 100))

            const isDead = hp <= -conScore
            const isDying = !isDead && hp < 0
            const isDisabled = hp === 0
            const isUnconscious = hp > 0 && nonlethal > hp
            const conditions = session?.conditions ?? []
            const activeBuffs = session?.activeBuffIds?.length ?? 0

            return (
              <button
                key={char.id}
                type="button"
                onClick={() => handleSelectCharacter(char.id, char.maxHp)}
                aria-label={`Select ${char.name}${isActive ? ' (currently active)' : ''}`}
                className={`w-full text-left p-3 rounded-2xl transition-all duration-200 cursor-pointer border relative overflow-hidden group ${
                  isActive
                    ? 'bg-primary/10 border-primary/50 shadow-[0_0_20px_rgba(0,240,255,0.15)] ring-1 ring-primary/40'
                    : 'bg-surface-container/60 hover:bg-surface-container-high/80 border-white/[0.08] hover:border-white/20'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                    <div className="absolute transform rotate-45 bg-primary text-black text-[9px] font-label font-black uppercase py-0.5 right-[-35px] top-[18px] w-[120px] text-center shadow-sm">
                      Active
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border ${
                    isActive ? 'border-primary shadow-[0_0_10px_rgba(0,240,255,0.3)]' : 'border-white/10'
                  } bg-surface-container-highest`}>
                    {char.portrait ? (
                      <img src={char.portrait} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-primary flex items-center justify-center h-full w-full">
                        person
                      </span>
                    )}
                  </div>

                  {/* Info & Vitals */}
                  <div className="min-w-0 flex-1 pr-6">
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline text-sm font-bold text-white truncate leading-tight">
                        {char.name}
                      </h3>
                    </div>
                    <p className="font-label text-[10px] text-tertiary uppercase tracking-wider truncate mt-0.5">
                      Lv {char.level} {char.class} · {char.race}
                    </p>

                    {/* Mini HP bar & numbers */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 bg-surface-container-lowest rounded-full overflow-hidden border border-white/[0.06] relative">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${pctCurrent}%`,
                            background:
                              hp <= 0
                                ? '#ff4b60'
                                : hp < maxHp * 0.5
                                ? 'linear-gradient(90deg, #ff4b60 0%, #d946ef 100%)'
                                : 'linear-gradient(90deg, #00f0ff 0%, #00b4d8 100%)',
                          }}
                        />
                      </div>
                      <span className="font-label text-[10px] font-bold text-primary tabular-nums shrink-0">
                        {hp}/{maxHp}
                        {tempHp > 0 && <span className="text-cyan-300 ml-1">+{tempHp}</span>}
                      </span>
                    </div>

                    {/* Status Pills */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {isDead && (
                        <span className="font-label text-[8px] font-black uppercase text-error bg-error/20 border border-error/50 px-1 rounded">
                          DEAD
                        </span>
                      )}
                      {isDying && (
                        <span className="font-label text-[8px] font-black uppercase text-error bg-error/20 border border-error/50 px-1 rounded animate-pulse">
                          DYING
                        </span>
                      )}
                      {isDisabled && (
                        <span className="font-label text-[8px] font-bold uppercase text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1 rounded">
                          DISABLED
                        </span>
                      )}
                      {isUnconscious && (
                        <span className="font-label text-[8px] font-bold uppercase text-[#ffb4ab] bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 px-1 rounded animate-pulse">
                          UNCONSCIOUS
                        </span>
                      )}
                      {conditions.length > 0 && (
                        <span className="font-label text-[8px] text-error bg-error/15 border border-error/30 px-1 rounded uppercase">
                          {conditions.length} cond
                        </span>
                      )}
                      {activeBuffs > 0 && (
                        <span className="font-label text-[8px] text-primary bg-primary/10 border border-primary/30 px-1 rounded uppercase">
                          {activeBuffs} buff{activeBuffs > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#181b26]/60">
          <button
            type="button"
            onClick={handleOpenFullRoster}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-surface-container-highest/60 hover:bg-primary/15 border border-white/10 hover:border-primary/40 text-tertiary hover:text-primary transition-all font-label text-xs uppercase tracking-widest cursor-pointer group"
          >
            <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">
              grid_view
            </span>
            <span>Open Full Roster Page</span>
          </button>
        </div>
      </motion.aside>
    </div>
  )
}
