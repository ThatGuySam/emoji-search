import { describe, expect, it } from 'vitest'

import { shouldBypassPaletteKey } from './App'

const unmodifiedKey = {
  key: 'ArrowDown',
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  isComposing: false,
}

describe('desktop palette keyboard routing', () => {
  it('handles unmodified palette navigation keys', () => {
    expect(shouldBypassPaletteKey(unmodifiedKey)).toBe(false)
  })

  it.each([
    { altKey: true },
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
  ])('preserves modified text-editing keys: %o', (modifier) => {
    expect(shouldBypassPaletteKey({
      ...unmodifiedKey,
      ...modifier,
    })).toBe(true)
  })

  it('preserves input-method composition keys', () => {
    expect(shouldBypassPaletteKey({
      ...unmodifiedKey,
      key: 'Enter',
      isComposing: true,
    })).toBe(true)
    expect(shouldBypassPaletteKey({
      ...unmodifiedKey,
      key: 'Process',
    })).toBe(true)
  })
})
