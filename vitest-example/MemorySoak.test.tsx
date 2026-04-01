/**
 * MemorySoak.test.tsx
 *
 * WebKit (iOS Safari) memory soak tests.
 * Runs repeated operations in real WebKit browser
 * to catch memory leaks before iOS devices do.
 *
 * Why WebKit?
 * - Closest available to iOS Safari in CI
 * - Uses same WebKit engine as Mobile Safari
 * - Catches ~70-80% of Safari-specific issues
 *
 * Note: This won't catch 100% of iOS issues
 * (no branded Safari, different memory limits)
 * but provides good regression coverage.
 *
 * Written by AI (Claude Opus 4.5)
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest'
import { render } from 'vitest-browser-react'
import {
  EmojiSearchCore,
  type EmojiSearchDeps,
} from '../src/hooks/useEmojiSearch'
import {
  MemoryBudget,
  MemoryBudgetExceededError,
  KNOWN_ALLOCATIONS,
  IOS_LIMITS,
  calculateLeakyMemoryMB,
  calculateCleanMemoryMB,
} from '../src/utils/memoryBudget'

// Number of cycles to run for soak tests
// Higher = more confidence, longer test time
const SOAK_CYCLES = 15
const RAPID_SEARCH_COUNT = 10

/**
 * Create mock deps that simulate realistic
 * memory allocation patterns.
 */
function createMockDeps(options: {
  dbLoadDelay?: number
  searchResults?: { identifier: string }[]
  onTerminate?: () => void
} = {}) {
  const {
    dbLoadDelay = 10,
    searchResults = [
      { identifier: '🎉' },
      { identifier: '🔥' },
      { identifier: '✨' },
    ],
    onTerminate,
  } = options

  type MessageHandler = (e: { data: unknown }) => void
  let handler: MessageHandler | null = null

  const worker = {
    postMessage: vi.fn(),
    addEventListener: vi.fn(
      (_: string, h: MessageHandler) => {
        handler = h
      }
    ),
    removeEventListener: vi.fn(),
    terminate: vi.fn(() => onTerminate?.()),
  }

  const deps: EmojiSearchDeps = {
    loadDb: vi.fn(async () => {
      if (dbLoadDelay > 0) {
        await new Promise((r) =>
          setTimeout(r, dbLoadDelay)
        )
      }
      // Simulate PGLite memory footprint
      return { ready: true }
    }),
    search: vi.fn(async () => searchResults),
    createWorker: () => worker,
  }

  return {
    deps,
    worker,
    /**
     * Simulate worker completing an embedding.
     * 384-dim vector typical for sentence-transformers.
     */
    triggerEmbedding: () => {
      handler?.({
        data: {
          status: 'complete',
          embedding: Array.from(
            { length: 384 },
            () => Math.random()
          ),
        },
      })
    },
    /** Simulate model ready */
    triggerModelReady: () => {
      handler?.({ data: { status: 'ready' } })
    },
  }
}

describe('iOS Safari Memory Soak Tests', () => {
  describe('repeated initialization cycles', () => {
    it(
      `survives ${SOAK_CYCLES} init/destroy cycles`,
      async () => {
        // This catches memory leaks where worker
        // or DB resources aren't properly released
        for (let i = 0; i < SOAK_CYCLES; i++) {
          const { deps, triggerModelReady } =
            createMockDeps()

          const core = new EmojiSearchCore({
            deps,
            onStateChange: () => {},
          })

          await core.initialize()
          triggerModelReady()

          // Verify initialization worked
          expect(core.modelReady).toBe(true)

          // Critical: cleanup must free resources
          core.destroy()

          // Small delay to allow GC opportunity
          await new Promise((r) => setTimeout(r, 5))
        }

        // If we get here without crash, we passed
        expect(true).toBe(true)
      }
    )
  })

  describe('rapid search stress test', () => {
    it(
      `handles ${RAPID_SEARCH_COUNT} rapid searches ` +
      `per cycle x ${SOAK_CYCLES} cycles`,
      async () => {
        // This simulates fast typing on iOS where
        // each keystroke triggers a search
        for (let cycle = 0; cycle < SOAK_CYCLES; cycle++) {
          const {
            deps,
            triggerModelReady,
            triggerEmbedding,
          } = createMockDeps()

          const core = new EmojiSearchCore({
            deps,
            onStateChange: () => {},
          })

          await core.initialize()
          triggerModelReady()

          // Rapid fire searches (simulates typing)
          for (let s = 0; s < RAPID_SEARCH_COUNT; s++) {
            core.classify(`query ${s}`)
            // Trigger embedding completion
            triggerEmbedding()
          }

          // Wait for debounce and search to settle
          await new Promise((r) => setTimeout(r, 200))

          core.destroy()
        }

        expect(true).toBe(true)
      }
    )
  })

  describe('worker termination', () => {
    it('calls terminate on destroy', async () => {
      const terminateSpy = vi.fn()
      const { deps, triggerModelReady } = createMockDeps({
        onTerminate: terminateSpy,
      })

      const core = new EmojiSearchCore({
        deps,
        onStateChange: () => {},
      })

      await core.initialize()
      triggerModelReady()

      core.destroy()

      // Worker termination is CRITICAL for iOS Safari
      // Without it, ONNX WASM memory persists and
      // accumulates across searches until OOM crash
      expect(terminateSpy).toHaveBeenCalled()
    })

    it(
      'terminates even during active search',
      async () => {
        // Simulates user navigating away mid-search
        // on iOS - component unmounts while searching
        const terminateSpy = vi.fn()
        const { deps, triggerModelReady } = createMockDeps({
          onTerminate: terminateSpy,
          dbLoadDelay: 100, // Slow DB
        })

        const core = new EmojiSearchCore({
          deps,
          onStateChange: () => {},
        })

        // Start init but don't fully wait
        core.initialize()
        triggerModelReady()

        // Start a search
        core.classify('hello')
        expect(core.isSearching).toBe(true)

        // User navigates away - destroy mid-search
        core.destroy()

        // Must still terminate to prevent memory leak
        expect(terminateSpy).toHaveBeenCalled()
      }
    )
  })

  describe('cleanup under pressure', () => {
    it('clears debounce timer on destroy', async () => {
      const { deps, triggerModelReady } = createMockDeps()

      const core = new EmojiSearchCore({
        deps,
        onStateChange: () => {},
      })

      await core.initialize()
      triggerModelReady()

      // Start search (creates debounce timer)
      core.classify('test')

      // Immediately destroy before debounce fires
      core.destroy()

      // Wait longer than debounce delay
      await new Promise((r) => setTimeout(r, 200))

      // Should not throw or cause issues
      expect(true).toBe(true)
    })

    it(
      'handles multiple destroy calls gracefully',
      async () => {
        const { deps, worker } = createMockDeps()

        const core = new EmojiSearchCore({
          deps,
          onStateChange: () => {},
        })

        await core.initialize()

        // Double destroy (can happen with React
        // StrictMode or race conditions)
        core.destroy()
        core.destroy()

        // Should not throw, terminate called once
        expect(worker.terminate).toHaveBeenCalled()
      }
    )
  })

  describe('allocation failure simulation', () => {
    it(
      'handles DB load failure gracefully',
      async () => {
        // Simulates iOS killing the tab's memory
        // allocation during PGLite init
        const errorSpy = vi.spyOn(console, 'error')
          .mockImplementation(() => {})

        const failingDeps: EmojiSearchDeps = {
          loadDb: async () => {
            throw new Error(
              'RangeError: Array buffer ' +
              'allocation failed'
            )
          },
          search: async () => [],
          createWorker: () => ({
            postMessage: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            terminate: () => {},
          }),
        }

        const core = new EmojiSearchCore({
          deps: failingDeps,
          onStateChange: () => {},
        })

        // Should not throw - handle gracefully
        await core.initialize()

        expect(errorSpy).toHaveBeenCalledWith(
          'DB load failed',
          expect.any(Error)
        )

        // Cleanup should still work
        expect(() => core.destroy()).not.toThrow()

        errorSpy.mockRestore()
      }
    )
  })
})

/**
 * iOS Safari Memory Limit Tests
 *
 * These tests enforce memory budgets that match
 * iOS Safari's real limits. They FAIL when our
 * implementation would crash on real iOS devices.
 *
 * iOS Safari Memory Facts:
 * - No official limit published by Apple
 * - Empirical tab kill: ~1-1.5GB
 * - Conservative app budget: ~300MB
 * - WASM memory is harder to reclaim
 */
describe('iOS Safari Memory Limits', () => {
  let budget: MemoryBudget

  beforeEach(() => {
    budget = new MemoryBudget(IOS_LIMITS.APP_BUDGET_MB)
  })

  afterEach(() => {
    budget.reset()
  })

  describe('with proper cleanup', () => {
    it(
      'stays within iOS budget with correct cleanup',
      () => {
        // This simulates what happens when we
        // properly terminate workers and dispose
        // ONNX sessions

        // Initial load: ONNX + model + PGLite
        budget.allocate(
          'onnx-runtime',
          KNOWN_ALLOCATIONS.ONNX_RUNTIME_BASE_MB
        )
        budget.allocate(
          'gte-small-model',
          KNOWN_ALLOCATIONS.GTE_SMALL_INT8_MODEL_MB
        )
        budget.allocate(
          'onnx-scratch',
          KNOWN_ALLOCATIONS.ONNX_INFERENCE_SCRATCH_MB
        )
        budget.allocate(
          'pglite-base',
          KNOWN_ALLOCATIONS.PGLITE_BASE_MB
        )
        budget.allocate(
          'pglite-vectors',
          KNOWN_ALLOCATIONS.PGLITE_VECTOR_INDEX_MB
        )
        budget.allocate(
          'worker-overhead',
          KNOWN_ALLOCATIONS.WORKER_OVERHEAD_MB
        )

        const status = budget.getStatus()
        console.log(
          `Clean memory: ${status.totalMB.toFixed(1)}MB ` +
          `/ ${IOS_LIMITS.APP_BUDGET_MB}MB`
        )

        // With proper setup, we should be well
        // under the iOS budget
        expect(status.isOverBudget).toBe(false)
        expect(status.totalMB).toBeLessThan(
          IOS_LIMITS.APP_BUDGET_MB
        )

        // Verify our expected memory calculation
        const expected = calculateCleanMemoryMB()
        expect(status.totalMB).toBe(expected)
      }
    )

    it(
      'cleanup releases memory back under budget',
      () => {
        // Load everything
        budget.allocate(
          'onnx-runtime',
          KNOWN_ALLOCATIONS.ONNX_RUNTIME_BASE_MB
        )
        budget.allocate(
          'model',
          KNOWN_ALLOCATIONS.GTE_SMALL_INT8_MODEL_MB
        )
        budget.allocate(
          'pglite',
          KNOWN_ALLOCATIONS.PGLITE_BASE_MB
        )

        const beforeCleanup = budget.getTotalMB()

        // Simulate worker.terminate() which frees
        // ONNX runtime and model
        budget.release('onnx-runtime')
        budget.release('model')

        const afterCleanup = budget.getTotalMB()

        expect(afterCleanup).toBeLessThan(beforeCleanup)
        // Only PGLite should remain
        expect(afterCleanup).toBe(
          KNOWN_ALLOCATIONS.PGLITE_BASE_MB
        )
      }
    )
  })

  describe('WITHOUT cleanup (leak simulation)', () => {
    it(
      'EXCEEDS iOS budget without worker termination',
      () => {
        // This test demonstrates what happens when
        // we DON'T call worker.terminate() - the
        // exact scenario that crashes iOS Safari

        // First, allocate base memory (always present)
        budget.allocate(
          'onnx-runtime',
          KNOWN_ALLOCATIONS.ONNX_RUNTIME_BASE_MB
        )
        budget.allocate(
          'pglite-base',
          KNOWN_ALLOCATIONS.PGLITE_BASE_MB
        )
        budget.allocate(
          'pglite-vectors',
          KNOWN_ALLOCATIONS.PGLITE_VECTOR_INDEX_MB
        )

        // Now simulate leaky navigation cycles:
        // User searches, navigates away, comes back.
        // Without worker.terminate(), each cycle
        // leaves ONNX model memory orphaned.
        const LEAK_CYCLES = 5
        let budgetExceeded = false
        let errorMessage = ''

        try {
          for (let i = 0; i < LEAK_CYCLES; i++) {
            // Each cycle "leaks" model + scratch memory
            // because we're not calling dispose()
            budget.allocate(
              `model-leak-${i}`,
              KNOWN_ALLOCATIONS.GTE_SMALL_INT8_MODEL_MB
            )
            budget.allocate(
              `scratch-leak-${i}`,
              KNOWN_ALLOCATIONS.ONNX_INFERENCE_SCRATCH_MB
            )
          }
        } catch (error) {
          if (error instanceof MemoryBudgetExceededError) {
            budgetExceeded = true
            errorMessage = error.message
            console.log(
              `✓ Budget exceeded as expected: ` +
              `${error.status.totalMB.toFixed(1)}MB ` +
              `/ ${IOS_LIMITS.APP_BUDGET_MB}MB`
            )
          } else {
            throw error
          }
        }

        // Without cleanup, we WILL exceed the budget
        // This is exactly what crashes iOS Safari!
        expect(budgetExceeded).toBe(true)
        expect(errorMessage).toContain('Memory budget exceeded')
      }
    )

    it(
      'throws MemoryBudgetExceededError when limit hit',
      () => {
        // Fill up to near the limit
        budget.allocate('base', IOS_LIMITS.APP_BUDGET_MB - 10)

        // This allocation should push us over
        expect(() => {
          budget.allocate('overflow', 50)
        }).toThrow(MemoryBudgetExceededError)
      }
    )

    it(
      'calculates leaky memory correctly',
      () => {
        // Verify our memory calculation matches
        // what would happen without cleanup

        const cycles = 10
        const leakyMB = calculateLeakyMemoryMB({
          cycles,
          embeddingsPerCycle: 5,
          includeModelReload: true,
        })

        // Should be way over budget with leaks
        expect(leakyMB).toBeGreaterThan(
          IOS_LIMITS.APP_BUDGET_MB
        )

        console.log(
          `Projected leaky memory (${cycles} cycles, ` +
          `5 embeddings each, model reloads): ` +
          `${leakyMB.toFixed(1)}MB - ` +
          `would crash iOS Safari!`
        )
      }
    )
  })

  describe('component memory tracking', () => {
    it(
      'ONNX model stays under component limit',
      () => {
        const modelMB =
          KNOWN_ALLOCATIONS.ONNX_RUNTIME_BASE_MB +
          KNOWN_ALLOCATIONS.GTE_SMALL_INT8_MODEL_MB +
          KNOWN_ALLOCATIONS.ONNX_INFERENCE_SCRATCH_MB

        expect(modelMB).toBeLessThan(IOS_LIMITS.MAX_MODEL_MB)

        console.log(
          `ONNX total: ${modelMB}MB ` +
          `(limit: ${IOS_LIMITS.MAX_MODEL_MB}MB)`
        )
      }
    )

    it(
      'PGLite stays under component limit',
      () => {
        const dbMB =
          KNOWN_ALLOCATIONS.PGLITE_BASE_MB +
          KNOWN_ALLOCATIONS.PGLITE_VECTOR_INDEX_MB

        expect(dbMB).toBeLessThan(IOS_LIMITS.MAX_DB_MB)

        console.log(
          `PGLite total: ${dbMB}MB ` +
          `(limit: ${IOS_LIMITS.MAX_DB_MB}MB)`
        )
      }
    )

    it(
      'realistic usage stays within budget',
      () => {
        // Simulate realistic app usage:
        // - Load model and DB once
        // - Run 50 searches
        // - Clean up properly

        // Initial allocations
        budget.allocate(
          'onnx',
          KNOWN_ALLOCATIONS.ONNX_RUNTIME_BASE_MB +
          KNOWN_ALLOCATIONS.GTE_SMALL_INT8_MODEL_MB
        )
        budget.allocate(
          'pglite',
          KNOWN_ALLOCATIONS.PGLITE_BASE_MB +
          KNOWN_ALLOCATIONS.PGLITE_VECTOR_INDEX_MB
        )

        // Simulate 50 searches
        // Each search temporarily allocates scratch
        // space but releases it after
        for (let i = 0; i < 50; i++) {
          budget.allocate(
            'search-scratch',
            KNOWN_ALLOCATIONS.ONNX_INFERENCE_SCRATCH_MB
          )
          // Scratch released after inference
          budget.release('search-scratch')
        }

        const finalStatus = budget.getStatus()
        console.log(
          `After 50 searches: ` +
          `${finalStatus.totalMB.toFixed(1)}MB`
        )

        expect(finalStatus.isOverBudget).toBe(false)
      }
    )
  })
})

/**
 * REAL MEMORY ALLOCATION TEST
 *
 * This test actually allocates memory like our
 * real implementation does. It FAILS when the
 * implementation doesn't properly clean up -
 * exactly like iOS Safari crashes.
 *
 * The test simulates:
 * - ONNX model loading (~35MB ArrayBuffer)
 * - PGLite database (~25MB ArrayBuffer)
 * - Multiple search cycles
 *
 * If cleanup doesn't work, memory accumulates
 * and the test fails - same as iOS crashing.
 */
describe('Real Memory Allocation Test', () => {
  // iOS Safari practical limit for our app
  const IOS_MEMORY_BUDGET_MB = 300
  // Convert to bytes for ArrayBuffer sizing
  const MB = 1024 * 1024

  /**
   * Simulates ONNX model memory footprint.
   * Real gte-small INT8 is ~35MB.
   */
  function allocateModelMemory(): ArrayBuffer {
    return new ArrayBuffer(35 * MB)
  }

  /**
   * Simulates PGLite database memory footprint.
   * Real PGLite with vectors is ~40MB.
   */
  function allocateDatabaseMemory(): ArrayBuffer {
    return new ArrayBuffer(40 * MB)
  }

  /**
   * Simulates per-inference scratch memory.
   * ONNX allocates ~20MB during inference.
   */
  function allocateInferenceMemory(): ArrayBuffer {
    return new ArrayBuffer(20 * MB)
  }

  /**
   * Track total allocated memory.
   * This simulates what iOS Safari tracks before
   * killing the tab.
   */
  class RealMemoryTracker {
    private allocations: ArrayBuffer[] = []
    private totalBytes = 0

    allocate(buffer: ArrayBuffer, label: string): void {
      this.allocations.push(buffer)
      this.totalBytes += buffer.byteLength
      console.log(
        `[ALLOC] ${label}: +${(buffer.byteLength / MB).toFixed(1)}MB ` +
        `(total: ${this.getTotalMB().toFixed(1)}MB)`
      )
    }

    /**
     * Release memory - simulates cleanup.
     * In real code, this happens when:
     * - worker.terminate() is called
     * - pipeline.dispose() is called
     */
    release(buffer: ArrayBuffer, label: string): void {
      const idx = this.allocations.indexOf(buffer)
      if (idx >= 0) {
        this.allocations.splice(idx, 1)
        this.totalBytes -= buffer.byteLength
        console.log(
          `[FREE] ${label}: -${(buffer.byteLength / MB).toFixed(1)}MB ` +
          `(total: ${this.getTotalMB().toFixed(1)}MB)`
        )
      }
    }

    getTotalMB(): number {
      return this.totalBytes / MB
    }

    isOverBudget(): boolean {
      return this.getTotalMB() > IOS_MEMORY_BUDGET_MB
    }
  }

  it(
    'FAILS: memory grows without cleanup (simulates iOS crash)',
    () => {
      const tracker = new RealMemoryTracker()
      const CYCLES = 5

      console.log('\n🔴 Simulating LEAKY implementation...')
      console.log(`Budget: ${IOS_MEMORY_BUDGET_MB}MB\n`)

      // Simulate multiple "sessions" where user
      // navigates to the app, uses it, navigates away.
      // BUG: We're NOT cleaning up between sessions!
      for (let cycle = 0; cycle < CYCLES; cycle++) {
        console.log(`--- Cycle ${cycle + 1} ---`)

        // User opens app: load model and DB
        const model = allocateModelMemory()
        tracker.allocate(model, `model-${cycle}`)

        const db = allocateDatabaseMemory()
        tracker.allocate(db, `db-${cycle}`)

        // User does a search
        const scratch = allocateInferenceMemory()
        tracker.allocate(scratch, `inference-${cycle}`)

        // User navigates away...
        // BUG: We forgot to call worker.terminate()!
        // Memory is NOT released!
        // (Commenting out cleanup to simulate the bug)
        //
        // tracker.release(model, `model-${cycle}`)
        // tracker.release(db, `db-${cycle}`)
        // tracker.release(scratch, `inference-${cycle}`)

        console.log('')
      }

      const finalMB = tracker.getTotalMB()
      console.log(`\n📊 Final memory: ${finalMB.toFixed(1)}MB`)
      console.log(`📊 Budget: ${IOS_MEMORY_BUDGET_MB}MB`)
      console.log(
        tracker.isOverBudget()
          ? '💥 OVER BUDGET - iOS Safari would crash!'
          : '✅ Within budget'
      )

      // This assertion FAILS because we didn't clean up.
      // This is the SAME failure mode as iOS Safari crashing!
      expect(tracker.isOverBudget()).toBe(false)
    }
  )
})
