import type {
  EvalCandidateTrack,
  MultilingualEvalTargetsArtifact,
} from './multilingualEvalTargets'

export type MultilingualExperimentQuery = {
  id: string
  locale: string
  intentId: string
  slug: string
  query: string
  track: EvalCandidateTrack
  relevant: string[]
  confidence: number | null
  reviewFlags: string[]
}

export type MultilingualExperimentQueryBundle = {
  version: 1
  generatedAt: string
  sourceEvalTargetsPath: string
  locales: Array<{
    locale: string
    acceptedQueries: number
    reviewQueries: number
  }>
  queries: MultilingualExperimentQuery[]
}

export function buildMultilingualExperimentQueryBundle(
  artifact: MultilingualEvalTargetsArtifact,
  options: {
    sourceEvalTargetsPath?: string
    generatedAt?: string
  } = {},
): MultilingualExperimentQueryBundle {
  const generatedAt =
    options.generatedAt ??
    new Date().toISOString()
  const sourceEvalTargetsPath =
    options.sourceEvalTargetsPath ??
    'src/artifacts/autoresearch/multilingual-e5/eval-targets.json'

  const queries: MultilingualExperimentQuery[] = []

  const locales = artifact.locales.map((locale) => {
    let acceptedQueries = 0
    let reviewQueries = 0

    for (const record of locale.records) {
      for (const candidate of record.candidates) {
        if (
          candidate.source === 'source-query' ||
          candidate.source === 'source-alt-query'
        ) {
          continue
        }

        if (candidate.status === 'ready') {
          acceptedQueries += 1
        } else {
          reviewQueries += 1
        }

        queries.push({
          id: `${locale.locale}__${record.id}__${candidate.track}__${candidate.source}`,
          locale: locale.locale,
          intentId: record.id,
          slug: record.slug,
          query: candidate.query,
          track: candidate.track,
          relevant: [...record.relevant],
          confidence: candidate.confidence,
          reviewFlags: [...candidate.reviewFlags],
        })
      }
    }

    return {
      locale: locale.locale,
      acceptedQueries,
      reviewQueries,
    }
  })

  return {
    version: 1,
    generatedAt,
    sourceEvalTargetsPath,
    locales,
    queries,
  }
}
