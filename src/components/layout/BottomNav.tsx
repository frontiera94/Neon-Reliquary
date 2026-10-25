import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/status', icon: 'analytics', label: 'Status' },
  { to: '/skills', icon: 'auto_fix_high', label: 'Skills' },
  { to: '/combat', icon: 'swords', label: 'Combat' },
  { to: '/spells', icon: 'auto_stories', label: 'Spells' },
  { to: '/features', icon: 'auto_awesome', label: 'Features' },
  { to: '/inventory', icon: 'inventory_2', label: 'Inventory' },
  { to: '/companion', icon: 'pets', label: 'Companion' },
]

export function BottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex overflow-x-auto border-t border-white/[0.08]"
      style={{ backdropFilter: 'blur(16px)', background: 'rgba(10,10,18,0.92)', boxShadow: '0 -4px 20px -8px rgba(0,240,255,0.15)' }}
    >
      {navItems.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 min-w-[50px] flex flex-col items-center justify-center py-2.5 gap-0.5 font-label text-[9px] uppercase tracking-wider transition-all duration-200 ` +
            (isActive ? 'text-primary' : 'text-tertiary hover:text-white')
          }
        >
          {({ isActive }) => (
            <>
              <span
                className="material-symbols-outlined text-xl"
                style={isActive ? { filter: 'drop-shadow(0 0 8px #00f0ff)' } : undefined}
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
