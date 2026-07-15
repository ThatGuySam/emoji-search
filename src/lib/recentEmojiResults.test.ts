// @vitest-environment node

import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  RECENT_EMOJI_STRONG_MATCH_LIMIT,
  mergeRecentEmojiResults,
} from './recentEmojiResults'

describe('mergeRecentEmojiResults', () => {
  it('promotes strong recent matches in newest-first order', () => {
    const results = [
      '🐕 dog',
      '🚀 rocket',
      '🎉 party popper',
      '🐈 cat',
    ]

    expect(mergeRecentEmojiResults(results, [
      { char: '🎉', name: 'party popper' },
      { char: '🚀', name: 'rocket' },
    ])).toEqual([
      '🎉 party popper',
      '🚀 rocket',
      '🐕 dog',
      '🐈 cat',
    ])
  })

  it('does not add unrelated recent emojis to search results', () => {
    const results = ['🦬 bison', '🐃 buffalo', '🦌 deer']

    expect(mergeRecentEmojiResults(results, [
      { char: '🚀', name: 'rocket' },
    ])).toEqual(results)
  })

  it('leaves lower-ranked matches in their normal position', () => {
    const results = Array.from(
      { length: RECENT_EMOJI_STRONG_MATCH_LIMIT + 1 },
      (_, index) => `emoji-${index} result ${index}`,
    )
    const lowerRanked = results.at(-1) ?? ''

    expect(mergeRecentEmojiResults(results, [
      { char: lowerRanked.split(' ')[0], name: 'lower ranked' },
    ])).toEqual(results)
  })

  it('compares parsed emoji characters and removes duplicates', () => {
    expect(mergeRecentEmojiResults([
      '🐕 dog',
      '🚀',
      '🚀 rocket',
      '🐈 cat',
    ], [
      { char: '🚀', name: 'rocket' },
    ])).toEqual([
      '🚀',
      '🐕 dog',
      '🐈 cat',
    ])
  })

  it('treats a zero strong-match window as no promotion', () => {
    const results = ['🚀 rocket', '🐕 dog']

    expect(mergeRecentEmojiResults(results, [
      { char: '🚀', name: 'rocket' },
    ], 0)).toEqual(results)
  })
})
