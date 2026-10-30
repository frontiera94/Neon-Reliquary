import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCharacterStore } from '../../store/useCharacterStore'
import { CharacterDropdown } from '../character/CharacterDropdown'
import { TACTICAL_SPRING } from '../../lib/motion-presets'

const navItems = [
  { to: '/status', icon: 'analytics', label: 'Status' },
  { to: '/skills', icon: 'auto_fix_high', label: 'Skills' },
  { to: '/combat', icon: 'swords', label: 'Combat' },
  { to: '/spells', icon: 'auto_stories', label: 'Spells' },
  { to: '/features', icon: 'auto_awesome', label: 'Features' },
  { to: '/inventory', icon: 'inventory_2', label: 'Inventory' },
  { to: '/companion', icon: 'pets', label: 'Companion' },
]

export function Sidebar({ forceHidden = false }: { forceHidden?: boolean }) {
  const char = useCharacterStore((s) => s.activeCharacter())

  return (
    <aside
      className={`hidden md:flex flex-col h-screen w-64 bg-surface-container/90 backdrop-blur-md fixed left-0 top-0 pb-8 z-40 border-r border-white/[0.08] pt-20 ${forceHidden ? 'lg:hidden' : ''}`}
      style={{ boxShadow: '4px 0 24px -8px rgba(0,240,255,0.08)' }}
    >
      {char && (
        <div className="px-6 mb-8">
          <CharacterDropdown align="left" variant="sidebar" />
        </div>
      )}

      <nav className="flex flex-col gap-1 px-3">
        {navItems.map(({ to, icon, label }) => {
          const compCount = to === '/companion' ? (char?.companions?.length ?? 0) : 0
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `relative flex items-center justify-between px-4 py-3 font-label text-xs uppercase tracking-widest rounded-xl transition-colors duration-150 ` +
                (isActive
                  ? 'text-primary font-bold'
                  : 'text-tertiary hover:text-white hover:bg-white/[0.04]')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-pill"
                      transition={TACTICAL_SPRING}
                      className="absolute inset-0 bg-primary/10 border border-primary/30 rounded-xl shadow-[0_0_15px_rgba(0,240,255,0.15)] pointer-events-none"
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-3">
                    <motion.span
                      animate={{ scale: isActive ? 1.08 : 1 }}
                      transition={TACTICAL_SPRING}
                      className="material-symbols-outlined text-lg"
                    >
                      {icon}
                    </motion.span>
                    {label}
                  </div>
                  {compCount > 0 && (
                    <span className="relative z-10 text-[10px] px-2 py-0.5 bg-primary/15 text-primary border border-primary/30 font-label rounded-full">
                      {compCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
