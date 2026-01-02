/**
 * App.test.tsx
 *
 * Legacy tests documenting the old broken behavior.
 * Main tests are now in src/hooks/useEmojiSearch.test.ts
 *
 * Written by AI (Claude Opus 4.5)
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'

/**
 * These tests document the OLD broken behavior
 * that caused the iOS Safari timing issue.
 *
 * The fix is in EmojiSearchCore which uses a
 * Promise to wait for DB instead of throwing.
 *
 * See src/hooks/useEmojiSearch.test.ts for the
 * comprehensive tests of the new behavior.
 */
describe('useEmojiSearch race condition (legacy)', () => {
  it('documents old behavior: threw "DB not ready"', async () => {
    // Before the fix, if worker completed before
    // DB was ready, it would throw this error:
    let databaseCurrent: unknown = null

    const oldBrokenHandler = async (
      eventData: { status: string; embedding?: number[] }
    ) => {
      if (eventData.status === 'complete') {
        if (!databaseCurrent) {
          throw new Error('DB not ready')
        }
      }
    }

    await expect(
      oldBrokenHandler({
        status: 'complete',
        embedding: new Array(384).fill(0.1),
      })
    ).rejects.toThrow('DB not ready')
  })
})
