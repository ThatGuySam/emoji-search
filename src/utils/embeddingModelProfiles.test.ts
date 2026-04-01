import { describe, expect, it } from 'vitest'

import {
  buildQueryVariantsForProfile,
  formatDocumentForProfile,
  formatQueryForProfile,
  getEmbeddingModelProfile,
  listEmbeddingModelProfiles,
} from './embeddingModelProfiles'

describe('embeddingModelProfiles', () => {
  it('lists the current and multilingual E5 profiles', () => {
    const profiles = listEmbeddingModelProfiles()

    expect(
      profiles.map((profile) => profile.id),
    ).toEqual([
      'gte_small_en',
      'multilingual_e5_small',
    ])
    expect(
      profiles.every(
        (profile) => profile.dimensions === 384,
      ),
    ).toBe(true)
  })

  it('formats multilingual E5 queries and passages with explicit prefixes', () => {
    const profile = getEmbeddingModelProfile(
      'multilingual_e5_small',
    )

    expect(
      formatQueryForProfile(
        profile,
        'awkward silence',
      ),
    ).toBe('query: awkward silence')
    expect(
      formatQueryForProfile(
        profile,
        'query: awkward silence',
      ),
    ).toBe('query: awkward silence')
    expect(
      formatDocumentForProfile(
        profile,
        'awkward silence, cringe, yikes',
      ),
    ).toBe(
      'passage: awkward silence, cringe, yikes',
    )
    expect(
      buildQueryVariantsForProfile(
        profile,
        'awkward silence',
      ),
    ).toEqual({
      raw: 'query: awkward silence',
      prompted: 'query: emoji for awkward silence',
    })
  })

  it('leaves current gte-small text unprefixed', () => {
    const profile = getEmbeddingModelProfile(
      'gte_small_en',
    )

    expect(
      formatQueryForProfile(
        profile,
        'emoji for awkward',
      ),
    ).toBe('awkward')
    expect(
      formatDocumentForProfile(
        profile,
        'passage: awkward, cringe',
      ),
    ).toBe('awkward, cringe')
    expect(
      buildQueryVariantsForProfile(
        profile,
        'awkward silence',
      ),
    ).toEqual({
      raw: 'awkward silence',
      prompted: 'emoji for awkward silence',
    })
  })
})
