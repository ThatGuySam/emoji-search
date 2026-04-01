export const SITE_META = {
  name: 'FetchMoji',
  url: 'https://fetchmoji.com',
  defaultDescription:
    'Find the perfect emoji using your own words. ' +
    'All ranking and inference run fully client-side ' +
    '(no servers, no telemetry).',
} as const

type BuildPageMetaInput = {
  pageTitle?: string
  description?: string
  canonicalPath?: string
}

export function normalizePath(path: string) {
  if (!path.startsWith('/')) {
    return `/${path}`
  }
  return path
}

export function buildPageMeta(
  input: BuildPageMetaInput = {},
) {
  const pageTitle = input.pageTitle?.trim()
  const title = pageTitle
    ? `${pageTitle} | ${SITE_META.name}`
    : SITE_META.name
  const description =
    input.description?.trim() ||
    SITE_META.defaultDescription
  const canonicalPath = normalizePath(
    input.canonicalPath || '/',
  )
  return {
    title,
    description,
    canonicalPath,
  }
}

