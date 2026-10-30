import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { CloudSyncBadge } from '../components/sync/CloudSyncBadge'
import { useSyncRoster } from '../lib/useSyncRoster'

export function LandingPage() {
  const navigate = useNavigate()
  useSyncRoster()

  const characters = useCharacterStore((s) => s.characters)
  const activeChar = useCharacterStore((s) => s.activeCharacter())
  const session = useSessionStore((s) => (activeChar ? s.getSession(activeChar.id) : null))
  const initSession = useSessionStore((s) => s.initSession)

  const currentHp = session?.currentHp ?? activeChar?.maxHp ?? 0
  const maxHp = activeChar?.maxHp ?? 0

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      if (e.key === 'Enter') {
        navigate('/characters')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  function handleResume() {
    if (!activeChar) return
    initSession(activeChar.id, activeChar.maxHp)
    navigate('/status')
  }

  return (
    <div className="relative min-h-screen h-screen w-full bg-surface text-on-surface flex flex-col justify-between p-6 md:p-12 overflow-hidden select-none dark">
      {/* Ambient background glow orbs */}
      <div className="glow-orb glow-orb-cyan -top-28 -right-28 w-96 h-96 md:w-[500px] md:h-[500px] opacity-20" />
      <div className="glow-orb glow-orb-magenta -bottom-32 -left-32 w-80 h-80 md:w-[450px] md:h-[450px] opacity-15" />

      {/* Cyber Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"
      />

      {/* Top Bar: Terminal HUD & Cloud Status */}
      <header className="relative z-20 flex items-center justify-between w-full">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-black/60 border border-primary/25 font-mono text-xs text-primary shadow-[0_0_15px_rgba(0,240,255,0.1)]">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#00f0ff]" />
          <span className="text-secondary font-bold">&gt;</span>
          <span className="tracking-wider">reliquary:online</span>
        </div>

        <div className="flex items-center gap-3">
          <CloudSyncBadge compact={false} />
        </div>
      </header>

      {/* Center Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center max-w-3xl mx-auto my-auto py-8">
        {/* Animated Sigil / D20 Matrix */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-6"
        >
          <div className="relative w-28 h-28 md:w-36 md:h-36 flex items-center justify-center">
            {/* Pulsing ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-dashed border-primary/30"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-2 rounded-full border border-secondary/20"
            />

            {/* D20 Hexagonal Sigil SVG */}
            <svg
              viewBox="0 0 100 100"
              className="w-20 h-20 md:w-28 md:h-28 drop-shadow-[0_0_25px_rgba(0,240,255,0.45)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Hexagon */}
              <polygon
                points="50,6 88,28 88,72 50,94 12,72 12,28"
                stroke="url(#cyan-grad)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                className="filter drop-shadow-[0_0_8px_#00f0ff]"
              />
              {/* Inner Facets */}
              <polygon
                points="50,6 36,36 64,36"
                stroke="#00f0ff"
                strokeWidth="1.2"
                strokeOpacity="0.6"
                fill="rgba(0,240,255,0.06)"
              />
              <polygon
                points="12,28 36,36 50,6"
                stroke="#d946ef"
                strokeWidth="1.2"
                strokeOpacity="0.7"
                fill="rgba(217,70,239,0.08)"
              />
              <polygon
                points="88,28 64,36 50,6"
                stroke="#00f0ff"
                strokeWidth="1.2"
                strokeOpacity="0.6"
                fill="rgba(0,240,255,0.06)"
              />
              <polygon
                points="36,36 64,36 50,68"
                stroke="#00f0ff"
                strokeWidth="1.5"
                fill="rgba(255,255,255,0.08)"
              />
              <polygon
                points="12,72 36,36 50,68"
                stroke="#d946ef"
                strokeWidth="1.2"
                strokeOpacity="0.7"
                fill="rgba(217,70,239,0.08)"
              />
              <polygon
                points="88,72 64,36 50,68"
                stroke="#00f0ff"
                strokeWidth="1.2"
                strokeOpacity="0.6"
                fill="rgba(0,240,255,0.06)"
              />
              <polygon
                points="12,72 50,68 50,94"
                stroke="#00f0ff"
                strokeWidth="1.2"
                strokeOpacity="0.6"
                fill="rgba(0,240,255,0.06)"
              />
              <polygon
                points="88,72 50,68 50,94"
                stroke="#d946ef"
                strokeWidth="1.2"
                strokeOpacity="0.7"
                fill="rgba(217,70,239,0.08)"
              />
              {/* Core '20' */}
              <text
                x="50"
                y="54"
                textAnchor="middle"
                fill="#00f0ff"
                fontFamily="'Space Grotesk', monospace"
                fontSize="12"
                fontWeight="900"
                letterSpacing="1"
              >
                20
              </text>
              <defs>
                <linearGradient id="cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00f0ff" />
                  <stop offset="100%" stopColor="#d946ef" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-3"
        >
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/30 font-label text-[11px] text-primary uppercase tracking-[0.25em]">
            // Pathfinder 1E Tactical Archive
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="font-headline text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-3"
        >
          NEON <span className="text-primary neon-glow">RELIQUARY</span>
        </motion.h1>

        {/* Accent Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="w-24 h-1 bg-gradient-to-r from-primary to-secondary mx-auto mb-4 rounded-full"
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="font-body text-sm sm:text-base text-tertiary max-w-lg mb-8 leading-relaxed"
        >
          Synchronize your soul-bound dossier. Command every roll, spell, and tactical state in real time.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md justify-center"
        >
          {/* Main Enter Button */}
          <button
            onClick={() => navigate('/characters')}
            aria-label="Enter the Reliquary"
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-primary to-primary-container text-black font-label font-bold text-sm uppercase tracking-widest rounded-xl hover:shadow-[0_0_35px_rgba(0,240,255,0.45)] transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 group"
          >
            <span>ENTER THE RELIQUARY</span>
            <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </button>

          {/* Quick Resume Button (if character active) */}
          {activeChar && (
            <button
              onClick={handleResume}
              aria-label={`Resume session with ${activeChar.name}`}
              className="w-full sm:w-auto px-6 py-3.5 bg-surface-container/90 border border-white/15 hover:border-secondary/60 text-white font-label text-xs uppercase tracking-wider rounded-xl hover:bg-secondary/10 hover:shadow-[0_0_25px_rgba(217,70,239,0.25)] transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-secondary text-sm">play_arrow</span>
              <div className="flex flex-col items-start text-left leading-tight">
                <span className="font-bold text-white">Resume — {activeChar.name}</span>
                <span className="text-[10px] text-tertiary font-mono">
                  {currentHp}/{maxHp} HP • Lv {activeChar.level}
                </span>
              </div>
            </button>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 flex flex-col sm:flex-row items-center justify-between gap-2 text-center text-xs font-label text-tertiary/70 pt-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 tracking-widest text-[11px] uppercase">
          <span className="text-primary font-mono">{characters.length}</span> RELICS INDEXED // PARTY ARCHIVE
        </div>
        <div className="font-mono text-[10px] text-tertiary/50 tracking-wider">
          [PRESS <span className="text-primary font-bold">ENTER</span> TO ACCESS]
        </div>
      </footer>
    </div>
  )
}
