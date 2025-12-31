/**
 * useEmojiSearch.ts
 *
 * Hook that manages emoji search with ML model
 * and vector database. Handles race conditions
 * where queries arrive before DB is ready.
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
  }
}

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
   * Start a search query.
   */
  classify(text: string, options: { noCache?: boolean } = {}) {
    if (!text.trim()) {
      this.matched = null
      this.isSearching = false
      this.onStateChange()
      return
    }

    this.isSearching = true
    this.onStateChange()
    this.worker.postMessage({
      text,
      noCache: options.noCache,
    })
  }

  /**
   * Cleanup resources.
   */
  destroy() {
    this.worker.removeEventListener(
      'message',
      this.handleWorkerMessage
    )
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
