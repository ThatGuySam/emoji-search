import { describe, expect, it } from 'vitest'

import {
  resolveSearchConfig,
} from './searchConfig'

describe('resolveSearchConfig', () => {
  it('defaults to sqlite', () => {
    expect(resolveSearchConfig('').backend)
      .toBe('sqlite')
  })

  it('enables sqlite from query string', () => {
    expect(
      resolveSearchConfig(
        '?search_backend=sqlite',
      ).backend,
    ).toBe('sqlite')
  })

  it('tracks strict backend mode', () => {
    expect(
      resolveSearchConfig(
        '?search_backend=sqlite&strict_backend=1',
      ).strictBackend,
    ).toBe(true)
  })
})
