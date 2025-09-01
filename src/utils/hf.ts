import type { DeviceType, PretrainedOptions } from '@huggingface/transformers'
import { env, pipeline } from
  '@huggingface/transformers'
import { isNode } from 'std-env'

import { DATA_TYPE, DEFAULT_DIMENSIONS, DEFAULT_MODEL, MODEL_REVISION, MODELS_HOST, MODELS_PATH_TEMPLATE } from '../constants'

export function deviceType(): DeviceType {
  // Default to cpu for node
  if (isNode) {
    return 'cpu'
  }

  const hasGpu = 'gpu' in navigator
  const isGPUType = ['fp32','fp16','q4f16'].includes(DATA_TYPE)

  if (isGPUType && hasGpu) {
    return 'webgpu'
  }

  return 'wasm'
}

type PipelineOptions = Parameters<typeof pipeline>[2]

export function defaultPipelineOptions(extra: Partial<PipelineOptions> = {}): PipelineOptions {
  return {
    dtype: DATA_TYPE,
    revision: MODEL_REVISION,
    device: deviceType(),
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
    const enc = await pipeline(
        'feature-extraction',
        DEFAULT_MODEL,
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