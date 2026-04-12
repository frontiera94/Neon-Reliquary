import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { DiceOverlayModal } from '../dice/DiceOverlayModal'
import { ChatFab } from '../chat/ChatFab'
import { ChatModal } from '../chat/ChatModal'

export function MainLayout() {
  return (
    <div className="min-h-screen bg-surface text-on-surface dark">
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(circle at 85% 15%, rgba(0,218,243,0.07), transparent 50%), ' +
            'radial-gradient(circle at 15% 85%, rgba(233,195,73,0.04), transparent 45%)',
        }}
      />
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
  )
}
