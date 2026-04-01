import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'

import { getEmojiIntentRoute } from '../data/emojiIntents'
import {
  buildLocalizedIntentHubRoute,
  buildLocalizedIntentRoute,
  listIntentPageLocales,
} from '../lib/intentPageLocales'
import { SITE_META, normalizePath } from '../lib/siteMeta'

function toAbsoluteUrl(path: string) {
  return new URL(
    normalizePath(path),
    SITE_META.url,
  ).toString()
}

export const GET: APIRoute = async () => {
  const now = new Date().toISOString()
  const intentEntries = await getCollection(
    'intent-pages',
  )
  const localizedIntentEntries = await getCollection(
    'localized-intent-pages',
  )

  const paths = new Set<string>([
    '/',
    '/about/',
    '/emoji-for/',
  ])

  for (const locale of listIntentPageLocales()) {
    paths.add(
      buildLocalizedIntentHubRoute(locale.slug),
    )
  }

  for (const entry of intentEntries) {
    paths.add(
      getEmojiIntentRoute({
        slug: entry.slug,
      }),
    )
  }

  for (const entry of localizedIntentEntries) {
    const locale = listIntentPageLocales().find(
      (candidate) =>
        candidate.code === entry.data.locale,
    )
    if (!locale) {
      continue
    }
    paths.add(
      buildLocalizedIntentRoute({
        localeSlug: locale.slug,
        slug: entry.data.sourceSlug,
      }),
    )
  }

  const urlNodes = Array.from(paths)
    .sort((left, right) => left.localeCompare(right))
    .map(
      (path) => `
  <url>
    <loc>${toAbsoluteUrl(path)}</loc>
    <lastmod>${now}</lastmod>
  </url>`,
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>
`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}
