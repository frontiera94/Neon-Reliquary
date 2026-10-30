import { useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { CloudSyncBadge } from '../components/sync/CloudSyncBadge'
import { useSyncRoster } from '../lib/useSyncRoster'
import type { FullCharacter } from '../store/useCharacterStore'

const DESKTOP_QUERY = '(min-width: 768px)'

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

export function CharacterSelectionPage() {
  const navigate = useNavigate()
  useSyncRoster()
  const { characters, setActiveCharacter, activeCharacterId } = useCharacterStore()
  const { initSession } = useSessionStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const isDesktop = useIsDesktop()

  const chars = characters
  const effectiveId = selectedId ?? activeCharacterId ?? chars[0]?.id
  const activeIndex = Math.max(0, chars.findIndex((c) => c.id === effectiveId))
  const activeChar = chars[activeIndex]

  function handleManifest() {
    if (!activeChar) return
    setActiveCharacter(activeChar.id)
    initSession(activeChar.id, activeChar.maxHp)
    navigate('/status')
  }

  function prev() {
    const prevIdx = Math.max(0, activeIndex - 1)
    setSelectedId(chars[prevIdx]?.id ?? null)
  }
  function next() {
    const nextIdx = Math.min(chars.length - 1, activeIndex + 1)
    setSelectedId(chars[nextIdx]?.id ?? null)
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-between px-3 sm:px-6 md:px-12 py-4 relative overflow-x-hidden dark">
      {/* Background glow orbs from lazy-cool cyber aesthetic */}
      <div className="glow-orb glow-orb-cyan -top-24 -right-24 w-96 h-96 pointer-events-none" />
      <div className="glow-orb glow-orb-magenta -bottom-24 -left-24 w-80 h-80 pointer-events-none" />

      {/* Top Header Bar */}
      <div className="w-full max-w-6xl flex items-center justify-between pt-2 pb-4 z-20">
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-primary/20 font-mono text-xs text-primary">
            <span className="text-secondary">&gt;</span>
            <span>reliquary:ready</span>
          </div>
          <span
            className="text-lg sm:text-2xl font-black tracking-tighter text-primary uppercase font-headline cursor-pointer neon-glow-cyan-soft select-none"
            onClick={() => navigate('/')}
          >
            NEON RELIQUARY
          </span>
        </div>

        <div className="flex items-center gap-2">
          <CloudSyncBadge compact={false} />
        </div>
      </div>

      {/* Hero Headline */}
      <div className="text-center my-auto pt-2 pb-4 z-10 px-2 max-w-2xl">
        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/30 font-label text-[10px] sm:text-[11px] text-primary uppercase tracking-[0.2em] mb-3">
          // Pathfinder 1E Companion
        </span>
        <h2 className="font-headline text-white text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-2">
          CHOOSE YOUR <span className="text-primary neon-glow">RELIC</span>
        </h2>
        <div className="w-16 sm:w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto mb-2 rounded-full" />
        <p className="font-label text-tertiary uppercase tracking-[0.2em] text-[10px] sm:text-xs">
          Active Party Roster · {chars.length} Heroes
        </p>
      </div>

      {/* Carousel */}
      <div className="relative flex items-center justify-center w-full max-w-5xl gap-1 sm:gap-4 md:gap-8 z-10 my-auto">
        {/* Prev */}
        <button
          onClick={prev}
          disabled={activeIndex === 0}
          className="text-tertiary hover:text-primary disabled:opacity-20 transition-colors p-1 sm:p-2 z-10 cursor-pointer rounded-full hover:bg-white/5 shrink-0"
          aria-label="Previous character"
        >
          <span className="material-symbols-outlined text-3xl sm:text-4xl md:text-5xl">chevron_left</span>
        </button>

        {/* Cards */}
        <div className="flex items-center justify-center gap-4 md:gap-8 overflow-hidden py-2 px-1">
          <AnimatePresence mode="popLayout">
            {chars
              .map((char, idx) => ({ char, idx }))
              .filter(({ idx }) => (isDesktop ? Math.abs(idx - activeIndex) <= 1 : idx === activeIndex))
              .map(({ char, idx }) => {
                const isActive = idx === activeIndex
                return (
                  <motion.div
                    key={char.id}
                    layout
                    initial={{ opacity: 0, x: idx > activeIndex ? 60 : -60 }}
                    animate={{
                      opacity: isActive ? 1 : 0.45,
                      x: 0,
                      scale: isActive ? 1 : 0.9,
                      filter: isActive ? 'grayscale(0%)' : 'grayscale(80%)',
                    }}
                    exit={{ opacity: 0, x: idx > activeIndex ? -60 : 60 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                    drag={!isDesktop ? 'x' : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_e, info) => {
                      if (info.offset.x < -40 || info.velocity.x < -300) {
                        next()
                      } else if (info.offset.x > 40 || info.velocity.x > 300) {
                        prev()
                      }
                    }}
                    className={`flex-shrink-0 cursor-pointer transition-all duration-300 rounded-2xl select-none ${
                      isActive ? 'ring-2 ring-primary shadow-[0_0_35px_rgba(0,240,255,0.3)]' : ''
                    }`}
                    onClick={() => (isActive ? handleManifest() : setSelectedId(char.id))}
                    style={{
                      width: isActive ? (isDesktop ? 280 : 250) : 200,
                    }}
                  >
                    <CharacterCard char={char} isActive={isActive} />
                  </motion.div>
                )
              })}
          </AnimatePresence>
        </div>

        {/* Next */}
        <button
          onClick={next}
          disabled={activeIndex === chars.length - 1}
          className="text-tertiary hover:text-primary disabled:opacity-20 transition-colors p-1 sm:p-2 z-10 cursor-pointer rounded-full hover:bg-white/5 shrink-0"
          aria-label="Next character"
        >
          <span className="material-symbols-outlined text-3xl sm:text-4xl md:text-5xl">chevron_right</span>
        </button>
      </div>

      {/* Quick Avatar Roster Strip */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 my-4 px-2 z-10 max-w-full overflow-x-auto py-1">
        {chars.map((c, idx) => {
          const isSelected = idx === activeIndex
          return (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`flex flex-col items-center gap-1 group transition-all duration-200 cursor-pointer p-1 rounded-xl shrink-0 ${
                isSelected ? 'scale-105' : 'opacity-60 hover:opacity-100'
              }`}
              aria-label={`Select ${c.name}`}
            >
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border transition-all ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/60 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                    : 'border-white/10 group-hover:border-white/30'
                } bg-surface-container-highest`}
              >
                {c.portrait ? (
                  <img src={c.portrait} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-primary text-base flex items-center justify-center h-full w-full">
                    person
                  </span>
                )}
              </div>
              <span
                className={`font-label text-[9px] sm:text-[10px] tracking-wider uppercase truncate max-w-[54px] sm:max-w-[64px] ${
                  isSelected ? 'text-primary font-bold' : 'text-tertiary'
                }`}
              >
                {c.name.split(' ')[0]}
              </span>
            </button>
          )
        })}
      </div>

      {/* CTA */}
      {activeChar && (
        <div className="w-full max-w-md flex justify-center pb-4 z-10 px-4">
          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full sm:w-auto px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-r from-primary to-primary-container text-black font-label font-bold text-xs sm:text-sm uppercase tracking-widest rounded-xl hover:shadow-[0_0_35px_rgba(0,240,255,0.45)] transition-all active:scale-95 cursor-pointer text-center"
            onClick={handleManifest}
          >
            Manifest Character — {activeChar.name}
          </motion.button>
        </div>
      )}
    </div>
  )
}

function CharacterCard({ char, isActive }: { char: FullCharacter; isActive: boolean }) {
  const session = useSessionStore((s) => s.sessions[char.id])
  const currentHp = session?.currentHp ?? char.maxHp
  const maxHp = char.maxHp
  const tempHp = session?.tempHp ?? 0
  const hpPct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100))
  const isDead = currentHp <= -(char.abilities.con ?? 10)
  const isDying = !isDead && currentHp < 0
  const isDisabled = currentHp === 0
  const activeBuffs = session?.activeBuffIds?.length ?? 0
  const conditions = session?.conditions?.length ?? 0

  return (
    <div className="relative overflow-hidden bg-surface-container rounded-2xl border border-white/10" style={{ aspectRatio: '2/3' }}>
      {/* Portrait */}
      {char.portrait ? (
        <img src={char.portrait} alt={char.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-6xl">person</span>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-transparent" />

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
        <h3 className="font-headline text-lg sm:text-xl font-bold text-white leading-tight truncate">{char.name}</h3>
        <p className="font-label text-[10px] sm:text-xs text-tertiary uppercase tracking-widest mt-0.5 truncate">
          Lv {char.level} {char.class}
        </p>

        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2.5 sm:mt-3.5"
          >
            <div className="flex justify-between font-label text-[9px] sm:text-[10px] text-primary mb-1">
              <span>HP</span>
              <span className="tabular-nums">
                {currentHp} / {maxHp}
                {tempHp > 0 && <span className="text-cyan-300 ml-1">+{tempHp}</span>}
              </span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-lowest rounded-full overflow-hidden border border-white/[0.06] relative">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${hpPct}%`,
                  background:
                    currentHp <= 0
                      ? '#ff4b60'
                      : currentHp < maxHp * 0.5
                      ? 'linear-gradient(90deg, #ff4b60 0%, #d946ef 100%)'
                      : 'linear-gradient(90deg, #00f0ff 0%, #00b4d8 100%)',
                }}
              />
            </div>
            <div className="flex gap-1.5 mt-2 sm:mt-2.5 flex-wrap items-center">
              <span className="bg-surface-container-highest px-2 py-0.5 font-label text-[8px] sm:text-[9px] text-secondary border border-secondary/30 rounded-md uppercase tracking-widest">
                {char.race}
              </span>
              <span className="bg-surface-container-highest px-2 py-0.5 font-label text-[8px] sm:text-[9px] text-tertiary border border-white/10 rounded-md uppercase tracking-widest">
                {char.alignment}
              </span>
              {isDead && (
                <span className="bg-error/20 text-error border border-error/50 px-1.5 py-0.5 font-label text-[8px] sm:text-[9px] rounded-md uppercase font-bold">
                  Dead
                </span>
              )}
              {isDying && (
                <span className="bg-error/20 text-error border border-error/50 px-1.5 py-0.5 font-label text-[8px] sm:text-[9px] rounded-md uppercase font-bold animate-pulse">
                  Dying
                </span>
              )}
              {isDisabled && (
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.5 font-label text-[8px] sm:text-[9px] rounded-md uppercase font-bold">
                  Disabled
                </span>
              )}
              {activeBuffs > 0 && (
                <span className="bg-primary/10 text-primary border border-primary/30 px-1.5 py-0.5 font-label text-[8px] sm:text-[9px] rounded-md uppercase">
                  {activeBuffs} buff{activeBuffs > 1 ? 's' : ''}
                </span>
              )}
              {conditions > 0 && (
                <span className="bg-error/10 text-error border border-error/30 px-1.5 py-0.5 font-label text-[8px] sm:text-[9px] rounded-md uppercase">
                  {conditions} cond
                </span>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
