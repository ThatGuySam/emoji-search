import {
  emojiIntents,
  type EmojiIntent,
} from '../data/emojiIntents'

export type PrototypeLocale = {
  locale: 'pt-BR' | 'ja-JP' | 'hi-IN'
  script: 'latin' | 'mixed' | 'non-latin'
  searchSurface: string
  queryTracks: readonly string[]
}

export type LocaleDraftRecord = {
  id: string
  localizedQuery: string
  localizedAltQueries: string[]
  confidence: number
  reviewFlags: string[]
}

export type LocaleDraftArtifact = {
  locale: string
  path?: string
  records: LocaleDraftRecord[]
}

export type AutoresearchSeedRecord = {
  id: string
  slug: string
  category: EmojiIntent['category']
  relevant: readonly [string, ...string[]]
  sourceQuery: string
  sourceAltQueries: readonly string[]
  queryTracks: readonly string[]
  draftStatus: 'available' | 'missing'
  localizedQuery: string | null
  localizedAltQueries: string[]
  draftConfidence: number | null
  draftReviewFlags: string[]
}

export type LocaleSeedBundle = {
  locale: PrototypeLocale['locale']
  script: PrototypeLocale['script']
  searchSurface: string
  queryTracks: readonly string[]
  draftPath: string | null
  draftStatus: 'available' | 'missing'
  records: AutoresearchSeedRecord[]
}

export type MultilingualAutoresearchSeed = {
  version: 1
  generatedAt: string
  candidateModel: 'Xenova/multilingual-e5-small'
  queryFormatting: {
    queryPrefix: 'query: '
    documentPrefix: 'passage: '
  }
  source: {
    intents: 'src/data/emojiIntents.ts'
    draftsDir: string
  }
  locales: LocaleSeedBundle[]
}

export const MULTILINGUAL_E5_PROTOTYPE_LOCALES: readonly PrototypeLocale[] = [
  {
    locale: 'pt-BR',
    script: 'latin',
    searchSurface: 'Portuguese core locale with slang and casual chat phrasing.',
    queryTracks: [
      'canonical-translation',
      'colloquial-search',
      'short-alias',
      'mixed-language-bridge',
    ],
  },
  {
    locale: 'ja-JP',
    script: 'non-latin',
    searchSurface: 'Japanese search terms plus casual mobile phrasing.',
    queryTracks: [
      'canonical-translation',
      'colloquial-search',
      'short-alias',
      'romaji-bridge',
    ],
  },
  {
    locale: 'hi-IN',
    script: 'mixed',
    searchSurface: 'Hindi search terms with Hindi-English mixed chat phrasing.',
    queryTracks: [
      'canonical-translation',
      'colloquial-search',
      'short-alias',
      'hinglish-bridge',
    ],
  },
] as const

function draftMapById(
  records: LocaleDraftRecord[],
): Map<string, LocaleDraftRecord> {
  return new Map(
    records.map((record) => [record.id, record]),
  )
}

export function buildMultilingualAutoresearchSeed(options: {
  drafts?: LocaleDraftArtifact[]
  draftsDir?: string
  generatedAt?: string
} = {}): MultilingualAutoresearchSeed {
  const draftsDir =
    options.draftsDir ??
    'docs/generated/multilingual'
  const generatedAt =
    options.generatedAt ??
    new Date().toISOString()
  const draftsByLocale = new Map(
    (options.drafts ?? []).map((draft) => [
      draft.locale,
      {
        path: draft.path ?? null,
        records: draft.records,
      },
    ]),
  )

  const locales = MULTILINGUAL_E5_PROTOTYPE_LOCALES.map(
    (localeConfig): LocaleSeedBundle => {
      const localeDraft = draftsByLocale.get(
        localeConfig.locale,
      )
      const localeDraftMap = draftMapById(
        localeDraft?.records ?? [],
      )

      const records: AutoresearchSeedRecord[] =
        emojiIntents.map((intent) => {
          const draft = localeDraftMap.get(intent.id)

          return {
            id: intent.id,
            slug: intent.slug,
            category: intent.category,
            relevant: intent.relevant,
            sourceQuery: intent.query,
            sourceAltQueries: intent.altQueries ?? [],
            queryTracks: localeConfig.queryTracks,
            draftStatus: draft
              ? 'available'
              : 'missing',
            localizedQuery:
              draft?.localizedQuery ?? null,
            localizedAltQueries:
              draft?.localizedAltQueries ?? [],
            draftConfidence:
              draft?.confidence ?? null,
            draftReviewFlags:
              draft?.reviewFlags ?? [],
          }
        })

      return {
        locale: localeConfig.locale,
        script: localeConfig.script,
        searchSurface:
          localeConfig.searchSurface,
        queryTracks:
          localeConfig.queryTracks,
        draftPath: localeDraft?.path ?? null,
        draftStatus: localeDraft
          ? 'available'
          : 'missing',
        records,
      }
    },
  )

  return {
    version: 1,
    generatedAt,
    candidateModel:
      'Xenova/multilingual-e5-small',
    queryFormatting: {
      queryPrefix: 'query: ',
      documentPrefix: 'passage: ',
    },
    source: {
      intents: 'src/data/emojiIntents.ts',
      draftsDir,
    },
    locales,
  }
}
