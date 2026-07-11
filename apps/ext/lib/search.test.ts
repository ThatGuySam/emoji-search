import { describe, expect, it } from 'vitest'

import { searchEmoji } from './search'

describe('searchEmoji', () => {
  it('returns no results for blank input', () => {
    expect(searchEmoji('   ')).toEqual([])
  })

  it('returns exact keyword matches with the highest score', () => {
    const results = searchEmoji('rocket')

    expect(results.map((result) => result.emoji)).toContain('🚀')
    expect(results[0]?.score).toBeGreaterThanOrEqual(100)
    expect(results[0]?.score).toBeGreaterThanOrEqual(results.at(-1)?.score ?? 0)
  })

  it('normalizes spaces and case', () => {
    expect(searchEmoji('  PARTY  ')).toEqual(searchEmoji('party'))
  })

  it('honors the result limit', () => {
    expect(searchEmoji('face', 3)).toHaveLength(3)
  })
})
