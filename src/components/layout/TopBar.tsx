import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCharacterStore } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'
import { SettingsPanel } from './SettingsPanel'

export function TopBar() {
  const navigate = useNavigate()
  const char = useCharacterStore((s) => s.activeCharacter())
  const characters = useCharacterStore((s) => s.characters)
  const setActiveCharacter = useCharacterStore((s) => s.setActiveCharacter)
  const session = useSessionStore((s) => char ? s.getSession(char.id) : null)
  const initSession = useSessionStore((s) => s.initSession)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const idx = char ? characters.findIndex((c) => c.id === char.id) : -1
  const cycleTo = (offset: number) => {
    if (idx < 0 || characters.length < 2) return
    const next = characters[(idx + offset + characters.length) % characters.length]
    setActiveCharacter(next.id)
    initSession(next.id, next.maxHp)
  }

  const hp = session?.currentHp ?? 0
  const maxHp = char?.maxHp ?? 1
  const hpPercent = Math.round((hp / maxHp) * 100)

  const conditions = session?.conditions ?? []

  return (
    <>
    <header className="bg-surface/85 backdrop-blur-md flex justify-between items-center w-full px-6 py-4 sticky top-0 z-50 border-b border-white/[0.08]" style={{ boxShadow: '0 4px 24px -6px rgba(0,240,255,0.1)' }}>
      <div className="flex items-center gap-4">
        <span
          className="text-2xl font-black tracking-tighter text-primary uppercase font-headline cursor-pointer neon-glow-cyan-soft"
          onClick={() => navigate('/characters')}
        >
          NEON RELIQUARY
        </span>
        {char && (
          <>
            <div className="hidden md:block h-10 w-px bg-white/10 mx-2" />
            <div className="hidden md:block">
              <h1 className="font-headline text-lg leading-none text-white font-bold">{char.name}</h1>
              <p className="font-label text-xs tracking-widest text-tertiary uppercase mt-1">
                Level {char.level} {char.class}
              </p>
            </div>
          </>
        )}
      </div>

      {char && (
        <div className="flex-1 max-w-md mx-8">
          <div className="h-2 w-full bg-surface-container-lowest rounded-full overflow-hidden border border-white/[0.06]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${hpPercent}%`,
                background: 'linear-gradient(90deg, #00f0ff 0%, #d946ef 70%, #ff4b60 100%)',
                boxShadow: '0 0 10px rgba(0,240,255,0.4)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1 px-1">
            <span className="font-label text-[10px] text-primary">
              {hp} / {maxHp} HP
            </span>
            {conditions.length > 0 && (
              <span className="font-label text-[10px] text-error uppercase tracking-tighter">
                {conditions[0]}
                {conditions.length > 1 && ` +${conditions.length - 1}`}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        {characters.length >= 2 && (
          <>
            <button
              onClick={() => cycleTo(-1)}
              aria-label="Previous character"
              className="p-2 text-tertiary hover:text-primary transition-all duration-300 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              onClick={() => cycleTo(1)}
              aria-label="Next character"
              className="p-2 text-tertiary hover:text-primary transition-all duration-300 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </>
        )}
        <button
          onClick={() => navigate('/characters')}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container/80 backdrop-blur-sm border border-white/10 text-white font-label text-sm rounded-xl hover:border-primary/50 hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_20px_rgba(0,240,255,0.25)] transition-all duration-300 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm text-primary">account_circle</span>
          <span className="hidden lg:inline">Character Switcher</span>
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 text-tertiary hover:text-primary transition-all duration-300 rounded-lg hover:bg-white/5 cursor-pointer"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>

    </header>
    <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
