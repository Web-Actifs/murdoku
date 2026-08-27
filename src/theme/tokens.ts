export interface ThemeTokens {
  '--color-bg': string
  '--color-surface': string
  '--color-surface-alt': string
  '--color-primary': string
  '--color-primary-contrast': string
  '--color-accent': string
  '--color-danger': string
  '--color-success': string
  '--color-text': string
  '--color-text-muted': string
  '--color-border': string
  '--radius-sm': string
  '--radius-md': string
  '--radius-lg': string
  '--shadow-card': string
  '--font-sans': string
}

export interface Theme {
  id: string
  labelKey: string
  tokens: ThemeTokens
}
