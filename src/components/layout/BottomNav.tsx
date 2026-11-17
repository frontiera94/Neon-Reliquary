import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
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
]

export function BottomNav() {
  const { t } = useTranslation()

  return (
    <nav
      aria-label="Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex overflow-x-auto border-t border-white/[0.08]"
      style={{ backdropFilter: 'blur(16px)', background: 'rgba(10,10,18,0.92)', boxShadow: '0 -4px 20px -8px rgba(0,240,255,0.15)' }}
    >
      {navItems.map(({ to, icon, key }) => {
        const label = t(key)
        return (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex-1 min-w-[50px] flex flex-col items-center justify-center py-2.5 gap-0.5 font-label text-[9px] uppercase tracking-wider transition-all duration-200 ` +
              (isActive ? 'text-primary' : 'text-tertiary hover:text-white')
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="active-bottom-nav-pill"
                    transition={TACTICAL_SPRING}
                    className="absolute inset-x-2 inset-y-1.5 rounded-lg bg-primary/10 border border-primary/30 pointer-events-none"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.3))' }}
                  />
                )}
                <span
                  className="material-symbols-outlined text-xl"
                  style={isActive ? { filter: 'drop-shadow(0 0 8px #00f0ff)' } : undefined}
                >
                  {icon}
                </span>
                <span className="truncate max-w-[54px]">{label}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
