import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { CasePage } from './pages/CasePage'
import { HomePage } from './pages/HomePage'
import { ThemeProvider } from './theme/ThemeProvider'

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/affaires/:caseId" element={<CasePage />} />
          </Routes>
        </AppShell>
      </HashRouter>
    </ThemeProvider>
  )
}
