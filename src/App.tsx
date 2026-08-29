import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { CasePage } from './pages/CasePage'
import { HomePage } from './pages/HomePage'
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
            <Route path="/v2/cormoran" element={<V2PreviewPage />} />
          </Routes>
        </AppShell>
      </HashRouter>
    </ThemeProvider>
  )
}
