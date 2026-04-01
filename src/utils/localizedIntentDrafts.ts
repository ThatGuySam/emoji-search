import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export type LocalizedIntentDraftRecord = {
  id: string
  slug: string
  localizedSlug: string
  localizedQuery: string
  localizedAltQueries: string[]
  localizedTitle: string
  localizedMetaDescription: string
  translationNotes: string
  reviewFlags: string[]
  confidence: number
}

export type LocalizedIntentDraftArtifact = {
  generatedAt: string
  locale: string
  source: string
  generator: {
    model: string
    script: string
    embeddingGemmaModel: null
    dryRun: false
  }
  records: LocalizedIntentDraftRecord[]
}

type ParsedFrontmatter = {
  locale: string
  sourceSlug: string
  localizedSlug: string
  title: string
  description: string
  query: string
  intentId: string
}

function parseFrontmatter(markdown: string) {
  const match = markdown.match(
    /^---\n([\s\S]*?)\n---\n?/u,
  )
  if (!match) {
    throw new Error('Missing frontmatter block.')
  }
  return match[1]!
}

function readQuotedField(
  frontmatter: string,
  key: string,
) {
  const match = frontmatter.match(
    new RegExp(
      `^${key}:\\s*"([^"]+)"\\s*$`,
      'mu',
    ),
  )
  if (!match) {
    throw new Error(
      `Missing required frontmatter field "${key}".`,
    )
  }
  return match[1]!
}

export function parseLocalizedIntentFrontmatter(
  markdown: string,
): ParsedFrontmatter {
  const frontmatter = parseFrontmatter(markdown)

  return {
    locale: readQuotedField(frontmatter, 'locale'),
    sourceSlug: readQuotedField(
      frontmatter,
      'sourceSlug',
    ),
    localizedSlug: readQuotedField(
      frontmatter,
      'localizedSlug',
    ),
    title: readQuotedField(frontmatter, 'title'),
    description: readQuotedField(
      frontmatter,
      'description',
    ),
    query: readQuotedField(frontmatter, 'query'),
    intentId: readQuotedField(
      frontmatter,
      'intentId',
    ),
  }
}

export async function buildLocalizedIntentDraftArtifact(
  options: {
    locale: string
    contentDir?: string
    generatedAt?: string
  },
): Promise<LocalizedIntentDraftArtifact> {
  const contentDir = path.resolve(
    options.contentDir ??
      path.join(
        process.cwd(),
        'src/content/localized-intent-pages',
      ),
  )
  const localeDir = path.join(
    contentDir,
    options.locale.toLowerCase(),
  )
  const files = (await readdir(localeDir))
    .filter((file) => file.endsWith('.md'))
    .sort((left, right) =>
      left.localeCompare(right),
    )

  const records: LocalizedIntentDraftRecord[] = []

  for (const file of files) {
    const raw = await readFile(
      path.join(localeDir, file),
      'utf8',
    )
    const parsed = parseLocalizedIntentFrontmatter(raw)
    records.push({
      id: parsed.intentId,
      slug: parsed.sourceSlug,
      localizedSlug: parsed.localizedSlug,
      localizedQuery: parsed.query,
      localizedAltQueries: [],
      localizedTitle: parsed.title,
      localizedMetaDescription:
        parsed.description,
      translationNotes:
        'Derived from the published localized intent page.',
      reviewFlags: [],
      confidence: 0.95,
    })
  }

  return {
    generatedAt:
      options.generatedAt ??
      new Date().toISOString(),
    locale: options.locale,
    source: `src/content/localized-intent-pages/${options.locale.toLowerCase()}`,
    generator: {
      model: 'published-localized-pages',
      script:
        'scripts/build-multilingual-drafts-from-pages.ts',
      embeddingGemmaModel: null,
      dryRun: false,
    },
    records,
  }
}
