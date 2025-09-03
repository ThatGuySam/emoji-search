import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs/promises'

import { search, storeDocsFromEmojiIndex } from './search';
import { emojiIndex } from './emoji';
import { ensurePGLiteDriver } from './pglite';
import { DB_TAR } from '../constants';

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

const drivers = [
  {
    name: 'pglite',
    ensureDriver: ensurePGLiteDriver,
  }
]

describe.for(drivers)('search with $name driver', (driver) => {
  beforeAll(async () => {
    // Import the db.tar file from local file system
    const dbTar: File = new File([await fs.readFile(DB_TAR)], 'db.tar')
    await ensurePGLiteDriver({
      loadDataDir: dbTar
    })
  })
  
  it.for(queries)(`should search for $term`, async (query) => {
    const { term, expectedResults } = query
    const pgDriver = await ensurePGLiteDriver()
    const results = await pgDriver.searchEmbeddings(term, 0.8, 10)

    console.log('results', results.map(result => result.identifier))

    for (const expectedResult of expectedResults) {
      const matchingResult = results.find(result => result.identifier === expectedResult.emoji)
      // Should be equal to or less than rank
      expect(matchingResult).contain({ identifier: expectedResult.emoji })
    }
  })
})


