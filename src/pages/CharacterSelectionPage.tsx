import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import type { FullCharacter } from '../store/useCharacterStore'
import mazeData from '../data/mazikeen-noctis.json'
import shotrixData from '../data/shotrix-blackburn.json'
import knamData from '../data/knam.json'
import agelmundData from '../data/agelmund.json'
import marianoData from '../data/mariano-cardamomo.json'
import noorieData from '../data/noorie.json'

export function CharacterSelectionPage() {
  const navigate = useNavigate()
  const { characters, loadCharacter, removeCharacter, setActiveCharacter, activeCharacterId } = useCharacterStore()
  const { initSession } = useSessionStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Always sync character data from JSON files (loadCharacter upserts)
  useEffect(() => {
    removeCharacter('valerius')
    removeCharacter('kaelen')
    loadCharacter(mazeData as unknown as FullCharacter)
    loadCharacter(shotrixData as unknown as FullCharacter)
    loadCharacter(knamData as unknown as FullCharacter)
    loadCharacter(agelmundData as unknown as FullCharacter)
    loadCharacter(marianoData as unknown as FullCharacter)
    loadCharacter(noorieData as unknown as FullCharacter)
  }, [loadCharacter, removeCharacter])

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
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 md:px-12 relative overflow-hidden dark">
      {/* Background glow orbs from lazy-cool cyber aesthetic */}
      <div className="glow-orb glow-orb-cyan -top-24 -right-24 w-96 h-96" />
      <div className="glow-orb glow-orb-magenta -bottom-24 -left-24 w-80 h-80" />

      {/* Cyber terminal prompt tag */}
      <div className="absolute top-8 left-8 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-primary/20 font-mono text-xs text-primary z-20">
        <span className="text-secondary">&gt;</span>
        <span>reliquary:ready</span>
      </div>

      {/* Header */}
      <div className="absolute top-8 text-center z-20">
        <span
          className="text-2xl font-black tracking-tighter text-primary uppercase font-headline cursor-pointer neon-glow-cyan-soft"
          onClick={() => navigate('/status')}
        >
          NEON RELIQUARY
        </span>
      </div>

      <div className="text-center mb-10 mt-20 z-10">
        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/30 font-label text-[11px] text-primary uppercase tracking-[0.2em] mb-4">
          // Pathfinder 1E Companion
        </span>
        <h2 className="font-headline text-white text-4xl md:text-6xl font-extrabold tracking-tight mb-3">
          CHOOSE YOUR <span className="text-primary neon-glow">RELIC</span>
        </h2>
        <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto mb-3 rounded-full" />
        <p className="font-label text-tertiary uppercase tracking-[0.2em] text-xs">
          Active Roster
        </p>
      </div>

      {/* Carousel */}
      <div className="relative flex items-center justify-center w-full max-w-5xl gap-4 md:gap-8 z-10">
        {/* Prev */}
        <button
          onClick={prev}
          disabled={activeIndex === 0}
          className="text-tertiary hover:text-primary disabled:opacity-20 transition-colors p-2 z-10 cursor-pointer rounded-full hover:bg-white/5"
          aria-label="Previous character"
        >
          <span className="material-symbols-outlined text-5xl">chevron_left</span>
        </button>

        {/* Cards */}
        <div className="flex items-center gap-4 md:gap-8">
          <AnimatePresence mode="popLayout">
            {chars
              .map((char, idx) => ({ char, idx }))
              .filter(({ idx }) => Math.abs(idx - activeIndex) <= 1)
              .map(({ char, idx }) => {
                const isActive = idx === activeIndex
                return (
                  <motion.div
                    key={char.id}
                    layout
                    initial={{ opacity: 0, x: idx > activeIndex ? 80 : -80 }}
                    animate={{
                      opacity: isActive ? 1 : 0.45,
                      x: 0,
                      scale: isActive ? 1 : 0.9,
                      filter: isActive ? 'grayscale(0%)' : 'grayscale(80%)',
                    }}
                    exit={{ opacity: 0, x: idx > activeIndex ? -80 : 80 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className={`flex-shrink-0 cursor-pointer transition-all duration-300 rounded-2xl ${
                      isActive ? 'ring-2 ring-primary shadow-[0_0_35px_rgba(0,240,255,0.3)]' : ''
                    }`}
                    onClick={() => isActive ? handleManifest() : setSelectedId(char.id)}
                    style={{ width: isActive ? 280 : 200 }}
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
          className="text-tertiary hover:text-primary disabled:opacity-20 transition-colors p-2 z-10 cursor-pointer rounded-full hover:bg-white/5"
          aria-label="Next character"
        >
          <span className="material-symbols-outlined text-5xl">chevron_right</span>
        </button>
      </div>

      {/* Position indicator */}
      <div className="flex gap-2 mt-6 z-10">
        {chars.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedId(chars[idx]?.id ?? null)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              idx === activeIndex ? 'w-8 bg-primary shadow-[0_0_8px_#00f0ff]' : 'w-2 bg-white/20'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* CTA */}
      {activeChar && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 px-12 py-4 bg-gradient-to-r from-primary to-primary-container text-black font-label font-bold text-sm uppercase tracking-widest rounded-xl hover:shadow-[0_0_35px_rgba(0,240,255,0.45)] transition-all active:scale-95 cursor-pointer z-10"
          onClick={handleManifest}
        >
          Manifest Character — {activeChar.name}
        </motion.button>
      )}

      {/* GM link */}
      <div className="absolute bottom-6 z-10">
        <Link to="/gm" className="font-label text-xs text-tertiary hover:text-white transition-colors cursor-pointer">
          Modalità GM →
        </Link>
      </div>
    </div>
  )
}

function CharacterCard({ char, isActive }: { char: FullCharacter; isActive: boolean }) {
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
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="font-headline text-xl font-bold text-white leading-tight">{char.name}</h3>
        <p className="font-label text-xs text-tertiary uppercase tracking-widest mt-0.5">
          Lv {char.level} {char.class}
        </p>

        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3.5"
          >
            <div className="flex justify-between font-label text-[10px] text-primary mb-1">
              <span>HP</span>
              <span>{char.maxHp} max</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-lowest rounded-full overflow-hidden border border-white/[0.06]">
              <div className="h-full bg-primary rounded-full" style={{ width: '100%' }} />
            </div>
            <div className="flex gap-2 mt-2.5 flex-wrap">
              <span className="bg-surface-container-highest px-2 py-0.5 font-label text-[9px] text-secondary border border-secondary/30 rounded-md uppercase tracking-widest">
                {char.race}
              </span>
              <span className="bg-surface-container-highest px-2 py-0.5 font-label text-[9px] text-tertiary border border-white/10 rounded-md uppercase tracking-widest">
                {char.alignment}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
