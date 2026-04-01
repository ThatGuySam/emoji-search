/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'

import {
  buildIntentPageEditorialAliasMap,
  buildIntentPageEditorialKeywordMap,
} from '../../scripts/lib/intentPageEditorialKeywords'

describe('buildIntentPageEditorialKeywordMap', () => {
  it('keeps only high-confidence query-like aliases by default', async () => {
    const map =
      await buildIntentPageEditorialKeywordMap()

    expect(map.get('😬')).toEqual(
      expect.arrayContaining([
        'mild social friction',
      ]),
    )
    expect(map.get('😬')).not.toEqual(
      expect.arrayContaining([
        'default pick',
        'most common social reset',
        'classic awkward overlap',
      ]),
    )

    expect(map.get('😶')).toEqual(
      expect.arrayContaining([
        'neutral distance',
      ]),
    )
    expect(map.get('😶')).not.toEqual(
      expect.arrayContaining([
        'best opener',
        'softer pick',
        'the literal silence vibe',
      ]),
    )

    expect(map.get('😰')).toEqual(
      expect.arrayContaining([
        'surprise',
        'concern',
        'anxious yikes',
      ]),
    )
    expect(map.get('😰')).not.toEqual(
      expect.arrayContaining([
        'that is not going well',
      ]),
    )

    expect(map.get('😵‍💫')).toEqual(
      expect.arrayContaining([
        'spiral feeling',
      ]),
    )
    expect(map.get('🤡')).toBeUndefined()
  })

  it('still exposes lower-confidence aliases for future experiments', async () => {
    const map =
      await buildIntentPageEditorialAliasMap()
    const awkward = map.get('😬') ?? []

    expect(
      awkward.some(
        (alias) =>
          alias.phrase ===
            'acknowledge tension without escalating it' &&
          alias.confidence === 'low',
      ),
    ).toBe(true)
    expect(
      awkward.some(
        (alias) =>
          alias.phrase === 'default pick',
      ),
    ).toBe(false)
  })
})
