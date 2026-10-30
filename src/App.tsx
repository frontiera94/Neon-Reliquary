import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { SessionSyncManager } from './components/sync/SessionSyncManager'
import { LandingPage } from './pages/LandingPage'
import { CharacterSelectionPage } from './pages/CharacterSelectionPage'
import { StatusPage } from './pages/StatusPage'
import { SkillsPage } from './pages/SkillsPage'
import { CombatPage } from './pages/CombatPage'
import { SpellsPage } from './pages/SpellsPage'
import { FeaturesPage } from './pages/FeaturesPage'
import { InventoryPage } from './pages/InventoryPage'
import { CompanionPage } from './pages/CompanionPage'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <SessionSyncManager />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/characters" element={<CharacterSelectionPage />} />
        <Route element={<MainLayout />}>
          <Route path="/status" element={<StatusPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/combat" element={<CombatPage />} />
          <Route path="/spells" element={<SpellsPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/companion" element={<CompanionPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
