import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCharacterStore } from '../../store/useCharacterStore'
import { CharacterDropdown } from '../character/CharacterDropdown'
import { TACTICAL_SPRING } from '../../lib/motion-presets'
import { useTranslation } from '../../i18n'

const navItems = [
  { to: '/status', icon: 'analytics', key: 'nav.status' },
  { to: '/skills', icon: 'auto_fix_high', key: 'nav.skills' },
  { to: '/combat', icon: 'swords', key: 'nav.combat' },
  { to: '/spells', icon: 'auto_stories', key: 'nav.spells' },
  { to: '/features', icon: 'auto_awesome', key: 'nav.features' },
  { to: '/inventory', icon: 'inventory_2', key: 'nav.inventory' },
  { to: '/companion', icon: 'pets', key: 'nav.companion' },
  { to: '/notes', icon: 'edit_note', key: 'nav.notes' },
  { to: '/map', icon: 'map', key: 'nav.map' },
]

export function Sidebar({ forceHidden = false }: { forceHidden?: boolean }) {
  const char = useCharacterStore((s) => s.activeCharacter())
  const { t } = useTranslation()

  return (
    <aside
      className={`relative z-30 hidden md:flex flex-col w-56 flex-shrink-0 bg-surface-container/60 backdrop-blur-xl border-r border-white/5 ${
        forceHidden ? 'md:hidden' : ''
      }`}
    >
      <div className="p-4 border-b border-white/5">
        <CharacterDropdown align="left" />
      </div>

      <nav aria-label="Main Navigation" className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon, key }) => {
          const label = t(key)
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-label text-xs uppercase tracking-wider transition-all duration-200 ` +
                (isActive
                  ? 'text-primary font-bold shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                  : 'text-tertiary hover:text-white hover:bg-white/5')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="active-sidebar-pill"
                      transition={TACTICAL_SPRING}
                      className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/30 pointer-events-none"
                    />
                  )}
                  <span
                    className="material-symbols-outlined text-lg"
                    style={isActive ? { filter: 'drop-shadow(0 0 6px #00f0ff)' } : undefined}
                  >
                    {icon}
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/5 text-[10px] font-label text-tertiary/50 uppercase tracking-widest text-center">
        {char ? (
          <div>
            <span className="text-secondary font-bold">{char.name}</span>
            <div className="text-[9px] text-tertiary/40">PF1e Companion</div>
          </div>
        ) : (
          <span>Neon Reliquary</span>
        )}
      </div>
    </aside>
  )
}
