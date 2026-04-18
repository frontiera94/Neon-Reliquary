import { NavLink } from 'react-router-dom'
import { useCharacterStore } from '../../store/useCharacterStore'

const navItems = [
  { to: '/status', icon: 'analytics', label: 'Status' },
  { to: '/skills', icon: 'auto_fix_high', label: 'Skills' },
  { to: '/combat', icon: 'swords', label: 'Combat' },
  { to: '/spells', icon: 'auto_stories', label: 'Spells' },
  { to: '/features', icon: 'auto_awesome', label: 'Features' },
  { to: '/inventory', icon: 'inventory_2', label: 'Inventory' },
]

export function Sidebar() {
  const char = useCharacterStore((s) => s.activeCharacter())

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 bg-surface-container fixed left-0 top-0 pt-20 pb-8 z-40" style={{ boxShadow: 'inset -1px 0 0 rgba(0,218,243,0.12), 4px 0 24px -8px rgba(0,218,243,0.08)' }}>
      {char && (
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-surface-container-highest border border-primary/20 overflow-hidden flex-shrink-0">
              {char.portrait ? (
                <img src={char.portrait} alt={char.name} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-primary flex items-center justify-center h-full w-full">
                  person
                </span>
              )}
            </div>
            <div>
              <h3 className="font-headline text-primary text-sm font-bold leading-tight">{char.name}</h3>
              <p className="font-label text-tertiary text-[10px] uppercase tracking-wider">
                Level {char.level} {char.class}
              </p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex flex-col">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-4 px-6 py-4 font-label text-sm uppercase tracking-widest transition-all duration-200 ` +
              (isActive
                ? 'text-primary bg-primary/5 shadow-[inset_4px_0_0_0_#00daf3]'
                : 'text-tertiary hover:text-white hover:bg-surface-container-high')
            }
          >
            <span className="material-symbols-outlined">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
