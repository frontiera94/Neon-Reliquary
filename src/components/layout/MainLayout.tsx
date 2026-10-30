import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { InspectorDrawer } from '../ui/InspectorDrawer'
import { DiceOverlayModal } from '../dice/DiceOverlayModal'
import { ChatFab } from '../chat/ChatFab'
import { ChatModal } from '../chat/ChatModal'
import { PAGE_VARIANTS } from '../../lib/motion-presets'

export function MainLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-surface text-on-surface dark relative overflow-x-clip">
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
          <Sidebar />
          <main className="flex-1 md:ml-64 pb-20 md:pb-0">
            <motion.div
              key={location.pathname}
              variants={PAGE_VARIANTS}
              initial="initial"
              animate="animate"
            >
              <Outlet />
            </motion.div>
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
