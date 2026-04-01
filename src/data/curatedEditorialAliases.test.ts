import { describe, expect, it } from 'vitest'

import { curatedEditorialAliases } from './curatedEditorialAliases'

describe('curatedEditorialAliases', () => {
  it('keeps phrases short and deduped per emoji', () => {
    for (const [emoji, aliases] of curatedEditorialAliases) {
      expect(aliases.length).toBeGreaterThan(0)
      expect(new Set(aliases).size).toBe(
        aliases.length,
      )

      for (const phrase of aliases) {
        expect(phrase.trim()).toBe(phrase)
        expect(
          phrase.split(/\s+/).filter(Boolean).length,
        ).toBeLessThanOrEqual(5)
      }

      expect(typeof emoji).toBe('string')
      expect(emoji.length).toBeGreaterThan(0)
    }
  })
})
