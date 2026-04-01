import { describe, expect, it } from 'vitest'

import {
  MULTILINGUAL_E5_PROTOTYPE_LOCALES,
  buildMultilingualAutoresearchSeed,
} from './multilingualAutoresearchSeed'

describe('buildMultilingualAutoresearchSeed', () => {
  it('builds all prototype locales with E5 formatting', () => {
    const seed = buildMultilingualAutoresearchSeed({
      generatedAt: '2026-04-01T00:00:00.000Z',
    })

    expect(seed.candidateModel).toBe(
      'Xenova/multilingual-e5-small',
    )
    expect(seed.queryFormatting).toEqual({
      queryPrefix: 'query: ',
      documentPrefix: 'passage: ',
    })
    expect(seed.locales.map((x) => x.locale)).toEqual(
      MULTILINGUAL_E5_PROTOTYPE_LOCALES.map(
        (x) => x.locale,
      ),
    )
    for (const locale of seed.locales) {
      expect(locale.records.length).toBeGreaterThan(0)
      expect(locale.draftStatus).toBe('missing')
      expect(locale.records[0]?.draftStatus).toBe(
        'missing',
      )
    }
  })

  it('merges localized draft records when available', () => {
    const seed = buildMultilingualAutoresearchSeed({
      generatedAt: '2026-04-01T00:00:00.000Z',
      draftsDir: 'docs/generated/multilingual',
      drafts: [
        {
          locale: 'pt-BR',
          path: 'docs/generated/multilingual/pt-BR/emoji-intents.generated.json',
          records: [
            {
              id: 'bridge_awkward',
              localizedQuery: 'constrangedor',
              localizedAltQueries: [
                'climão',
              ],
              confidence: 0.84,
              reviewFlags: [
                'slang-ambiguity',
              ],
            },
          ],
        },
      ],
    })

    const pt = seed.locales.find(
      (locale) => locale.locale === 'pt-BR',
    )
    const awkward = pt?.records.find(
      (record) =>
        record.id === 'bridge_awkward',
    )
    const ja = seed.locales.find(
      (locale) => locale.locale === 'ja-JP',
    )

    expect(pt?.draftStatus).toBe('available')
    expect(pt?.draftPath).toContain('pt-BR')
    expect(awkward?.draftStatus).toBe('available')
    expect(awkward?.localizedQuery).toBe(
      'constrangedor',
    )
    expect(awkward?.localizedAltQueries).toEqual([
      'climão',
    ])
    expect(awkward?.draftConfidence).toBe(0.84)
    expect(ja?.draftStatus).toBe('missing')
  })
})
