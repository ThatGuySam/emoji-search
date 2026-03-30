import { describe, expect, it } from 'vitest'

import {
  getEmojiName,
  parseEmojiResult,
} from './emojiResult'

describe('emojiResult', () => {
  it('resolves canonical names from emojilib', () => {
    expect(getEmojiName('🚀')).toBe('rocket')
  })

  it('keeps explicit names when a result row provides one', () => {
    expect(
      parseEmojiResult('🚀 launch vehicle'),
    ).toEqual({
      char: '🚀',
      name: 'launch vehicle',
    })
  })

  it('falls back to the emoji name for emoji-only rows', () => {
    expect(parseEmojiResult('🚀')).toEqual({
      char: '🚀',
      name: 'rocket',
    })
  })
})
