import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
  { to: '/notes', icon: 'edit_note', key: 'nav.notes' },
  { to: '/map', icon: 'map', key: 'nav.map' },
]

export function BottomNav() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const activeEl = navRef.current?.querySelector('[aria-current="page"]')
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
    }
  }, [pathname])

  return (
    <nav
      ref={navRef}
      aria-label="Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch overflow-x-auto scrollbar-none snap-x border-t border-white/[0.12] px-1.5 pb-[env(safe-area-inset-bottom)]"
      style={{ backdropFilter: 'blur(20px)', background: 'rgba(10,11,20,0.96)', boxShadow: '0 -4px 24px -8px rgba(0,240,255,0.18)' }}
    >
      {navItems.map(({ to, icon, key }) => {
        const label = t(key)
        return (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative shrink-0 snap-center min-w-[64px] px-2 py-2 flex flex-col items-center justify-center gap-0.5 font-label text-[10px] font-semibold uppercase tracking-wide transition-all duration-200 ` +
              (isActive ? 'text-primary' : 'text-on-surface-variant/80 hover:text-white')
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="active-bottom-nav-pill"
                    transition={TACTICAL_SPRING}
                    className="absolute inset-x-1 inset-y-1 rounded-xl bg-primary/12 border border-primary/35 pointer-events-none"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.25))' }}
                  />
                )}
                <span
                  className="material-symbols-outlined text-xl relative z-10"
                  style={isActive ? { filter: 'drop-shadow(0 0 6px #00f0ff)' } : undefined}
                >
                  {icon}
                </span>
                <span className="truncate max-w-[68px] relative z-10 leading-tight">{label}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
