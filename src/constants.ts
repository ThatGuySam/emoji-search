export const MODELS_HOST = 'https://cdn.fetchmoji.com'
export const MODELS_PATH_TEMPLATE = '{model}/resolve/{revision}/'
// https://huggingface.co/Supabase/gte-small/tree/main
export const SUPA_GTE_SMALL = 'supabase/gte-small'
export const XEN_GTE_SMALL = 'Xenova/gte-small'
export const SUPA_DIMENSIONS = 384
export const XEN_DIMENSIONS = 384

export const DEFAULT_MODEL = XEN_GTE_SMALL
export const DEFAULT_DIMENSIONS = XEN_DIMENSIONS

// Keep 'fp32' for ONNX-quantized exports.
// (Quantization is handled inside the graph.)
export const DATA_TYPE = 'int8'

// Set this to your quantized revision name,
// or 'main' if the quantized model id is
// already separate (e.g. gte-small-int8).
export const MODEL_REVISION = 'main'

export const OUT_DIR = './src/artifacts'
export const DB_TAR_PATH = `${DEFAULT_MODEL}-${DEFAULT_DIMENSIONS}/emoji-${DATA_TYPE}.tar`
export const DB_TAR = `${OUT_DIR}/${DB_TAR_PATH}`
export const DB_TAR_BR = `${DB_TAR}.br`
export const DB_TAR_GZ = `${DB_TAR}.gz`
export const DB_TAR_ZST = `${DB_TAR}.zst`

export const R2_TAR_URL = `https://cdn.fetchmoji.com/db/src/artifacts/${DB_TAR_PATH}`