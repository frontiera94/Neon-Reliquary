import type { FC } from 'react'
import type { CharacterLore } from '../../lib/character-lore'

interface CharacterEmblemProps {
  characterId: string
  className?: string
  variant?: 'compact' | 'hero' | 'avatar'
  lore: CharacterLore
}

export const CharacterEmblem: FC<CharacterEmblemProps> = ({
  characterId,
  className = '',
  variant = 'compact',
  lore,
}) => {
  const isHero = variant === 'hero'
  const isAvatar = variant === 'avatar'

  // Semantic color accents
  const colors = {
    cyan: {
      primary: '#00f0ff',
      secondary: '#00daf3',
      glow: 'rgba(0, 240, 255, 0.45)',
      gradient: 'from-cyan-500/20 via-sky-950/40 to-transparent',
      border: 'border-cyan-500/30',
    },
    magenta: {
      primary: '#d946ef',
      secondary: '#c026d3',
      glow: 'rgba(217, 70, 239, 0.45)',
      gradient: 'from-fuchsia-500/20 via-purple-950/40 to-transparent',
      border: 'border-fuchsia-500/30',
    },
    crimson: {
      primary: '#ff4b60',
      secondary: '#e11d48',
      glow: 'rgba(255, 75, 96, 0.45)',
      gradient: 'from-rose-500/20 via-red-950/40 to-transparent',
      border: 'border-rose-500/30',
    },
    violet: {
      primary: '#a855f7',
      secondary: '#9333ea',
      glow: 'rgba(168, 85, 247, 0.45)',
      gradient: 'from-purple-500/20 via-violet-950/40 to-transparent',
      border: 'border-purple-500/30',
    },
    amber: {
      primary: '#fbbf24',
      secondary: '#f59e0b',
      glow: 'rgba(251, 191, 36, 0.45)',
      gradient: 'from-amber-500/20 via-yellow-950/40 to-transparent',
      border: 'border-amber-500/30',
    },
    emerald: {
      primary: '#10b981',
      secondary: '#059669',
      glow: 'rgba(16, 185, 129, 0.45)',
      gradient: 'from-emerald-500/20 via-teal-950/40 to-transparent',
      border: 'border-emerald-500/30',
    },
  }[lore.accentColor]

  const renderSvgArt = () => {
    switch (characterId) {
      case 'mazikeen-noctis':
        // Witch: Eye of Mystery, Occult Hexagon, Arcane Crescent
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor">
            <polygon
              points="50,8 86,29 86,71 50,92 14,71 14,29"
              stroke={colors.primary}
              strokeWidth="2"
              strokeDasharray={isHero ? '4 2' : undefined}
              className="opacity-80"
            />
            <circle cx="50" cy="50" r="26" stroke={colors.secondary} strokeWidth="1.5" className="opacity-60" />
            <path
              d="M32 50 C32 38, 68 38, 68 50 C68 62, 32 62, 32 50 Z"
              stroke={colors.primary}
              strokeWidth="2.5"
            />
            <circle cx="50" cy="50" r="8" fill={colors.primary} className="opacity-90" />
            <path d="M50 20 L50 32 M50 68 L50 80 M20 50 L32 50 M68 50 L80 50" stroke={colors.primary} strokeWidth="1.5" />
          </svg>
        )

      case 'shotrix-blackburn':
        // Magus: Arcane Longsword with Cyber Runes & Circuit
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor">
            <line x1="50" y1="12" x2="50" y2="88" stroke={colors.primary} strokeWidth="3" strokeLinecap="round" />
            <line x1="32" y1="35" x2="68" y2="35" stroke={colors.secondary} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="50,10 44,22 56,22" fill={colors.primary} />
            <circle cx="50" cy="35" r="5" fill="#0a0a12" stroke={colors.primary} strokeWidth="2" />
            <path d="M35 50 L50 65 L65 50" stroke={colors.primary} strokeWidth="2" strokeDasharray="3 3" />
            <polygon points="50,26 68,52 50,78 32,52" stroke={colors.secondary} strokeWidth="1.5" className="opacity-60" />
          </svg>
        )

      case 'knam':
        // Bloodrager: Primal Impact Hammer & Tribal Flames
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor">
            <rect x="36" y="22" width="28" height="20" rx="3" stroke={colors.primary} strokeWidth="3" fill="rgba(255,75,96,0.15)" />
            <line x1="50" y1="42" x2="50" y2="86" stroke={colors.primary} strokeWidth="3" strokeLinecap="round" />
            <line x1="42" y1="86" x2="58" y2="86" stroke={colors.secondary} strokeWidth="3" strokeLinecap="round" />
            <path d="M26 32 L36 32 M64 32 L74 32" stroke={colors.secondary} strokeWidth="2.5" />
            <path d="M22 68 C34 56, 40 76, 50 60 C60 76, 66 56, 78 68" stroke={colors.primary} strokeWidth="2" strokeDasharray="3 2" />
          </svg>
        )

      case 'agelmund':
        // Monk: Ki Lotus / Sacred Discipline Mandala
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor">
            <circle cx="50" cy="50" r="36" stroke={colors.primary} strokeWidth="1.5" strokeDasharray="4 3" className="opacity-70" />
            <circle cx="50" cy="50" r="22" stroke={colors.secondary} strokeWidth="2" />
            <circle cx="50" cy="50" r="10" fill={colors.primary} className="opacity-80" />
            <path d="M50 14 C58 30, 58 70, 50 86 C42 70, 42 30, 50 14 Z" stroke={colors.primary} strokeWidth="1.5" />
            <path d="M14 50 C30 58, 70 58, 86 50 C70 42, 30 42, 14 50 Z" stroke={colors.primary} strokeWidth="1.5" />
          </svg>
        )

      case 'mariano-cardamomo':
        // Rogue: Dual Twin Daggers & Shadow Veil
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor">
            <polygon points="50,14 78,50 50,86 22,50" stroke={colors.secondary} strokeWidth="1.5" className="opacity-60" />
            {/* Left Dagger */}
            <path d="M36 24 L48 60 L44 64 L32 28 Z" fill="rgba(168,85,247,0.2)" stroke={colors.primary} strokeWidth="2" />
            <line x1="44" y1="64" x2="40" y2="76" stroke={colors.primary} strokeWidth="2.5" />
            {/* Right Dagger */}
            <path d="M64 24 L52 60 L56 64 L68 28 Z" fill="rgba(168,85,247,0.2)" stroke={colors.primary} strokeWidth="2" />
            <line x1="56" y1="64" x2="60" y2="76" stroke={colors.primary} strokeWidth="2.5" />
            <circle cx="50" cy="50" r="4" fill={colors.primary} />
          </svg>
        )

      case 'noorie':
        // Druid: Lupine Spirit & Primal Nature Runes
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor">
            <circle cx="50" cy="50" r="34" stroke={colors.primary} strokeWidth="2" strokeDasharray="5 3" />
            {/* Wolf/Moon shape */}
            <path
              d="M34 68 C34 46, 50 32, 68 32 C62 44, 64 62, 50 72 C42 74, 36 72, 34 68 Z"
              fill="rgba(16,185,129,0.2)"
              stroke={colors.primary}
              strokeWidth="2.5"
            />
            {/* Leaves/claws */}
            <path d="M22 38 Q32 30 40 40 Q28 46 22 38 Z" fill={colors.secondary} className="opacity-70" />
            <path d="M78 62 Q68 70 60 60 Q72 54 78 62 Z" fill={colors.secondary} className="opacity-70" />
          </svg>
        )

      default:
        // Generic Reliquary Shield
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor">
            <path d="M50 14 L80 26 L80 54 C80 72, 50 86, 50 86 C50 86, 20 72, 20 54 L20 26 Z" stroke={colors.primary} strokeWidth="2.5" />
            <circle cx="50" cy="46" r="14" stroke={colors.secondary} strokeWidth="1.5" />
          </svg>
        )
    }
  }

  if (isAvatar) {
    return (
      <div
        className={`relative flex items-center justify-center rounded-xl bg-surface-container-high/90 border ${colors.border} p-1.5 overflow-hidden ${className}`}
        style={{ boxShadow: `0 0 12px ${colors.glow}` }}
      >
        <div className="w-full h-full relative z-10">{renderSvgArt()}</div>
      </div>
    )
  }

  if (isHero) {
    return (
      <div
        className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-b ${colors.gradient} border ${colors.border} overflow-hidden ${className}`}
        style={{
          boxShadow: `0 0 35px ${colors.glow}, inset 0 0 25px rgba(255,255,255,0.02)`,
        }}
      >
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(${colors.primary} 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        />

        {/* Ambient pulse orb */}
        <div
          className="absolute w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40 animate-pulse"
          style={{ backgroundColor: colors.primary }}
        />

        {/* Hero SVG art */}
        <div className="relative z-10 w-44 h-44 sm:w-56 sm:h-56 p-4 drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
          {renderSvgArt()}
        </div>

        {/* Corner cyber markers */}
        <div className="absolute top-2.5 left-2.5 text-[9px] font-mono tracking-widest text-white/40 uppercase">
          // RELIC.V4
        </div>
        <div className="absolute top-2.5 right-2.5 text-[9px] font-mono tracking-widest text-primary/80 uppercase">
          SYS:STABLE
        </div>
      </div>
    )
  }

  // Compact variant for list cards
  return (
    <div
      className={`relative flex items-center justify-center rounded-xl bg-surface-container border ${colors.border} p-2 overflow-hidden ${className}`}
    >
      <div className="w-full h-full relative z-10">{renderSvgArt()}</div>
    </div>
  )
}
