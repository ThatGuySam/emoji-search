import type {
  MultilingualAutoresearchSeed,
  PrototypeLocale,
} from './multilingualAutoresearchSeed'

export type EvalCandidateStatus =
  | 'ready'
  | 'needs-review'

export type EvalCandidateSource =
  | 'source-query'
  | 'source-alt-query'
  | 'localized-query'
  | 'localized-alt-query'

export type EvalCandidateTrack =
  | 'english-baseline'
  | PrototypeLocale['queryTracks'][number]

export type EvalQueryCandidate = {
  intentId: string
  slug: string
  locale: string
  query: string
  track: EvalCandidateTrack
  source: EvalCandidateSource
  status: EvalCandidateStatus
  relevant: string[]
  confidence: number | null
  reviewFlags: string[]
}

export type EvalTargetRecord = {
  id: string
  slug: string
  relevant: string[]
  candidates: EvalQueryCandidate[]
  missingTracks: PrototypeLocale['queryTracks']
}

export type LocaleEvalTargetBundle = {
  locale: string
  queryTracks: PrototypeLocale['queryTracks']
  draftStatus: 'available' | 'missing'
  coverageSummary: {
    intents: number
    candidateQueries: number
    readyQueries: number
    reviewQueries: number
    intentsMissingTracks: number
  }
  records: EvalTargetRecord[]
}

export type MultilingualEvalTargetsArtifact = {
  version: 1
  generatedAt: string
  candidateModel: 'Xenova/multilingual-e5-small'
  sourceSeedPath: string
  locales: LocaleEvalTargetBundle[]
}

function localizedStatus(options: {
  confidence: number | null
  reviewFlags: string[]
}): EvalCandidateStatus {
  if (
    options.confidence != null &&
    options.confidence >= 0.8 &&
    options.reviewFlags.length === 0
  ) {
    return 'ready'
  }

  return 'needs-review'
}

function pushCandidate(
  candidates: EvalQueryCandidate[],
  candidate: EvalQueryCandidate,
) {
  if (!candidate.query.trim()) {
    return
  }
  candidates.push(candidate)
}

export function buildMultilingualEvalTargets(
  seed: MultilingualAutoresearchSeed,
  options: {
    sourceSeedPath?: string
    generatedAt?: string
  } = {},
): MultilingualEvalTargetsArtifact {
  const generatedAt =
    options.generatedAt ??
    new Date().toISOString()
  const sourceSeedPath =
    options.sourceSeedPath ??
    'src/artifacts/autoresearch/multilingual-e5/seed.json'

  const locales = seed.locales.map((locale) => {
    const records: EvalTargetRecord[] =
      locale.records.map((record) => {
        const candidates: EvalQueryCandidate[] = []

        pushCandidate(candidates, {
          intentId: record.id,
          slug: record.slug,
          locale: locale.locale,
          query: record.sourceQuery,
          track: 'english-baseline',
          source: 'source-query',
          status: 'ready',
          relevant: [...record.relevant],
          confidence: null,
          reviewFlags: [],
        })

        for (const query of record.sourceAltQueries) {
          pushCandidate(candidates, {
            intentId: record.id,
            slug: record.slug,
            locale: locale.locale,
            query,
            track: 'english-baseline',
            source: 'source-alt-query',
            status: 'ready',
            relevant: [...record.relevant],
            confidence: null,
            reviewFlags: [],
          })
        }

        const coveredTracks = new Set<
          PrototypeLocale['queryTracks'][number]
        >()

        if (record.localizedQuery) {
          coveredTracks.add(
            'canonical-translation',
          )
          pushCandidate(candidates, {
            intentId: record.id,
            slug: record.slug,
            locale: locale.locale,
            query: record.localizedQuery,
            track: 'canonical-translation',
            source: 'localized-query',
            status: localizedStatus({
              confidence: record.draftConfidence,
              reviewFlags:
                record.draftReviewFlags,
            }),
            relevant: [...record.relevant],
            confidence: record.draftConfidence,
            reviewFlags: [
              ...record.draftReviewFlags,
            ],
          })
        }

        if (record.localizedAltQueries.length > 0) {
          coveredTracks.add('short-alias')
        }
        for (const query of record.localizedAltQueries) {
          pushCandidate(candidates, {
            intentId: record.id,
            slug: record.slug,
            locale: locale.locale,
            query,
            track: 'short-alias',
            source: 'localized-alt-query',
            status: localizedStatus({
              confidence: record.draftConfidence,
              reviewFlags:
                record.draftReviewFlags,
            }),
            relevant: [...record.relevant],
            confidence: record.draftConfidence,
            reviewFlags: [
              ...record.draftReviewFlags,
            ],
          })
        }

        const missingTracks = locale.queryTracks.filter(
          (track) => !coveredTracks.has(track),
        )

        return {
          id: record.id,
          slug: record.slug,
          relevant: [...record.relevant],
          candidates,
          missingTracks,
        }
      })

    const allCandidates = records.flatMap(
      (record) => record.candidates,
    )

    return {
      locale: locale.locale,
      queryTracks: locale.queryTracks,
      draftStatus: locale.draftStatus,
      coverageSummary: {
        intents: records.length,
        candidateQueries: allCandidates.length,
        readyQueries: allCandidates.filter(
          (candidate) =>
            candidate.status === 'ready',
        ).length,
        reviewQueries: allCandidates.filter(
          (candidate) =>
            candidate.status === 'needs-review',
        ).length,
        intentsMissingTracks: records.filter(
          (record) =>
            record.missingTracks.length > 0,
        ).length,
      },
      records,
    }
  })

  return {
    version: 1,
    generatedAt,
    candidateModel: seed.candidateModel,
    sourceSeedPath,
    locales,
  }
}
