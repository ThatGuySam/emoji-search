import { env, pipeline } from
  '@huggingface/transformers'
import { DATA_TYPE, MODELS_HOST, MODELS_PATH_TEMPLATE, SUPA_GTE_SMALL } from '../constants'

function deviceType() {
    return 'gpu' in navigator
        ? 'webgpu'
        : 'cpu'
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
        SUPA_GTE_SMALL,
        {
            dtype: DATA_TYPE,
            device: deviceType()
        }
    )
    return enc
}