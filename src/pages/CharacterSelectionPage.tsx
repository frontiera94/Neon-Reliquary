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
  const [activeIndex, setActiveIndex] = useState(0)

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
  }, [])

  const chars = characters.length > 0 ? characters : []

  useEffect(() => {
    if (activeCharacterId) {
      const idx = chars.findIndex((c) => c.id === activeCharacterId)
      if (idx >= 0) setActiveIndex(idx)
    }
  }, [activeCharacterId, chars])

  const activeChar = chars[activeIndex]

  function handleManifest() {
    if (!activeChar) return
    setActiveCharacter(activeChar.id)
    initSession(activeChar.id, activeChar.maxHp)
    navigate('/status')
  }

  function prev() { setActiveIndex((i) => Math.max(0, i - 1)) }
  function next() { setActiveIndex((i) => Math.min(chars.length - 1, i + 1)) }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 md:px-12 overflow-hidden dark">
      {/* Header */}
      <div className="absolute top-8 text-center z-10">
        <span
          className="text-2xl font-black tracking-tighter text-primary uppercase font-headline cursor-pointer"
          onClick={() => navigate('/status')}
        >
          NEON RELIQUARY
        </span>
      </div>

      <div className="text-center mb-12 mt-20">
        <h2 className="font-headline text-secondary text-4xl md:text-6xl font-bold tracking-tight mb-2">
          CHOOSE YOUR RELIC
        </h2>
        <div className="w-24 h-1 bg-primary mx-auto mb-4 glow-pulse" />
        <p className="font-label text-on-surface-variant uppercase tracking-[0.2em] text-xs">
          Active Roster
        </p>
      </div>

      {/* Carousel */}
      <div className="relative flex items-center justify-center w-full max-w-5xl gap-4 md:gap-8">
        {/* Prev */}
        <button
          onClick={prev}
          disabled={activeIndex === 0}
          className="text-tertiary hover:text-primary disabled:opacity-20 transition-colors p-2 z-10"
        >
          <span className="material-symbols-outlined text-5xl">chevron_left</span>
        </button>

        {/* Cards — show active ± 1 only so the viewport always contains them */}
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
                      opacity: isActive ? 1 : 0.4,
                      x: 0,
                      scale: isActive ? 1 : 0.9,
                      filter: isActive ? 'grayscale(0%)' : 'grayscale(100%)',
                    }}
                    exit={{ opacity: 0, x: idx > activeIndex ? -80 : 80 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className={`flex-shrink-0 cursor-pointer ${isActive ? 'ring-4 ring-primary' : ''}`}
                    onClick={() => isActive ? handleManifest() : setActiveIndex(idx)}
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
          className="text-tertiary hover:text-primary disabled:opacity-20 transition-colors p-2 z-10"
        >
          <span className="material-symbols-outlined text-5xl">chevron_right</span>
        </button>
      </div>

      {/* Position indicator */}
      <div className="flex gap-2 mt-6">
        {chars.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`h-1 transition-all ${idx === activeIndex ? 'w-8 bg-primary' : 'w-2 bg-outline-variant/40'}`}
          />
        ))}
      </div>

      {/* CTA */}
      {activeChar && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 px-16 py-5 bg-gradient-to-br from-primary to-primary-container text-on-primary font-label text-sm uppercase tracking-widest hover:shadow-[0_0_30px_rgba(0,218,243,0.4)] transition-all active:scale-95"
          onClick={handleManifest}
        >
          Manifest Character — {activeChar.name}
        </motion.button>
      )}

      {/* GM link */}
      <div className="absolute bottom-6">
        <Link to="/gm" className="font-label text-xs text-tertiary hover:text-white transition-colors cursor-pointer">
          Modalità GM →
        </Link>
      </div>
    </div>
  )
}

function CharacterCard({ char, isActive }: { char: FullCharacter; isActive: boolean }) {
  return (
    <div className="relative overflow-hidden bg-surface-container" style={{ aspectRatio: '2/3' }}>
      {/* Portrait */}
      {char.portrait ? (
        <img src={char.portrait} alt={char.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-6xl">person</span>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-headline text-xl font-bold text-white leading-tight">{char.name}</h3>
        <p className="font-label text-xs text-tertiary uppercase tracking-widest">
          Lv {char.level} {char.class}
        </p>

        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3"
          >
            <div className="flex justify-between font-label text-[10px] text-primary mb-1">
              <span>HP</span>
              <span>{char.maxHp} max</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-lowest">
              <div className="h-full bg-primary" style={{ width: '100%' }} />
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="bg-surface-container-lowest px-2 py-0.5 font-label text-[9px] text-secondary uppercase tracking-widest">
                {char.race}
              </span>
              <span className="bg-surface-container-lowest px-2 py-0.5 font-label text-[9px] text-tertiary uppercase tracking-widest">
                {char.alignment}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
