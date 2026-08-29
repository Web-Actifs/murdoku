import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/engine/**/*.test.ts', 'src/core/**/*.test.ts', 'src/data/**/*.test.ts', 'src/game/**/*.test.ts', 'src/i18n/**/*.test.ts'],
  },
})
