import { describe, expect, it } from 'vitest'

import {
  searchSqliteRows,
  type SqliteSearchRow,
} from './sqlite'

describe('searchSqliteRows', () => {
  it('returns the best matches above threshold', () => {
    const rows: SqliteSearchRow[] = [
      {
        identifier: '🚀',
        content: 'rocket launch space',
        embedding: new Float32Array([
          1, 0, 0, 0,
        ]),
      },
      {
        identifier: '🎉',
        content: 'party celebration confetti',
        embedding: new Float32Array([
          0, 1, 0, 0,
        ]),
      },
      {
        identifier: '😴',
        content: 'sleepy tired',
        embedding: new Float32Array([
          0, 0, 1, 0,
        ]),
      },
    ]

    const results = searchSqliteRows(
      rows,
      [0.9, 0.1, 0, 0],
      0.1,
      2,
    )

    expect(results).toHaveLength(2)
    expect(results[0]?.identifier).toBe('🚀')
    expect(results[1]?.identifier).toBe('🎉')
  })
})
