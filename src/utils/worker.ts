import type {
  FeatureExtractionPipeline,
} from '@huggingface/transformers'
import { env, pipeline } from '@huggingface/transformers'
import {
  MODELS_HOST,
  MODELS_PATH_TEMPLATE,
  DEFAULT_MODEL,
} from '../constants'
import { defaultPipelineOptions } from './hf'

/**
 * Transformers.js V3 Env options
 * https://github.com/huggingface/transformers.js/blob/v3/src/env.js
 *
 * iOS Safari Memory Considerations:
 * - No official limit published by Apple
 * - Practical limit: ~1-1.5GB before crashes
 * - ArrayBuffer limit: ~2GB in browsers
 * - WebAssembly limit: 4GB (32-bit addressing)
 * - iOS terminates tabs aggressively under
 *   memory pressure
 * - WebGPU NOT supported on iOS Safari for
 *   ONNX Runtime Web (as of late 2024)
 *
 * To avoid crashes:
 * - Keep models under 50MB (ideally <25MB)
 * - Use INT8 quantization
 * - Dispose pipeline when done
 * - Terminate worker on cleanup
 */

// keep remote, but point to your host (CORS required)
env.allowRemoteModels = true
env.remoteHost = MODELS_HOST
// Working path for https://cdn.fetchmoji.com
/**
 * {filename} is not a thing in this version of transformers
 */
env.remotePathTemplate = MODELS_PATH_TEMPLATE
// env.backends.onnx.wasm.wasmPaths = 'https://cdn.fetchmoji.com/wasm/'

/**
 * Use the Singleton pattern to enable lazy
 * construction of the pipeline.
 */
class PipelineSingleton {
  static task = 'feature-extraction' as const
  // Path to the model on the remote host
  static model = `${DEFAULT_MODEL}` as const
  static instance: FeatureExtractionPipeline | null = null

  static async getInstance(
    progress_callback?: (data: unknown) => void,
    noCache?: boolean,
  ): Promise<FeatureExtractionPipeline> {
    if (this.instance === null) {
      const created = await pipeline(
        this.task,
        noCache
          ? `${this.model}?no_cache=${Date.now()}`
          : this.model,
        defaultPipelineOptions({
          progress_callback,
        })
      )
      // Narrow the giant union type to
      // the specific feature-extraction
      // pipeline to avoid TS union blowup
      this.instance = created as unknown as
        FeatureExtractionPipeline
    }
    return this.instance
  }

  /**
   * Dispose the pipeline to free ONNX session
   * memory. Critical for iOS Safari which has
   * limited memory (~1-1.5GB practical limit).
   */
  static async dispose(): Promise<void> {
    if (this.instance) {
      // dispose() frees the underlying ONNX
      // session and associated GPU/WASM memory
      await this.instance.dispose()
      this.instance = null
    }
  }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const data = event.data || {}

  // Dispose request: free model memory.
  // Important for iOS Safari memory limits.
  if (data.type === 'dispose') {
    await PipelineSingleton.dispose()
    self.postMessage({ status: 'disposed' })
    return
  }

  // Preload request: initialize pipeline,
  // but do not run inference.
  if (data.type === 'preload') {
    await PipelineSingleton.getInstance((x: unknown) => {
      // Forward model loading progress events to the main thread
      self.postMessage(x)
    }, data.noCache === true)
    return
  }

  // Retrieve the classification pipeline.
  // When called for the first time, this
  // will load the pipeline and cache it.
  const classifier = await PipelineSingleton
    .getInstance((x: unknown) => {
      // Track model loading progress
      self.postMessage(x)
    }, data.noCache === true)

  // Actually perform the classification
  const output = await classifier(data.text, {
    pooling: 'mean',
    normalize: true,
  })

  // Extract the embedding output
  const embedding = Array.from(output.data)

  // Send the output back to the main thread
  self.postMessage({
    status: 'complete',
    embedding,
  })
})
