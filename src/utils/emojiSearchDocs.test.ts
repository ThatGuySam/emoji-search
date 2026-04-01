import { describe, expect, it } from 'vitest'

import { buildEmojiSearchDocs } from './emojiSearchDocs'

function findDoc(
  emoji: string,
) {
  return buildEmojiSearchDocs().find(
    (doc) => doc.emoji === emoji,
  )
}

describe('buildEmojiSearchDocs', () => {
  it('injects bridge terms into the target emoji docs', () => {
    const awkward = findDoc('😶')
    const magnifying =
      findDoc('🔍') ?? findDoc('🔎')

    expect(awkward).toBeDefined()
    expect(awkward!.keywords).toEqual(
      expect.arrayContaining([
        'awkward',
        'silence',
      ]),
    )

    expect(magnifying).toBeDefined()
    expect(magnifying!.keywords).toEqual(
      expect.arrayContaining([
        'magnifying glass',
      ]),
    )
    expect(magnifying!.tokens).toEqual(
      expect.arrayContaining([
        'magnifying',
        'glass',
      ]),
    )
  })

  it('injects phrase-level intent terms for future search pages', () => {
    const prayingHands = findDoc('🙏')
    const skull = findDoc('💀')
    const thinking = findDoc('🤔')

    expect(prayingHands).toBeDefined()
    expect(prayingHands!.keywords).toEqual(
      expect.arrayContaining([
        'respectfully',
        'condolences',
        'manifesting',
      ]),
    )

    expect(skull).toBeDefined()
    expect(skull!.keywords).toEqual(
      expect.arrayContaining([
        'brain rot',
      ]),
    )
    expect(skull!.tokens).toEqual(
      expect.arrayContaining([
        'brain',
        'rot',
      ]),
    )

    expect(thinking).toBeDefined()
    expect(thinking!.keywords).toEqual(
      expect.arrayContaining([
        'overthinking',
      ]),
    )
  })
})
