export const MODELS_HOST = 'https://models.samcarlton.com'
export const MODELS_PATH_TEMPLATE = '{model}/resolve/{revision}/'
// https://huggingface.co/Supabase/gte-small/tree/main
export const SUPA_GTE_SMALL = 'supabase/gte-small'
export const SUPA_DIMENSIONS = 384

export const DEFAULT_MODEL = SUPA_GTE_SMALL
export const DEFAULT_DIMENSIONS = SUPA_DIMENSIONS

export const DATA_TYPE = 'fp32'

export const OUT_DIR = './src/artifacts'
export const DB_TAR_PATH = `${DEFAULT_MODEL}-${DEFAULT_DIMENSIONS}/emoji-${DATA_TYPE}.tar`
export const DB_TAR = `${OUT_DIR}/${DB_TAR_PATH}`
export const DB_TAR_BR = `${DB_TAR}.br`
export const DB_TAR_GZ = `${DB_TAR}.gz`
export const DB_TAR_ZST = `${DB_TAR}.zst`

export const R2_TAR_URL = `https://models.samcarlton.com/db/src/artifacts/${DB_TAR_PATH}`