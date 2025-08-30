import { describe, it, expect } from 'vitest'
import { search } from './search';

const queries = [
  {
    term: 'shout',
    expectedResults: [
      { emoji: '📣', rank: 10 },
    ]
  }
] as const satisfies {
  term: string
  expectedResults: [
    /* emoji, minimum rank */
    { emoji: string, rank: number }
  ]
}[];

describe('search by embedding', () => {
  for (const query of queries) {
    it(`should search for ${query.term}`, () => {
      const { term, expectedResults } = query
      const results = search({
        term
      })

      for (const expectedResult of expectedResults) {
        const matchingResult = results.find(result => result.emoji === expectedResult.emoji)
        // Should be equal to or less than rank
        expect(matchingResult).contain({ emoji: expectedResult.emoji })
        expect(matchingResult?.rank).toBeLessThanOrEqual(expectedResult.rank)
      }
    })
  }
})


