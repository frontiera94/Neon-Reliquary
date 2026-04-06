import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { DiceOverlayModal } from '../dice/DiceOverlayModal'

export function MainLayout() {
  return (
    <div className="min-h-screen bg-surface text-on-surface dark">
      <TopBar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:ml-64 pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <DiceOverlayModal />
    </div>
  )
}
