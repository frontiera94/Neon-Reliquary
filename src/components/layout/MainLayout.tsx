import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { DiceOverlayModal } from '../dice/DiceOverlayModal'
import { ChatFab } from '../chat/ChatFab'
import { ChatModal } from '../chat/ChatModal'

export function MainLayout() {
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
          <Sidebar />
          <main className="flex-1 md:ml-64 pb-20 md:pb-0">
            <Outlet />
          </main>
        </div>
        <BottomNav />
        <DiceOverlayModal />
        <ChatFab />
        <ChatModal />
      </div>
    </div>
  )
}
