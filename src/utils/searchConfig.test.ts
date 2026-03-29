import { describe, expect, it } from 'vitest'

import {
  resolveSearchConfig,
} from './searchConfig'

describe('resolveSearchConfig', () => {
  it('defaults to pglite', () => {
    expect(resolveSearchConfig('').backend)
      .toBe('pglite')
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
