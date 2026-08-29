import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { CasePage } from './pages/CasePage'
import { HomePage } from './pages/HomePage'
import { V2CasesPage } from './pages/V2CasesPage'
import { V2PlayPage } from './pages/V2PlayPage'
import { V2PreviewPage } from './pages/V2PreviewPage'
import { ThemeProvider } from './theme/ThemeProvider'

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/affaires/:caseId" element={<CasePage />} />
            <Route path="/v2" element={<V2CasesPage />} />
            <Route path="/v2/jouer/:caseId" element={<V2PlayPage />} />
            {/* Developer harness for the engine internals, deliberately kept off the player's path. */}
            <Route path="/v2/cormoran" element={<V2PreviewPage />} />
          </Routes>
        </AppShell>
      </HashRouter>
    </ThemeProvider>
  )
}
