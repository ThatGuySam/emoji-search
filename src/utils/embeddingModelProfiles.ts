export type EmbeddingModelProfileId =
  | 'gte_small_en'
  | 'multilingual_e5_small'

export type EmbeddingModelProfile = {
  id: EmbeddingModelProfileId
  modelId: string
  dimensions: 384
  supportsMultilingual: boolean
  defaultDtype: 'int8' | 'q8'
  queryPrefix: string
  documentPrefix: string
}

export type QueryVariants = {
  raw: string
  prompted: string
}

const EMBEDDING_MODEL_PROFILES: Record<
  EmbeddingModelProfileId,
  EmbeddingModelProfile
> = {
  gte_small_en: {
    id: 'gte_small_en',
    modelId: 'Xenova/gte-small',
    dimensions: 384,
    supportsMultilingual: false,
    defaultDtype: 'int8',
    queryPrefix: '',
    documentPrefix: '',
  },
  multilingual_e5_small: {
    id: 'multilingual_e5_small',
    modelId: 'Xenova/multilingual-e5-small',
    dimensions: 384,
    supportsMultilingual: true,
    defaultDtype: 'q8',
    queryPrefix: 'query: ',
    documentPrefix: 'passage: ',
  },
}

function stripKnownPrefixes(text: string): string {
  return text.replace(
    /^(query:\s*|passage:\s*|emoji for\s+)/i,
    '',
  )
}

function normalizeText(text: string): string {
  return stripKnownPrefixes(text).trim()
}

export function getEmbeddingModelProfile(
  id: EmbeddingModelProfileId,
): EmbeddingModelProfile {
  return EMBEDDING_MODEL_PROFILES[id]
}

export function listEmbeddingModelProfiles(): EmbeddingModelProfile[] {
  return Object.values(
    EMBEDDING_MODEL_PROFILES,
  )
}

export function formatQueryForProfile(
  profile: EmbeddingModelProfile,
  query: string,
): string {
  const normalized = normalizeText(query)
  return `${profile.queryPrefix}${normalized}`.trim()
}

export function formatDocumentForProfile(
  profile: EmbeddingModelProfile,
  text: string,
): string {
  const normalized = normalizeText(text)
  return `${profile.documentPrefix}${normalized}`.trim()
}

export function buildQueryVariantsForProfile(
  profile: EmbeddingModelProfile,
  query: string,
): QueryVariants {
  const normalized = normalizeText(query)

  if (profile.id === 'multilingual_e5_small') {
    return {
      raw: formatQueryForProfile(
        profile,
        normalized,
      ),
      prompted: `${profile.queryPrefix}emoji for ${normalized}`.trim(),
    }
  }

  return {
    raw: normalized,
    prompted: `emoji for ${normalized}`.trim(),
  }
}
