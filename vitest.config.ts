import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        // Unit tests run in Node.js with jsdom
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./vitest-setup.ts'],
        },
      },
      {
        // Browser tests run in real webkit
        test: {
          name: 'browser',
          include: ['vitest-example/**/*.test.{ts,tsx}'],
          browser: {
            enabled: true,
            // vitest 3.x and 4.x types conflict
            // in node_modules. Run `pnpm dedupe`.
            // @ts-expect-error - version conflict
            provider: playwright(),
            instances: [{ browser: 'webkit' }],
          },
        },
      },
    ],
  },
})
