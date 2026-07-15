// @vitest-environment node

import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  RECENT_EMOJIS_LIMIT,
  RECENT_EMOJIS_STORAGE_KEY,
  addRecentEmoji,
  getBrowserStorage,
  loadRecentEmojis,
  recordRecentEmoji,
  saveRecentEmojis,
  type RecentEmojiStorage,
} from './recentEmojis'

function createMemoryStorage(
  initialValue: string | null = null,
): RecentEmojiStorage & { value: string | null } {
  return {
    value: initialValue,
    getItem() {
      return this.value
    },
    setItem(_key, value) {
      this.value = value
    },
  }
}

describe('recent emoji storage', () => {
  it('uses a versioned key and a bounded row size', () => {
    expect(RECENT_EMOJIS_STORAGE_KEY).toMatch(/:v\d+$/)
    expect(RECENT_EMOJIS_LIMIT).toBe(12)
  })

  it('is safe when rendered without a browser', () => {
    expect(getBrowserStorage()).toBeNull()
    expect(loadRecentEmojis()).toEqual([])
  })

  it.each([
    null,
    'not json',
    JSON.stringify({ char: '🚀', name: 'rocket' }),
  ])('loads malformed storage as an empty list', (stored) => {
    expect(
      loadRecentEmojis(createMemoryStorage(stored)),
    ).toEqual([])
  })

  it('keeps valid newest entries, removes duplicates, and caps the list', () => {
    const stored = JSON.stringify([
      { char: '🚀', name: 'new rocket name' },
      { char: '', name: 'missing character' },
      { char: '🚀', name: 'old rocket name' },
      { char: '👍', name: '' },
      { char: '🎉', name: 'party popper' },
    ])

    expect(
      loadRecentEmojis(createMemoryStorage(stored), 2),
    ).toEqual([
      { char: '🚀', name: 'new rocket name' },
      { char: '🎉', name: 'party popper' },
    ])
  })

  it('adds by exact character, moves repeats first, and uses the newest name', () => {
    const current = [
      { char: '🚀', name: 'old rocket name' },
      { char: '👍', name: 'thumbs up' },
      { char: '👍🏽', name: 'medium skin tone thumbs up' },
    ]

    const next = addRecentEmoji(current, {
      char: '🚀',
      name: 'rocket',
    })

    expect(next).toEqual([
      { char: '🚀', name: 'rocket' },
      { char: '👍', name: 'thumbs up' },
      { char: '👍🏽', name: 'medium skin tone thumbs up' },
    ])
    expect(current[0]).toEqual({
      char: '🚀',
      name: 'old rocket name',
    })
  })

  it('caps newly added entries to the requested limit', () => {
    const current = Array.from({ length: 15 }, (_, index) => ({
      char: `emoji-${index}`,
      name: `emoji ${index}`,
    }))

    const next = addRecentEmoji(current, {
      char: 'new-emoji',
      name: 'new emoji',
    })

    expect(next).toHaveLength(RECENT_EMOJIS_LIMIT)
    expect(next[0]).toEqual({
      char: 'new-emoji',
      name: 'new emoji',
    })
    expect(next.at(-1)?.char).toBe('emoji-10')
  })

  it('returns validated state when persistence throws', () => {
    const storage: RecentEmojiStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('Blocked', 'SecurityError')
      },
    }

    expect(
      saveRecentEmojis([
        { char: '🚀', name: 'rocket' },
        { char: '🚀', name: 'duplicate rocket' },
      ], storage),
    ).toEqual([
      { char: '🚀', name: 'rocket' },
    ])
  })

  it('records an emoji as newest and persists the returned state', () => {
    const storage = createMemoryStorage(JSON.stringify([
      { char: '🚀', name: 'old rocket name' },
      { char: '🎉', name: 'party popper' },
    ]))

    const next = recordRecentEmoji({
      char: '🚀',
      name: 'rocket',
    }, storage)

    expect(next).toEqual([
      { char: '🚀', name: 'rocket' },
      { char: '🎉', name: 'party popper' },
    ])
    expect(storage.value).toBe(JSON.stringify(next))
  })
})
