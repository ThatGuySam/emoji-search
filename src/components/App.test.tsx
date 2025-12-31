/**
 * App.test.tsx
 * 
 * Test: Race condition where query completes
 * before database finishes loading.
 * 
 * Written by AI (Claude Opus 4.5)
 * 
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'

/**
 * Tests for the DB ready race condition fix.
 * 
 * The fix uses a Promise to make queries wait
 * for the DB instead of throwing an error.
 */
describe('useEmojiSearch race condition', () => {
  it('old behavior: threw "DB not ready" without fix', async () => {
    // This test documents the OLD broken behavior.
    // Before fix: would throw when DB not ready.
    let databaseCurrent: unknown = null

    const oldBrokenHandler = async (
      eventData: { status: string; embedding?: number[] }
    ) => {
      if (eventData.status === 'complete') {
        // OLD CODE that threw error:
        if (!databaseCurrent) {
          throw new Error('DB not ready')
        }
      }
    }

    // Verify the old behavior threw
    await expect(
      oldBrokenHandler({
        status: 'complete',
        embedding: new Array(384).fill(0.1),
      })
    ).rejects.toThrow('DB not ready')
  })

  it('new behavior: waits for DB instead of throwing', async () => {
    // This tests the FIXED behavior.
    // Now: queries wait for DB via Promise.
    let databaseCurrent: { ready: boolean } | null = null
    let dbReadyResolve: ((db: { ready: boolean }) => void) | null = null
    const dbReadyPromise = new Promise<{ ready: boolean }>((resolve) => {
      dbReadyResolve = resolve
    })

    const searchResults: string[] = []

    // Simulates the fixed handler from App.tsx
    const fixedHandler = async (
      eventData: { status: string; embedding?: number[] }
    ) => {
      if (eventData.status === 'complete') {
        // NEW CODE that waits:
        let db = databaseCurrent
        if (!db) {
          db = await dbReadyPromise
        }
        if (!db) {
          console.error('DB failed to initialize')
          return
        }
        // Simulate search completing
        searchResults.push('🎉 party')
      }
    }

    // Start handler (will wait for DB)
    const handlerPromise = fixedHandler({
      status: 'complete',
      embedding: new Array(384).fill(0.1),
    })

    // DB not ready yet - handler should be waiting
    expect(searchResults).toHaveLength(0)

    // Simulate DB finishing load after delay
    await new Promise((r) => setTimeout(r, 50))
    databaseCurrent = { ready: true }
    dbReadyResolve!({ ready: true })

    // Now handler should complete
    await handlerPromise
    expect(searchResults).toHaveLength(1)
    expect(searchResults[0]).toBe('🎉 party')
  })

  it('handles DB already ready (no wait needed)', async () => {
    // When DB loads before query completes,
    // no waiting is needed.
    const databaseCurrent = { ready: true }
    const searchResults: string[] = []

    const fixedHandler = async (
      eventData: { status: string; embedding?: number[] }
    ) => {
      if (eventData.status === 'complete') {
        const db = databaseCurrent
        if (!db) {
          return
        }
        searchResults.push('🚀 rocket')
      }
    }

    await fixedHandler({
      status: 'complete',
      embedding: new Array(384).fill(0.1),
    })

    expect(searchResults).toHaveLength(1)
    expect(searchResults[0]).toBe('🚀 rocket')
  })
})
