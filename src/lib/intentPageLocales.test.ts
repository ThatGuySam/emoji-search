import { describe, expect, it } from 'vitest'

import {
  buildIntentPageAlternates,
  buildLegacyLocalizedIntentRoute,
  buildLocalizedIntentRouteForSource,
  getLocalizedIntentSlug,
  listLocalizedIntentSlugRedirects,
} from './intentPageLocales'

describe('intentPageLocales', () => {
  it('maps English source slugs to localized routes', () => {
    expect(
      getLocalizedIntentSlug({
        localeSlug: 'pt-br',
        sourceSlug: 'awkward-silence',
      }),
    ).toBe('silencio-constrangedor')
    expect(
      buildLocalizedIntentRouteForSource({
        localeSlug: 'ja-jp',
        sourceSlug: 'thinking-of-you',
      }),
    ).toBe('/emoji-for/ja-jp/気にかけてる/')
  })

  it('builds hreflang alternates from the localized slug map', () => {
    expect(
      buildIntentPageAlternates(
        'awkward-silence',
      ),
    ).toEqual([
      {
        hreflang: 'x-default',
        href: '/emoji-for/awkward-silence/',
      },
      {
        hreflang: 'en',
        href: '/emoji-for/awkward-silence/',
      },
      {
        hreflang: 'pt-BR',
        href: '/emoji-for/pt-br/silencio-constrangedor/',
      },
      {
        hreflang: 'ja-JP',
        href: '/emoji-for/ja-jp/気まずい沈黙/',
      },
      {
        hreflang: 'hi-IN',
        href: '/emoji-for/hi-in/अजीब-चुप्पी/',
      },
    ])
  })

  it('lists redirects from the old English locale routes', () => {
    const redirects =
      listLocalizedIntentSlugRedirects()
    expect(redirects).toContainEqual({
      from: buildLegacyLocalizedIntentRoute({
        localeSlug: 'pt-br',
        sourceSlug: 'awkward-silence',
      }),
      to: '/emoji-for/pt-br/silencio-constrangedor/',
    })
    expect(
      redirects.some(
        (redirect) =>
          redirect.from ===
          '/emoji-for/pt-br/cringe/',
      ),
    ).toBe(false)
  })
})
