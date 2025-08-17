import type { FeatureExtractionPipeline } from '@huggingface/transformers'
import { env, pipeline } from '@huggingface/transformers'

// keep remote, but point to your host (CORS required)
env.allowRemoteModels = true
env.remoteHost = 'https://models.samcarlton.com'
// Working path for https://models.samcarlton.com
/**
 * {filename} is not a thing in this version of transformers
 */
env.remotePathTemplate = '{model}/resolve/{revision}/'
// env.backends.onnx.wasm.wasmPaths = 'https://models.samcarlton.com/wasm/'

// Use the Singleton pattern to enable lazy construction of the pipeline.
class PipelineSingleton {
  static task = 'feature-extraction' as const
  // Path to the model on the remote host
  static model = 'supabase/gte-small' as const
  static instance: FeatureExtractionPipeline | null = null

  static async getInstance(
    progress_callback?: (data: unknown) => void,
  ): Promise<FeatureExtractionPipeline> {
    if (this.instance === null) {
      const created = await pipeline(
        this.task,
        this.model,
        {
          progress_callback,
          dtype: 'fp32',
          device: ('gpu' in navigator)
            ? 'webgpu'
            : 'wasm',
        },
      )
      // Narrow the giant union type to
      // the specific feature-extraction
      // pipeline to avoid TS union blowup
      this.instance = created as unknown as
        FeatureExtractionPipeline
    }
    return this.instance
  }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  // Retrieve the classification pipeline. When called for the first time,
  // this will load the pipeline and save it for future use.
  let classifier = await PipelineSingleton.getInstance((x: unknown) => {
    // We also add a progress callback to the pipeline so that we can
    // track model loading.
    self.postMessage(x)
  })

  // Actually perform the classification
  let output = await classifier(event.data.text, {
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