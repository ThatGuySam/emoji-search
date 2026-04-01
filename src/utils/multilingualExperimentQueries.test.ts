import { describe, expect, it } from 'vitest'

import { buildMultilingualAutoresearchSeed } from './multilingualAutoresearchSeed'
import { buildMultilingualEvalTargets } from './multilingualEvalTargets'
import { buildMultilingualExperimentQueryBundle } from './multilingualExperimentQueries'

describe('buildMultilingualExperimentQueryBundle', () => {
  it('skips english baseline candidates and keeps only localized queries', () => {
    const seed = buildMultilingualAutoresearchSeed({
      drafts: [
        {
          locale: 'pt-BR',
          records: [
            {
              id: 'bridge_awkward',
              localizedQuery: 'constrangedor',
              localizedAltQueries: ['climao'],
              confidence: 0.84,
              reviewFlags: [],
            },
          ],
        },
      ],
    })
    const evalTargets =
      buildMultilingualEvalTargets(seed)
    const bundle =
      buildMultilingualExperimentQueryBundle(
        evalTargets,
      )

    expect(bundle.queries.length).toBe(2)
    expect(
      bundle.queries.every(
        (query) => query.locale === 'pt-BR',
      ),
    ).toBe(true)
    expect(
      bundle.queries.some(
        (query) =>
          query.track ===
            'canonical-translation' &&
          query.query === 'constrangedor',
      ),
    ).toBe(true)
    expect(
      bundle.queries.some(
        (query) =>
          query.track === 'short-alias' &&
          query.query === 'climao',
      ),
    ).toBe(true)
  })

  it('tracks accepted versus review queries by locale', () => {
    const seed = buildMultilingualAutoresearchSeed({
      drafts: [
        {
          locale: 'pt-BR',
          records: [
            {
              id: 'bridge_awkward',
              localizedQuery: 'constrangedor',
              localizedAltQueries: [],
              confidence: 0.84,
              reviewFlags: [],
            },
            {
              id: 'bridge_yikes',
              localizedQuery: 'vish',
              localizedAltQueries: [],
              confidence: 0.6,
              reviewFlags: ['needs-human-review'],
            },
          ],
        },
      ],
    })
    const evalTargets =
      buildMultilingualEvalTargets(seed)
    const bundle =
      buildMultilingualExperimentQueryBundle(
        evalTargets,
      )
    const pt = bundle.locales.find(
      (locale) => locale.locale === 'pt-BR',
    )

    expect(pt).toEqual({
      locale: 'pt-BR',
      acceptedQueries: 1,
      reviewQueries: 1,
    })
  })
})
