import type { DeviceType } from '@huggingface/transformers'
import { env, pipeline } from
  '@huggingface/transformers'
import { isNode } from 'std-env'

import { DATA_TYPE, DEFAULT_DIMENSIONS, DEFAULT_MODEL, MODEL_REVISION, MODELS_HOST, MODELS_PATH_TEMPLATE } from '../constants'

export function deviceType(): DeviceType {
  // Prefer WebGPU when available. iOS 17+/Safari 17+ exposes navigator.gpu.
  // Using WebGPU dramatically reduces memory pressure vs WASM on iOS.
  const hasWebGPU = typeof globalThis.navigator !== 'undefined' && 'gpu' in navigator
  // Does the model type support GPU or is it a cpu model?
  const isGPUModel = ['fp32','fp16','q4f16'].includes(DATA_TYPE)

  // console.log({
  //   DATA_TYPE,
  //   hasWebGPU,
  //   isGPUModel,
  // })

  // Default to cpu for node
  if (isNode) {
    return 'cpu'
  }

  if (hasWebGPU && isGPUModel) {
    return 'webgpu'
  }

  return 'wasm'
}

type PipelineOptions = Parameters<typeof pipeline>[2]

export function defaultPipelineOptions(extra: Partial<PipelineOptions> = {}): PipelineOptions {
  const device = deviceType()
  return {
    dtype: DATA_TYPE,
    revision: MODEL_REVISION,
    device,
    ...extra,
  }
}

/**
 * Create the encoder pipeline.
 */
export async function getEncoder() {
    // mirror browser worker env
    env.allowRemoteModels = true
    env.remoteHost = MODELS_HOST
    env.remotePathTemplate =
      MODELS_PATH_TEMPLATE
    // Support cache busting via global location
    const noCache = (() => {
      try {
        const usp = new URLSearchParams(location.search)
        return usp.has('no_cache')
      } catch {
        return false
      }
    })()
    const modelId = noCache
      ? `${DEFAULT_MODEL}?no_cache=${Date.now()}`
      : DEFAULT_MODEL
    const enc = await pipeline(
        'feature-extraction',
        modelId,
        defaultPipelineOptions()
    )
    return enc
}

/**
 * Ensure vector is 384 numbers.
 */
function assertEmbedding(vec: number[]) {
    if (!Array.isArray(vec) ||
        vec.length !== DEFAULT_DIMENSIONS ||
        !vec.every(n => Number.isFinite(n))) {
      throw new Error(`len ${DEFAULT_DIMENSIONS} number[]`)
    }
}

/**
 * Encode content to embedding.
 */
export async function encodeContent(
    content: string,
    enc: Awaited<ReturnType<
      typeof getEncoder
    >>,
  ) {
    const out = await enc(content, {
      pooling: 'mean',
      normalize: true,
    })
    // transformers.js returns a typed array at
    // runtime. Cast narrowly and normalize to
    // a plain number[].
    const raw = (out as unknown as {
      data: Float32Array | number[]
    }).data
    const arr = Array.isArray(raw)
      ? raw.slice()
      : Array.from(raw)
    assertEmbedding(arr)
    return arr
  }
