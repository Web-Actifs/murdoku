import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    // Components are not unit-tested as components (no DOM environment here); the
    // entry is for the pure plan-drawing geometry that sits beside them.
    include: [
      'src/engine/**/*.test.ts',
      'src/core/**/*.test.ts',
      'src/core3/**/*.test.ts',
      'src/data/**/*.test.ts',
      'src/game/**/*.test.ts',
      'src/i18n/**/*.test.ts',
      'src/components/**/*.test.ts',
      // The one place a React tree is exercised: see V3PlayPage.render.test.tsx.
      'src/pages/**/*.test.tsx',
    ],
  },
})
