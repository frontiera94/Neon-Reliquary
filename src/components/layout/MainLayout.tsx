import { useSyncExternalStore } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { TacticalBentoGrid } from './TacticalBentoGrid'
import { InspectorDrawer } from '../ui/InspectorDrawer'
import { DiceOverlayModal } from '../dice/DiceOverlayModal'
import { ChatFab } from '../chat/ChatFab'
import { ChatModal } from '../chat/ChatModal'

const TACTICAL_ROUTES = ['/status', '/combat', '/spells', '/features']

const DESKTOP_QUERY = '(min-width: 1024px)'

function subscribeDesktop(callback: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mql = window.matchMedia(DESKTOP_QUERY)
  mql.addEventListener?.('change', callback)
  return () => mql.removeEventListener?.('change', callback)
}

function getDesktopSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(DESKTOP_QUERY).matches
}

function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, () => false)
}

export function MainLayout() {
  const { pathname } = useLocation()
  const isDesktop = useIsDesktop()
  const showBento = isDesktop && TACTICAL_ROUTES.includes(pathname)

  return (
    <div className="min-h-screen bg-surface text-on-surface dark relative overflow-x-hidden">
      {/* Ambient background glow orbs (Cyber Cyan + Electric Magenta, no yellow) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="glow-orb glow-orb-cyan"
          style={{ width: '550px', height: '550px', top: '-150px', right: '-120px' }}
        />
        <div
          className="glow-orb glow-orb-magenta"
          style={{ width: '480px', height: '480px', bottom: '-100px', left: '-120px' }}
        />
      </div>
      <div className="relative z-10">
        <TopBar />
        <div className="flex">
          <Sidebar forceHidden={showBento} />
          <main className={`flex-1 ${showBento ? 'lg:ml-0' : 'md:ml-64'} pb-20 md:pb-0`}>
            {showBento ? <TacticalBentoGrid /> : <Outlet />}
          </main>
        </div>
        <BottomNav />
        <DiceOverlayModal />
        <InspectorDrawer />
        <ChatFab />
        <ChatModal />
      </div>
    </div>
  )
}
