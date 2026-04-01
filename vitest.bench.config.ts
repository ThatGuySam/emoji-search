import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    browser: {
      enabled: true,
      // @ts-expect-error - version conflict
      provider: playwright(),
      instances: [{ browser: 'webkit' }],
    },
    include: [
      'vitest-example/**/*.bench.{ts,tsx}',
    ],
  },
})
