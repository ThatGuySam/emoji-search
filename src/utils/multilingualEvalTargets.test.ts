import { describe, expect, it } from 'vitest'

import { buildMultilingualAutoresearchSeed } from './multilingualAutoresearchSeed'
import { buildMultilingualEvalTargets } from './multilingualEvalTargets'

describe('buildMultilingualEvalTargets', () => {
  it('creates english baseline candidates and marks missing locale tracks', () => {
    const seed = buildMultilingualAutoresearchSeed({
      generatedAt: '2026-04-01T00:00:00.000Z',
    })
    const artifact =
      buildMultilingualEvalTargets(seed, {
        generatedAt: '2026-04-01T00:00:00.000Z',
      })

    const pt = artifact.locales.find(
      (locale) => locale.locale === 'pt-BR',
    )
    const awkward = pt?.records.find(
      (record) =>
        record.id === 'bridge_awkward',
    )

    expect(pt?.coverageSummary.readyQueries).toBeGreaterThan(0)
    expect(pt?.coverageSummary.reviewQueries).toBe(0)
    expect(
      awkward?.candidates.some(
        (candidate) =>
          candidate.track ===
            'english-baseline' &&
          candidate.source ===
            'source-query' &&
          candidate.query === 'awkward',
      ),
    ).toBe(true)
    expect(awkward?.missingTracks).toContain(
      'canonical-translation',
    )
    expect(awkward?.missingTracks).toContain(
      'colloquial-search',
    )
  })

  it('marks localized draft candidates as ready or reviewable', () => {
    const seed = buildMultilingualAutoresearchSeed({
      generatedAt: '2026-04-01T00:00:00.000Z',
      drafts: [
        {
          locale: 'pt-BR',
          records: [
            {
              id: 'bridge_awkward',
              localizedQuery: 'constrangedor',
              localizedAltQueries: ['climão'],
              confidence: 0.84,
              reviewFlags: [],
            },
            {
              id: 'bridge_yikes',
              localizedQuery: 'vish',
              localizedAltQueries: [],
              confidence: 0.62,
              reviewFlags: ['needs-human-review'],
            },
          ],
        },
      ],
    })
    const artifact =
      buildMultilingualEvalTargets(seed, {
        generatedAt: '2026-04-01T00:00:00.000Z',
      })

    const pt = artifact.locales.find(
      (locale) => locale.locale === 'pt-BR',
    )
    const awkward = pt?.records.find(
      (record) =>
        record.id === 'bridge_awkward',
    )
    const yikes = pt?.records.find(
      (record) => record.id === 'bridge_yikes',
    )

    expect(
      awkward?.candidates.find(
        (candidate) =>
          candidate.source ===
            'localized-query',
      )?.status,
    ).toBe('ready')
    expect(
      awkward?.missingTracks,
    ).not.toContain('canonical-translation')
    expect(
      awkward?.missingTracks,
    ).not.toContain('short-alias')
    expect(
      yikes?.candidates.find(
        (candidate) =>
          candidate.source ===
            'localized-query',
      )?.status,
    ).toBe('needs-review')
  })
})
