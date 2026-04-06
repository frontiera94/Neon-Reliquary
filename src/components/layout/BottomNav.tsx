import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/status', icon: 'analytics', label: 'Status' },
  { to: '/skills', icon: 'auto_fix_high', label: 'Skills' },
  { to: '/combat', icon: 'swords', label: 'Combat' },
  { to: '/spells', icon: 'auto_stories', label: 'Spells' },
  { to: '/features', icon: 'auto_awesome', label: 'Features' },
]

export function BottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
      style={{ backdropFilter: 'blur(12px)', background: 'rgba(19,19,24,0.9)' }}
    >
      {navItems.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-3 gap-1 font-label text-[10px] uppercase tracking-widest transition-all duration-200 ` +
            (isActive ? 'text-primary' : 'text-tertiary hover:text-white')
          }
        >
          {({ isActive }) => (
            <>
              <span
                className="material-symbols-outlined text-xl"
                style={isActive ? { filter: 'drop-shadow(0 0 8px #00daf3)' } : undefined}
              >
                {icon}
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
