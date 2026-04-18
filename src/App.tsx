import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { CharacterSelectionPage } from './pages/CharacterSelectionPage'
import { StatusPage } from './pages/StatusPage'
import { SkillsPage } from './pages/SkillsPage'
import { CombatPage } from './pages/CombatPage'
import { SpellsPage } from './pages/SpellsPage'
import { FeaturesPage } from './pages/FeaturesPage'
import { InventoryPage } from './pages/InventoryPage'
import { GmDashboardPage } from './pages/GmDashboardPage'
import { MapEditorPage } from './pages/MapEditorPage'
import { MapViewPage } from './pages/MapViewPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/characters" element={<CharacterSelectionPage />} />
        <Route element={<MainLayout />}>
          <Route path="/status" element={<StatusPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/combat" element={<CombatPage />} />
          <Route path="/spells" element={<SpellsPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
        </Route>
        <Route path="/gm" element={<GmDashboardPage />} />
        <Route path="/gm/map/:id" element={<MapEditorPage />} />
        <Route path="/map/:id" element={<MapViewPage />} />
        <Route path="*" element={<Navigate to="/characters" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
