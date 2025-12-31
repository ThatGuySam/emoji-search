/**
 * useEmojiSearch.test.ts
 *
 * Tests for emoji search hook, specifically
 * the race condition where queries arrive
 * before DB is ready.
 *
 * Written by AI (Claude Opus 4.5)
 *
 * @vitest-environment jsdom
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from 'vitest'
import {
  EmojiSearchCore,
  type EmojiSearchDeps,
} from './useEmojiSearch'

/**
 * Create mock dependencies for testing.
 */
function createMockDeps(options: {
  dbLoadDelay?: number
  searchResults?: { identifier: string }[]
} = {}) {
  const {
    dbLoadDelay = 0,
    searchResults = [{ identifier: '🎉 party' }],
  } = options

  let dbResolve: ((db: unknown) => void) | null = null
  const dbPromise = new Promise((resolve) => {
    dbResolve = resolve
  })

  type MessageHandler = (e: { data: unknown }) => void
  let messageHandler: MessageHandler | null = null

  const mockWorker = {
    postMessage: vi.fn(),
    addEventListener: vi.fn(
      (event: string, handler: MessageHandler) => {
        if (event === 'message') {
          messageHandler = handler
        }
      }
    ),
    removeEventListener: vi.fn(),
  }

  const deps: EmojiSearchDeps = {
    loadDb: vi.fn(async () => {
      if (dbLoadDelay > 0) {
        await new Promise((r) =>
          setTimeout(r, dbLoadDelay)
        )
      }
      const db = { ready: true }
      return db
    }),
    search: vi.fn(async () => searchResults),
    createWorker: () => mockWorker,
  }

  return {
    deps,
    mockWorker,
    dbPromise,
    dbResolve,
    /** Simulate worker sending a message */
    sendWorkerMessage: (data: unknown) => {
      if (messageHandler) {
        messageHandler({ data })
      }
    },
  }
}

describe('EmojiSearchCore', () => {
  describe('initialization', () => {
    it('starts with correct initial state', () => {
      const { deps } = createMockDeps()
      const stateChanges: unknown[] = []

      const core = new EmojiSearchCore({
        deps,
        onStateChange: () => {
          stateChanges.push(core.getState())
        },
      })

      const state = core.getState()
      expect(state.matched).toBeNull()
      expect(state.modelReady).toBe(false)
      expect(state.dbReady).toBe(false)
      expect(state.isSearching).toBe(false)
    })

    it('loads DB and preloads model on init', async () => {
      const { deps, mockWorker } = createMockDeps()

      const core = new EmojiSearchCore({
        deps,
        onStateChange: () => {},
      })

      await core.initialize()

      // Should have called loadDb
      expect(deps.loadDb).toHaveBeenCalled()

      // Should have sent preload to worker
      expect(mockWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'preload' })
      )
    })
  })

  describe('spinner behavior (isSearching)', () => {
    it('isSearching=true when query starts', async () => {
      const { deps } = createMockDeps()
      const states: { isSearching: boolean }[] = []

      const core = new EmojiSearchCore({
        deps,
        onStateChange: () => {
          states.push({ isSearching: core.isSearching })
        },
      })

      await core.initialize()
      // Wait for DB to be ready
      await vi.waitFor(() => expect(core.dbReady).toBe(true))

      core.classify('hello')

      // Should be searching now
      expect(core.isSearching).toBe(true)
    })

    it('isSearching stays true until results arrive', async () => {
      const { deps, sendWorkerMessage } = createMockDeps()

      const core = new EmojiSearchCore({
        deps,
        onStateChange: () => {},
      })

      await core.initialize()
      await vi.waitFor(() => expect(core.dbReady).toBe(true))

      // Start search
      core.classify('hello')
      expect(core.isSearching).toBe(true)

      // Simulate model ready (spinner should STAY)
      sendWorkerMessage({ status: 'ready' })
      expect(core.isSearching).toBe(true)

      // Simulate search complete
      sendWorkerMessage({
        status: 'complete',
        embedding: new Array(384).fill(0.1),
      })

      // Wait for async search to complete
      await vi.waitFor(() =>
        expect(core.isSearching).toBe(false)
      )

      expect(core.matched).toContain('🎉 party')
    })

    it(
      'isSearching stays true while waiting for slow DB',
      async () => {
        // This is the iOS Safari scenario:
        // Model finishes fast, DB is slow
        const { deps, sendWorkerMessage } = createMockDeps({
          dbLoadDelay: 100, // Slow DB
        })

        const core = new EmojiSearchCore({
          deps,
          onStateChange: () => {},
        })

        // Don't await - let DB load in background
        core.initialize()

        // Model is ready quickly
        sendWorkerMessage({ status: 'ready' })
        expect(core.modelReady).toBe(true)
        expect(core.dbReady).toBe(false) // DB still loading

        // User starts typing
        core.classify('hello')
        expect(core.isSearching).toBe(true)

        // Worker completes embedding quickly
        sendWorkerMessage({
          status: 'complete',
          embedding: new Array(384).fill(0.1),
        })

        // isSearching should STAY true because DB not ready
        // (search is awaiting dbReadyPromise)
        expect(core.isSearching).toBe(true)
        expect(core.matched).toBeNull()

        // Wait for DB to finish loading
        await vi.waitFor(
          () => expect(core.dbReady).toBe(true),
          { timeout: 200 }
        )

        // Now search should complete
        await vi.waitFor(
          () => expect(core.isSearching).toBe(false),
          { timeout: 100 }
        )

        expect(core.matched).toContain('🎉 party')
      }
    )
  })

  describe('race condition fix', () => {
    it('does not throw when query before DB ready', async () => {
      const { deps, sendWorkerMessage } = createMockDeps({
        dbLoadDelay: 50,
      })

      const core = new EmojiSearchCore({
        deps,
        onStateChange: () => {},
      })

      // Initialize but don't wait
      core.initialize()

      // Query arrives before DB ready
      core.classify('test')

      // Should NOT throw - should wait for DB
      expect(() => {
        sendWorkerMessage({
          status: 'complete',
          embedding: new Array(384).fill(0.1),
        })
      }).not.toThrow()

      // Wait for everything to complete
      await vi.waitFor(
        () => expect(core.matched).not.toBeNull(),
        { timeout: 200 }
      )

      expect(core.matched).toContain('🎉 party')
    })

    it('queues work properly when DB loads after query', async () => {
      const { deps, sendWorkerMessage } = createMockDeps({
        dbLoadDelay: 100,
      })

      const core = new EmojiSearchCore({
        deps,
        onStateChange: () => {},
      })

      core.initialize()

      // Fire multiple queries before DB ready
      core.classify('first')
      sendWorkerMessage({
        status: 'complete',
        embedding: new Array(384).fill(0.1),
      })

      // Should be waiting, not crashed
      expect(core.isSearching).toBe(true)

      // Wait for DB and search to complete
      await vi.waitFor(
        () => expect(core.isSearching).toBe(false),
        { timeout: 200 }
      )

      expect(core.matched).toContain('🎉 party')
    })
  })

  describe('cleanup', () => {
    it('removes event listener on destroy', () => {
      const { deps, mockWorker } = createMockDeps()

      const core = new EmojiSearchCore({
        deps,
        onStateChange: () => {},
      })

      core.destroy()

      expect(
        mockWorker.removeEventListener
      ).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      )
    })
  })
})
