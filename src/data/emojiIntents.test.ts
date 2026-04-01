import { describe, expect, it } from 'vitest'

import {
  buildEmojiIntentKeywordMap,
  emojiIntents,
  experimentEmojiIntents,
  getEmojiIntentRoute,
  getEmojiIntentSearchTerms,
  getEmojiIntentTitle,
} from './emojiIntents'

describe('emojiIntents', () => {
  it('provides unique ids, slugs, and routes for future pages', () => {
    const ids = emojiIntents.map((intent) => intent.id)
    const slugs = emojiIntents.map((intent) => intent.slug)
    const routes = emojiIntents.map((intent) =>
      getEmojiIntentRoute(intent),
    )

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(new Set(routes).size).toBe(routes.length)
  })

  it('keeps experiment coverage focused on bridge and social terms', () => {
    const categories = new Set(
      experimentEmojiIntents.map(
        (intent) => intent.category,
      ),
    )

    expect(categories.has('bridge')).toBe(true)
    expect(categories.has('social')).toBe(true)
    expect(
      experimentEmojiIntents.every(
        (intent) => intent.includeInExperiments,
      ),
    ).toBe(true)
  })

  it('builds page metadata from the shared query catalog', () => {
    const awkward = emojiIntents.find(
      (intent) => intent.slug === 'awkward',
    )

    expect(awkward).toBeDefined()
    expect(getEmojiIntentRoute(awkward!)).toBe(
      '/emoji-for/awkward/',
    )
    expect(getEmojiIntentTitle(awkward!)).toBe(
      'Emoji for awkward',
    )
    expect(getEmojiIntentSearchTerms({
      query: 'burned out',
      altQueries: ['burnt out'],
    })).toEqual([
      'burned out',
      'burnt out',
    ])
  })

  it('builds corpus keyword seeds only for opted-in intents', () => {
    const keywordMap = buildEmojiIntentKeywordMap()

    expect(keywordMap.get('😶')).toEqual(
      expect.arrayContaining([
        'awkward',
        'silence',
      ]),
    )
    expect(keywordMap.get('🙏')).toEqual(
      expect.arrayContaining([
        'respectfully',
        'condolences',
        'manifesting',
      ]),
    )
    expect(keywordMap.get('🚀')).toBeUndefined()
  })
})
