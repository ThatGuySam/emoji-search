export const MODELS_HOST = 'https://models.samcarlton.com'
export const MODELS_PATH_TEMPLATE = '{model}/resolve/{revision}/'
// https://huggingface.co/Supabase/gte-small/tree/main
export const SUPA_GTE_SMALL = 'supabase/gte-small'

export const OUT_DIR = './src/artifacts'
export const DB_TAR = `${OUT_DIR}/emoji.tar`
export const DB_TAR_BR = `${DB_TAR}.br`
export const DB_TAR_GZ = `${DB_TAR}.gz`
export const DB_TAR_ZST = `${DB_TAR}.zst`