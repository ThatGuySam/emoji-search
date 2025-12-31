/**
 * useEmojiSearch.ts
 *
 * Hook that manages emoji search with ML model
 * and vector database. Handles race conditions
 * where queries arrive before DB is ready.
 *
 * iOS Safari Memory Considerations:
 * - No official limit published by Apple
 * - Practical limit: ~1-1.5GB before crashes
 * - ArrayBuffer limit: ~2GB in browsers
 * - WebAssembly limit: 4GB (32-bit addressing)
 * - iOS terminates tabs aggressively under
 *   memory pressure
 *
 * Mitigations implemented:
 * - Worker termination on cleanup (frees all
 *   worker memory including ONNX sessions)
 * - Debounced search (prevents memory buildup
 *   from rapid concurrent inference requests)
 *
 * Written by AI (Claude Opus 4.5)
 */

/**
 * State returned by the emoji search hook.
 */
export interface EmojiSearchState {
  /** Search results (emoji identifiers) */
  matched: string[] | null
  /** True when model is ready for inference */
  modelReady: boolean
  /** True when database is ready for queries */
  dbReady: boolean
  /** True when actively searching (show spinner) */
  isSearching: boolean
  /** Trigger a search query */
  classify: (text: string) => void
}

/**
 * Dependencies that can be injected for testing.
 */
export interface EmojiSearchDeps {
  loadDb: () => Promise<unknown>
  search: (
    db: unknown,
    embedding: number[]
  ) => Promise<{ identifier: string }[]>
  createWorker: () => {
    postMessage: (data: unknown) => void
    addEventListener: (
      event: string,
      handler: (e: { data: unknown }) => void
    ) => void
    removeEventListener: (
      event: string,
      handler: (e: { data: unknown }) => void
    ) => void
    // Optional: terminate worker to free memory
    // Critical for iOS Safari memory limits
    terminate?: () => void
  }
}

/**
 * Debounce delay in milliseconds.
 * Prevents rapid inference requests that can
 * cause memory pressure on iOS Safari.
 */
const DEBOUNCE_DELAY_MS = 150

/**
 * Message from the ML worker.
 */
interface WorkerMessage {
  status?: 'initiate' | 'ready' | 'complete'
  embedding?: number[]
}

/**
 * Core search logic extracted for testability.
 * This class manages state without React hooks.
 */
export class EmojiSearchCore {
  // State
  matched: string[] | null = null
  modelReady = false
  dbReady = false
  isSearching = false

  // Internal
  private database: unknown = null
  private dbReadyPromise: Promise<unknown> | null = null
  private dbReadyResolve:
    | ((db: unknown) => void)
    | null = null
  private worker: EmojiSearchDeps['createWorker'] extends
    () => infer W ? W : never
  private deps: EmojiSearchDeps
  private onStateChange: () => void
  // Debounce timer to limit rapid searches
  // and reduce memory pressure on mobile
  private debounceTimer: ReturnType<
    typeof setTimeout
  > | null = null

  constructor(options: {
    deps: EmojiSearchDeps
    onStateChange: () => void
  }) {
    this.deps = options.deps
    this.onStateChange = options.onStateChange
    this.worker = options.deps.createWorker()

    // Setup worker message handler
    this.worker.addEventListener(
      'message',
      this.handleWorkerMessage
    )
  }

  /**
   * Start loading DB and preloading model.
   */
  async initialize(options: { noCache?: boolean } = {}) {
    // Create promise for DB ready state
    this.dbReadyPromise = new Promise((resolve) => {
      this.dbReadyResolve = resolve
    })

    // Start DB load
    this.loadDatabase()

    // Preload model in worker
    this.worker.postMessage({
      type: 'preload',
      noCache: options.noCache,
    })
  }

  /**
   * Load the database.
   */
  private async loadDatabase() {
    try {
      const db = await this.deps.loadDb()
      this.database = db
      this.dbReady = true
      this.onStateChange()

      // Resolve promise for waiting queries
      if (this.dbReadyResolve) {
        this.dbReadyResolve(db)
      }
    } catch (error) {
      console.error('DB load failed', error)
    }
  }

  /**
   * Handle messages from the ML worker.
   */
  private handleWorkerMessage = async (
    e: { data: unknown }
  ) => {
    const message = e.data as WorkerMessage

    switch (message.status) {
      case 'initiate':
        // Model started loading
        this.modelReady = false
        this.onStateChange()
        return

      case 'ready':
        // Model finished loading
        this.modelReady = true
        this.onStateChange()
        return

      case 'complete': {
        // Embedding complete, now search DB
        // Wait for DB if not ready yet
        let db = this.database
        if (!db && this.dbReadyPromise) {
          db = await this.dbReadyPromise
        }
        if (!db || !message.embedding) {
          this.isSearching = false
          this.onStateChange()
          return
        }

        const results = await this.deps.search(
          db,
          message.embedding
        )
        this.matched = results.map((r) => r.identifier)
        this.isSearching = false
        this.onStateChange()
        return
      }
    }
  }

  /**
   * Start a search query with debouncing.
   * Debounce prevents rapid concurrent requests
   * that can cause memory pressure on iOS.
   */
  classify(text: string, options: { noCache?: boolean } = {}) {
    // Clear any pending debounced search
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    if (!text.trim()) {
      this.matched = null
      this.isSearching = false
      this.onStateChange()
      return
    }

    // Show searching state immediately for UX
    this.isSearching = true
    this.onStateChange()

    // Debounce the actual worker call to limit
    // concurrent inference requests
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      this.worker.postMessage({
        text,
        noCache: options.noCache,
      })
    }, DEBOUNCE_DELAY_MS)
  }

  /**
   * Cleanup resources.
   * Terminates worker to free ONNX session memory.
   * Critical for iOS Safari which crashes at
   * ~1-1.5GB memory usage.
   */
  destroy() {
    // Clear pending debounced search
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    this.worker.removeEventListener(
      'message',
      this.handleWorkerMessage
    )

    // Terminate worker to free all memory
    // including ONNX sessions and WASM heap.
    // This is more thorough than dispose() as
    // it completely destroys the worker context.
    if (this.worker.terminate) {
      this.worker.terminate()
    }
  }

  /**
   * Get current state snapshot.
   */
  getState(): EmojiSearchState {
    return {
      matched: this.matched,
      modelReady: this.modelReady,
      dbReady: this.dbReady,
      isSearching: this.isSearching,
      classify: (text) => this.classify(text),
    }
  }
}
