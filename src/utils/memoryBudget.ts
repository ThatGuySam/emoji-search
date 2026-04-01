/**
 * memoryBudget.ts
 *
 * Memory budget tracker for iOS Safari.
 *
 * Since Safari doesn't expose performance.memory,
 * we manually track known large allocations to
 * enforce memory limits BEFORE iOS kills the tab.
 *
 * iOS Safari Memory Limits (empirical):
 * - Tab termination: ~1-1.5GB total
 * - Safe app budget: ~200-400MB
 * - Per-allocation: ~500MB max ArrayBuffer
 *
 * Written by AI (Claude Opus 4.5)
 */

/**
 * Known allocation sizes for our stack.
 * Based on profiling real usage.
 */
export const KNOWN_ALLOCATIONS = {
  // ONNX Runtime WASM base memory
  ONNX_RUNTIME_BASE_MB: 30,
  // gte-small INT8 model weights
  GTE_SMALL_INT8_MODEL_MB: 35,
  // ONNX inference scratch space
  ONNX_INFERENCE_SCRATCH_MB: 20,
  // PGLite WASM base + PostgreSQL
  PGLITE_BASE_MB: 25,
  // PGLite vector index (grows with data)
  PGLITE_VECTOR_INDEX_MB: 15,
  // Per-embedding: 384 floats * 4 bytes
  EMBEDDING_BYTES: 384 * 4,
  // Worker overhead
  WORKER_OVERHEAD_MB: 5,
} as const

/**
 * iOS Safari memory limits.
 */
export const IOS_LIMITS = {
  // Conservative app budget to stay safe
  APP_BUDGET_MB: 300,
  // Warning threshold (start cleanup)
  WARNING_MB: 200,
  // Per-component maximums
  MAX_MODEL_MB: 100,
  MAX_DB_MB: 100,
  MAX_EMBEDDINGS_MB: 50,
} as const

export interface Allocation {
  label: string
  sizeMB: number
  timestamp: number
}

export interface MemoryStatus {
  totalMB: number
  allocations: Allocation[]
  isOverBudget: boolean
  isWarning: boolean
  budgetMB: number
}

/**
 * Memory budget tracker.
 *
 * Use this to track allocations and enforce
 * iOS Safari memory limits in tests.
 */
export class MemoryBudget {
  private allocations = new Map<string, Allocation>()
  private budgetMB: number

  constructor(budgetMB = IOS_LIMITS.APP_BUDGET_MB) {
    this.budgetMB = budgetMB
  }

  /**
   * Track a memory allocation.
   * Throws if allocation exceeds budget.
   */
  allocate(label: string, sizeMB: number): void {
    const allocation: Allocation = {
      label,
      sizeMB,
      timestamp: Date.now(),
    }

    this.allocations.set(label, allocation)

    const total = this.getTotalMB()
    if (total > this.budgetMB) {
      throw new MemoryBudgetExceededError(
        `Memory budget exceeded: ${label} ` +
        `pushed total to ${total.toFixed(1)}MB ` +
        `(budget: ${this.budgetMB}MB)`,
        this.getStatus()
      )
    }
  }

  /**
   * Release a tracked allocation.
   */
  release(label: string): void {
    this.allocations.delete(label)
  }

  /**
   * Get total tracked memory in MB.
   */
  getTotalMB(): number {
    let total = 0
    for (const alloc of this.allocations.values()) {
      total += alloc.sizeMB
    }
    return total
  }

  /**
   * Get current memory status.
   */
  getStatus(): MemoryStatus {
    const totalMB = this.getTotalMB()
    return {
      totalMB,
      allocations: Array.from(this.allocations.values()),
      isOverBudget: totalMB > this.budgetMB,
      isWarning: totalMB > IOS_LIMITS.WARNING_MB,
      budgetMB: this.budgetMB,
    }
  }

  /**
   * Reset all tracked allocations.
   */
  reset(): void {
    this.allocations.clear()
  }

  /**
   * Assert memory is within budget.
   * Throws descriptive error if not.
   */
  assertWithinBudget(): void {
    const status = this.getStatus()
    if (status.isOverBudget) {
      throw new MemoryBudgetExceededError(
        `Memory budget exceeded: ` +
        `${status.totalMB.toFixed(1)}MB / ` +
        `${this.budgetMB}MB`,
        status
      )
    }
  }
}

/**
 * Error thrown when memory budget is exceeded.
 * Includes detailed status for debugging.
 */
export class MemoryBudgetExceededError extends Error {
  constructor(
    message: string,
    public readonly status: MemoryStatus
  ) {
    super(message)
    this.name = 'MemoryBudgetExceededError'
  }
}

/**
 * Calculate expected memory for N search cycles
 * without proper cleanup (leak scenario).
 */
export function calculateLeakyMemoryMB(options: {
  cycles: number
  embeddingsPerCycle?: number
  includeModelReload?: boolean
}): number {
  const {
    cycles,
    embeddingsPerCycle = 1,
    includeModelReload = false,
  } = options

  // Base memory (one-time)
  let total =
    KNOWN_ALLOCATIONS.ONNX_RUNTIME_BASE_MB +
    KNOWN_ALLOCATIONS.GTE_SMALL_INT8_MODEL_MB +
    KNOWN_ALLOCATIONS.PGLITE_BASE_MB +
    KNOWN_ALLOCATIONS.PGLITE_VECTOR_INDEX_MB +
    KNOWN_ALLOCATIONS.WORKER_OVERHEAD_MB

  // If model reloads without dispose (leak!)
  if (includeModelReload) {
    total += cycles * (
      KNOWN_ALLOCATIONS.GTE_SMALL_INT8_MODEL_MB +
      KNOWN_ALLOCATIONS.ONNX_INFERENCE_SCRATCH_MB
    )
  }

  // Embeddings that aren't garbage collected
  const embeddingMB =
    KNOWN_ALLOCATIONS.EMBEDDING_BYTES / (1024 * 1024)
  total += cycles * embeddingsPerCycle * embeddingMB

  return total
}

/**
 * Calculate expected memory with proper cleanup.
 */
export function calculateCleanMemoryMB(): number {
  return (
    KNOWN_ALLOCATIONS.ONNX_RUNTIME_BASE_MB +
    KNOWN_ALLOCATIONS.GTE_SMALL_INT8_MODEL_MB +
    KNOWN_ALLOCATIONS.ONNX_INFERENCE_SCRATCH_MB +
    KNOWN_ALLOCATIONS.PGLITE_BASE_MB +
    KNOWN_ALLOCATIONS.PGLITE_VECTOR_INDEX_MB +
    KNOWN_ALLOCATIONS.WORKER_OVERHEAD_MB
  )
}

// Singleton for global tracking (optional)
let globalBudget: MemoryBudget | null = null

export function getGlobalMemoryBudget(): MemoryBudget {
  if (!globalBudget) {
    globalBudget = new MemoryBudget()
  }
  return globalBudget
}

export function resetGlobalMemoryBudget(): void {
  globalBudget?.reset()
  globalBudget = null
}
