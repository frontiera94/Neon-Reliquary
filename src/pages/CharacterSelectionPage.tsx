import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { CloudSyncBadge } from '../components/sync/CloudSyncBadge'
import { CharacterEmblem } from '../components/character/CharacterEmblem'
import { SettingsPanel } from '../components/layout/SettingsPanel'
import { useSheetQueueStore } from '../store/useSheetQueueStore'
import { getCharacterLore, isPlaceholderPortrait } from '../lib/character-lore'
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
  const [settingsOpen, setSettingsOpen] = useState(false)

  const newSheetsCount = useSheetQueueStore((s) => s.newCount())
  const fetchSheets = useSheetQueueStore((s) => s.fetchSheets)

  useEffect(() => {
    void fetchSheets()
  }, [fetchSheets])

  // Seed default roster
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
  const effectiveId = selectedId ?? activeCharacterId ?? chars[0]?.id ?? ''
  const activeIndex = Math.max(0, chars.findIndex((c) => c.id === effectiveId))
  const activeChar = chars[activeIndex] ?? chars[0]

  const handleManifest = useCallback(() => {
    if (!activeChar) return
    setActiveCharacter(activeChar.id)
    initSession(activeChar.id, activeChar.maxHp)
    window.scrollTo(0, 0)
    navigate('/status')
  }, [activeChar, setActiveCharacter, initSession, navigate])

  const selectRelative = useCallback(
    (offset: number) => {
      if (chars.length === 0) return
      const nextIdx = (activeIndex + offset + chars.length) % chars.length
      setSelectedId(chars[nextIdx].id)
    },
    [activeIndex, chars]
  )

  // Keyboard navigation: Arrow keys cycle, Enter manifests
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        selectRelative(1)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        selectRelative(-1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleManifest()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectRelative, handleManifest])

  if (!activeChar) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-tertiary font-label">
        Inizializzazione Roster...
      </div>
    )
  }

  const isCurrentlyActive = activeChar.id === activeCharacterId
  const activeLore = getCharacterLore(activeChar.id)

  return (
    <div className="min-h-screen bg-surface flex flex-col text-on-surface relative overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      {/* Ambient Cyber Orbs */}
      <div className="glow-orb glow-orb-cyan -top-32 -right-32 w-96 h-96 pointer-events-none opacity-20" />
      <div className="glow-orb glow-orb-magenta -bottom-32 -left-32 w-96 h-96 pointer-events-none opacity-15" />

      {/* Header bar: Responsive Flex layout */}
      <header className="w-full z-20 px-4 md:px-8 py-4 border-b border-white/[0.06] bg-surface/75 backdrop-blur-md sticky top-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 border border-primary/25 font-mono text-xs text-primary">
            <span className="text-secondary">&gt;</span>
            <span>reliquary:ready</span>
          </div>
          <span
            className="text-xl md:text-2xl font-black tracking-tight text-primary uppercase font-headline cursor-pointer neon-glow-cyan-soft hover:opacity-90 transition-opacity"
            onClick={() => navigate('/')}
          >
            NEON RELIQUARY
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 font-label text-[11px] text-tertiary uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            Pathfinder 1E Roster
          </span>
          <CloudSyncBadge compact={false} />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Gestione Schede"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-primary/40 hover:bg-primary/10 text-tertiary hover:text-primary font-label text-xs uppercase tracking-wider transition-all cursor-pointer relative"
            title="Archivio e Caricamento Schede"
          >
            <span className="material-symbols-outlined text-sm">folder_shared</span>
            <span className="hidden sm:inline">Schede</span>
            {newSheetsCount > 0 && (
              <span
                data-testid="sheets-notification-badge-roster"
                className="w-4 h-4 rounded-full bg-primary text-black font-label text-[9px] font-black flex items-center justify-center shadow-[0_0_8px_rgba(0,240,255,0.6)] animate-pulse"
              >
                {newSheetsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content: Desktop Split View & Mobile Stack */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 z-10 flex flex-col justify-start">
        {/* Title & Subtitle */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-label text-xs text-primary font-bold tracking-widest uppercase">
                // ARCHIVE SELECTION
              </span>
              <span className="text-white/20">•</span>
              <span className="font-label text-xs text-tertiary">
                {String(activeIndex + 1).padStart(2, '0')} / {String(chars.length).padStart(2, '0')}
              </span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white uppercase">
              CHOOSE YOUR <span className="text-primary neon-glow">RELIC</span>
            </h1>
          </div>

          {/* Quick Keyboard indicator on desktop */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-tertiary/70 bg-white/[0.02] border border-white/10 px-3 py-1.5 rounded-xl">
            <span>Usa</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">↓</kbd>
            <span>o</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Invio</kbd>
          </div>
        </div>

        {/* Mobile Quick Selector Strip (Visible on mobile/tablet) */}
        <div className="lg:hidden mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label text-xs uppercase tracking-wider text-tertiary font-bold">
              Seleziona Personaggio
            </span>
            <span className="font-mono text-[11px] text-primary">
              Swipe orizzontale attivo
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
            {chars.map((char) => {
              const isSelected = char.id === activeChar.id
              const isCharActive = char.id === activeCharacterId
              const lore = getCharacterLore(char.id)
              return (
                <button
                  key={char.id}
                  onClick={() => setSelectedId(char.id)}
                  className={`flex-shrink-0 snap-start flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary/15 border-primary shadow-[0_0_15px_rgba(0,240,255,0.25)] text-white'
                      : 'bg-surface-container/80 border-white/10 text-tertiary hover:border-white/20'
                  }`}
                  aria-label={`Quick select ${char.name}`}
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                    <CharacterEmblem characterId={char.id} lore={lore} variant="avatar" className="w-full h-full" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <p className={`font-headline text-xs font-bold leading-tight ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                        {char.name.split(' ')[0]}
                      </p>
                      {isCharActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_6px_#d946ef]" />
                      )}
                    </div>
                    <p className="font-label text-[10px] text-tertiary tracking-wider uppercase">
                      Lv {char.level} {char.class}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Layout Grid: Desktop Master-Detail (5/7) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Active Roster List (Desktop) */}
          <section className="hidden lg:flex lg:col-span-5 flex-col gap-2.5" aria-label="Roster personaggi">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="font-label text-xs uppercase tracking-widest text-tertiary font-bold">
                Active Roster ({chars.length})
              </span>
              <span className="font-mono text-[11px] text-tertiary/70">
                Seleziona per i dettagli
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {chars.map((char, idx) => {
                const isSelected = char.id === activeChar.id
                const isCharActive = char.id === activeCharacterId
                const lore = getCharacterLore(char.id)

                return (
                  <RosterItemCard
                    key={char.id}
                    char={char}
                    lore={lore}
                    isSelected={isSelected}
                    isCharActive={isCharActive}
                    index={idx}
                    onSelect={() => setSelectedId(char.id)}
                  />
                )
              })}
            </div>
          </section>

          {/* RIGHT: Character Spotlight Panel */}
          <section className="lg:col-span-7 flex flex-col" aria-label="Dettagli personaggio">
            <motion.div
              key={activeChar.id}
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_e, info) => {
                if (info.offset.x < -40) selectRelative(1)
                if (info.offset.x > 40) selectRelative(-1)
              }}
              className="glass-card rounded-2xl md:rounded-3xl border border-white/10 p-5 md:p-7 relative overflow-hidden flex flex-col gap-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] min-h-[500px]"
            >
              {/* Active Badge Marker */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary tracking-widest uppercase">
                    DOSSIER // {activeChar.id.toUpperCase()}
                  </span>
                  {isCurrentlyActive && (
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary/15 border border-secondary/40 font-label text-[10px] text-secondary font-bold tracking-widest uppercase flex items-center gap-1.5 shadow-[0_0_10px_rgba(217,70,239,0.25)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                      Sessione Attiva
                    </span>
                  )}
                </div>

                {/* Mobile Arrows to switch */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => selectRelative(-1)}
                    className="p-1 rounded-lg text-tertiary hover:text-primary hover:bg-white/5 transition-colors cursor-pointer"
                    aria-label="Personaggio precedente"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                  </button>
                  <span className="font-mono text-xs text-tertiary px-1">
                    {activeIndex + 1}/{chars.length}
                  </span>
                  <button
                    onClick={() => selectRelative(1)}
                    className="p-1 rounded-lg text-tertiary hover:text-primary hover:bg-white/5 transition-colors cursor-pointer"
                    aria-label="Personaggio successivo"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* Identity Header: Hero Emblem + Main Titles */}
              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] md:grid-cols-[200px_1fr] gap-6 items-center">
                {/* Hero Art / Emblem */}
                <div className="w-full aspect-square max-w-[200px] mx-auto sm:mx-0">
                  {!isPlaceholderPortrait(activeChar.portrait) ? (
                    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_25px_rgba(0,240,255,0.2)]">
                      <img
                        src={activeChar.portrait}
                        alt={activeChar.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    </div>
                  ) : (
                    <CharacterEmblem
                      characterId={activeChar.id}
                      lore={activeLore}
                      variant="hero"
                      className="w-full h-full"
                    />
                  )}
                </div>

                {/* Identity Titles & Pills */}
                <div className="flex flex-col gap-2.5">
                  <div>
                    <p className="font-label text-xs uppercase tracking-widest text-primary font-bold">
                      {activeLore.archetype}
                    </p>
                    <h2 className="font-headline text-2xl sm:text-3xl font-extrabold text-white leading-tight mt-0.5">
                      {activeChar.name}
                    </h2>
                  </div>

                  {/* Core Identity Pills: Race, Alignment, Level & Class */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="px-3 py-1 rounded-lg bg-surface-container-high border border-white/10 font-label text-xs text-white uppercase tracking-wider font-semibold">
                      Lv {activeChar.level} {activeChar.class}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/30 font-label text-xs text-primary uppercase tracking-wider font-semibold">
                      {activeChar.race}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-lg border font-label text-xs uppercase tracking-wider font-bold ${
                        activeChar.alignment.toLowerCase().includes('evil')
                          ? 'bg-secondary/10 border-secondary/40 text-secondary'
                          : activeChar.alignment.toLowerCase().includes('good')
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-tertiary'
                      }`}
                    >
                      {activeChar.alignment}
                    </span>
                  </div>

                  {/* Quote */}
                  <p className="font-body italic text-sm text-on-surface-variant/90 border-l-2 border-primary/50 pl-3 py-0.5 mt-1">
                    {activeLore.quote}
                  </p>
                </div>
              </div>

              {/* Bio / Profilo Tattico */}
              <div className="bg-surface-container/60 rounded-xl p-4 border border-white/[0.06]">
                <p className="font-label text-[11px] uppercase tracking-wider text-tertiary font-bold mb-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary">feed</span>
                  Profilo Identitario
                </p>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                  {activeLore.bio}
                </p>
              </div>



              {/* Compagno / Famiglio Legato (se presente) */}
              {activeChar.companions && activeChar.companions.length > 0 && (
                <div className="bg-surface-container/70 rounded-xl p-3.5 border border-primary/25 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 border border-primary/30 flex-shrink-0 flex items-center justify-center">
                      {activeChar.companions[0].portrait ? (
                        <img
                          src={activeChar.companions[0].portrait}
                          alt={activeChar.companions[0].name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-primary text-xl">pets</span>
                      )}
                    </div>
                    <div>
                      <p className="font-headline text-sm font-bold text-white">
                        {activeChar.companions[0].name}
                      </p>
                      <p className="font-label text-[11px] text-tertiary tracking-wide uppercase">
                        {activeChar.companions[0].type.replace('_', ' ')} • {activeChar.companions[0].species} • HP {activeChar.companions[0].maxHp}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/30 font-label text-[10px] text-primary uppercase font-bold tracking-widest flex-shrink-0">
                    Legame Attivo
                  </span>
                </div>
              )}

              {/* Live Vitality Bar */}
              <VitalitySummaryStrip char={activeChar} />

              {/* Main Action Call to Action */}
              <div className="pt-2">
                <button
                  onClick={handleManifest}
                  className="w-full py-4 px-6 bg-gradient-to-r from-primary via-primary-soft to-primary text-black font-label font-bold text-sm uppercase tracking-widest rounded-xl hover:shadow-[0_0_35px_rgba(0,240,255,0.45)] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">
                    {isCurrentlyActive ? 'play_arrow' : 'login'}
                  </span>
                  <span>
                    {isCurrentlyActive
                      ? `Resume Session — ${activeChar.name}`
                      : `Manifest Character — ${activeChar.name}`}
                  </span>
                </button>
              </div>
            </motion.div>
          </section>
        </div>
      </main>
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab="sheets"
      />
    </div>
  )
}

interface RosterItemCardProps {
  char: FullCharacter
  lore: ReturnType<typeof getCharacterLore>
  isSelected: boolean
  isCharActive: boolean
  index: number
  onSelect: () => void
}

function RosterItemCard({
  char,
  lore,
  isSelected,
  isCharActive,
  index,
  onSelect,
}: RosterItemCardProps) {
  const session = useSessionStore((s) => s.sessions[char.id])
  const currentHp = session?.currentHp ?? char.maxHp
  const maxHp = char.maxHp
  const hpPct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100))
  const isDead = currentHp <= -(char.abilities.con ?? 10)
  const isDying = !isDead && currentHp < 0

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group flex items-center gap-3.5 ${
        isSelected
          ? 'bg-surface-container-high border-primary ring-1 ring-primary shadow-[0_0_20px_rgba(0,240,255,0.18)]'
          : 'bg-surface-container/70 border-white/[0.08] hover:bg-surface-container hover:border-white/20'
      }`}
      aria-label={`Select ${char.name}`}
    >
      {/* Active selection bar indicator on left */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_8px_#00f0ff]" />
      )}

      {/* Emblem / Avatar */}
      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-surface-container-lowest border border-white/10">
        <CharacterEmblem characterId={char.id} lore={lore} variant="avatar" className="w-full h-full" />
      </div>

      {/* Character Core Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className={`font-headline text-sm sm:text-base font-bold truncate ${isSelected ? 'text-white' : 'text-on-surface group-hover:text-white'}`}>
            {char.name}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isCharActive && (
              <span className="px-1.5 py-0.5 rounded bg-secondary/15 border border-secondary/30 font-label text-[10px] text-secondary font-bold uppercase tracking-widest">
                Active
              </span>
            )}
            <span className="font-mono text-[10px] text-tertiary">
              #{String(index + 1).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <p className="font-label text-xs text-primary font-medium tracking-wide">
            Lv {char.level} {char.class}
          </p>
          <span className="text-white/20 text-xs">•</span>
          <p className="font-label text-xs text-tertiary truncate">
            {char.race}
          </p>
        </div>

        {/* Mini HP bar */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 bg-surface-container-lowest rounded-full overflow-hidden border border-white/[0.06]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${hpPct}%`,
                background:
                  currentHp <= 0
                    ? '#ff4b60'
                    : currentHp < maxHp * 0.5
                    ? '#f59e0b'
                    : '#00f0ff',
              }}
            />
          </div>
          <span className="font-mono text-[10px] text-tertiary tabular-nums">
            {currentHp}/{maxHp}
          </span>
          {isDead && (
            <span className="font-label text-[10px] uppercase text-error font-bold">Dead</span>
          )}
          {isDying && (
            <span className="font-label text-[10px] uppercase text-error font-bold animate-pulse">Dying</span>
          )}
        </div>
      </div>
    </button>
  )
}

function VitalitySummaryStrip({ char }: { char: FullCharacter }) {
  const session = useSessionStore((s) => s.sessions[char.id])
  const currentHp = session?.currentHp ?? char.maxHp
  const maxHp = char.maxHp
  const tempHp = session?.tempHp ?? 0
  const nonlethal = session?.nonlethalDamage ?? 0
  const hpPct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100))

  const isDead = currentHp <= -(char.abilities.con ?? 10)
  const isDying = !isDead && currentHp < 0
  const isDisabled = currentHp === 0
  const activeBuffs = session?.activeBuffIds?.length ?? 0
  const conditions = session?.conditions?.length ?? 0

  return (
    <div className="bg-surface-container/60 rounded-xl p-3.5 border border-white/[0.06]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-label text-xs text-tertiary uppercase tracking-wider font-bold">
          Stato Vitale & Sessione
        </span>
        <span className="font-mono text-xs text-primary font-bold tabular-nums">
          {currentHp} / {maxHp} HP
          {tempHp > 0 && <span className="text-cyan-300 ml-1">+{tempHp} TEMP</span>}
          {nonlethal > 0 && <span className="text-[#ffb4ab] ml-1">({nonlethal} NL)</span>}
        </span>
      </div>

      <div className="h-2 w-full bg-surface-container-lowest rounded-full overflow-hidden border border-white/[0.08] relative mb-2">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${hpPct}%`,
            background:
              currentHp <= 0
                ? '#ff4b60'
                : currentHp < maxHp * 0.4
                ? 'linear-gradient(90deg, #ff4b60 0%, #f59e0b 100%)'
                : 'linear-gradient(90deg, #00f0ff 0%, #00b4d8 100%)',
          }}
        />
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        {isDead && (
          <span className="bg-error/20 text-error border border-error/50 px-2 py-0.5 font-label text-[10px] rounded-md uppercase font-bold">
            Dead
          </span>
        )}
        {isDying && (
          <span className="bg-error/20 text-error border border-error/50 px-2 py-0.5 font-label text-[10px] rounded-md uppercase font-bold animate-pulse">
            Dying
          </span>
        )}
        {isDisabled && (
          <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 font-label text-[10px] rounded-md uppercase font-bold">
            Disabled
          </span>
        )}
        {activeBuffs > 0 && (
          <span className="bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 font-label text-[10px] rounded-md uppercase">
            {activeBuffs} buff attivi
          </span>
        )}
        {conditions > 0 && (
          <span className="bg-error/10 text-error border border-error/30 px-2 py-0.5 font-label text-[10px] rounded-md uppercase">
            {conditions} condizioni
          </span>
        )}
        {activeBuffs === 0 && conditions === 0 && !isDead && !isDying && !isDisabled && (
          <span className="text-tertiary/60 font-label text-[10px] uppercase tracking-wider">
            Condizioni stabili • Nessun debuff attivo
          </span>
        )}
      </div>
    </div>
  )
}
