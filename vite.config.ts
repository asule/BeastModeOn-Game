import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// GitHub Pages project site is served from /BeastModeOn-Game/.
// Locally (dev/preview) we keep base at '/' so http://localhost:5173 works directly.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/BeastModeOn-Game/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}))
