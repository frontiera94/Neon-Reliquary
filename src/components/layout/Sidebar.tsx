import { NavLink } from 'react-router-dom'
import { useCharacterStore } from '../../store/useCharacterStore'
import { CharacterDropdown } from '../character/CharacterDropdown'

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
                `flex items-center justify-between px-4 py-3 font-label text-xs uppercase tracking-widest rounded-xl transition-all duration-200 ` +
                (isActive
                  ? 'text-primary bg-primary/10 border border-primary/30 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                  : 'text-tertiary hover:text-white hover:bg-white/[0.04]')
              }
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">{icon}</span>
                {label}
              </div>
              {compCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 bg-primary/15 text-primary border border-primary/30 font-label rounded-full">
                  {compCount}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
