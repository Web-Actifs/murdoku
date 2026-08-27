import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { playful } from './themes/playful'
import type { Theme } from './tokens'

const themeRegistry: Record<string, Theme> = {
  playful,
}

interface ThemeContextValue {
  theme: Theme
  themeId: string
  setThemeId: (id: string) => void
  availableThemeIds: string[]
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children, defaultThemeId = 'playful' }: { children: ReactNode; defaultThemeId?: string }) {
  const [themeId, setThemeId] = useState(defaultThemeId)
  const theme = themeRegistry[themeId] ?? playful

  useEffect(() => {
    const root = document.documentElement
    for (const [property, value] of Object.entries(theme.tokens)) {
      root.style.setProperty(property, value)
    }
    root.dataset.theme = theme.id
  }, [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, themeId, setThemeId, availableThemeIds: Object.keys(themeRegistry) }),
    [theme, themeId],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
