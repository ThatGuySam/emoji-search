import { describe, it, expect, beforeAll } from 'vitest'

import { search, storeDocs, storeDocsFromEmojiIndex } from './search';
import { emojiIndex } from './emoji';
import type { DBDriver } from './types';
import { ensurePGLiteDriver } from './pglite';

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

// const drivers = {
//   'pglite': ensurePGLiteDriver,
// }

describe('search with pglite driver', () => {
  beforeAll(async () => {
    const pgDriver = await ensurePGLiteDriver()
    await storeDocsFromEmojiIndex({
      emojiIndex: emojiIndex.slice(0, 50),
      driver: pgDriver
    })
  })
  
  it.each(queries)(`should search for $term`, async (query, driver) => {
    const { term, expectedResults } = query
    const pgDriver = await ensurePGLiteDriver()
    const results = await search({
      term,
      driver: pgDriver
    })

    for (const expectedResult of expectedResults) {
      const matchingResult = results.find(result => result.emoji === expectedResult.emoji)
      // Should be equal to or less than rank
      expect(matchingResult).contain({ emoji: expectedResult.emoji })
      expect(matchingResult?.rank).toBeLessThanOrEqual(expectedResult.rank)
    }
  })
})


