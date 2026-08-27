import type { Theme } from '../tokens'

export const playful: Theme = {
  id: 'playful',
  labelKey: 'themes.playful',
  tokens: {
    '--color-bg': '#fdf6ec',
    '--color-surface': '#ffffff',
    '--color-surface-alt': '#fff1e0',
    '--color-primary': '#ff6b57',
    '--color-primary-contrast': '#ffffff',
    '--color-accent': '#12b8a6',
    '--color-danger': '#e0245e',
    '--color-success': '#22a35a',
    '--color-text': '#2a2320',
    '--color-text-muted': '#8a7f76',
    '--color-border': '#f0dcc4',
    '--radius-sm': '0.6rem',
    '--radius-md': '1rem',
    '--radius-lg': '1.75rem',
    '--shadow-card': '0 12px 30px -14px rgb(42 35 32 / 0.35)',
    '--font-sans':
      '"Segoe UI", ui-rounded, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
  },
}
