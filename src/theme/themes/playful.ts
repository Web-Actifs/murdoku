import type { Theme } from '../tokens'

/*
 * Muted "printed puzzle book" palette: aged-paper surfaces, ink text, dusty
 * teal / rust accents. Deliberately desaturated — the floor plan and the
 * portraits carry the color, the chrome stays quiet.
 */
export const playful: Theme = {
  id: 'playful',
  labelKey: 'themes.playful',
  tokens: {
    '--color-bg': '#dfe5e0',
    '--color-surface': '#fbf7ee',
    '--color-surface-alt': '#efe7d6',
    '--color-primary': '#b8503a',
    '--color-primary-contrast': '#fdf8ef',
    '--color-accent': '#3f8c84',
    '--color-danger': '#b23a2b',
    '--color-success': '#4d7c4f',
    '--color-text': '#2b2422',
    '--color-text-muted': '#6f665e',
    '--color-border': '#cec4b1',
    '--radius-sm': '0.4rem',
    '--radius-md': '0.7rem',
    '--radius-lg': '1.1rem',
    '--shadow-card': '0 2px 0 rgb(43 36 34 / 0.16), 0 10px 22px -16px rgb(43 36 34 / 0.55)',
    '--font-sans':
      '"Segoe UI", ui-rounded, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
  },
}
