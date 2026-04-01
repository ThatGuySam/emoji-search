import fs from 'node:fs/promises'
import path from 'node:path'

import { emojiIntents } from '../../src/data/emojiIntents'

const DEFAULT_CONTENT_DIR = path.resolve(
  process.cwd(),
  'src/content/intent-pages',
)

const GENERIC_LABEL_PHRASES = new Set([
  'balanced pick',
  'best direct fit',
  'best opener',
  'classic awkward overlap',
  'default pick',
  'heavier pick',
  'most common social reset',
  'most heartfelt',
  'safe default',
  'safer pick',
  'signature pick',
  'softer pick',
])

const GENERIC_LABEL_TOKENS = new Set([
  'balanced',
  'best',
  'classic',
  'close',
  'default',
  'direct',
  'fit',
  'heartfelt',
  'most',
  'opener',
  'pick',
  'reset',
  'safe',
  'safer',
  'signature',
  'softer',
  'steady',
])

const NON_QUERY_LEADING_TOKENS = new Set([
  'a',
  'an',
  'if',
  'it',
  'someone',
  'that',
  'the',
  'their',
  'they',
  'this',
  'we',
  'when',
  'you',
  'your',
])

export type EditorialAliasConfidence =
  | 'high'
  | 'medium'
  | 'low'

export type EditorialAliasSource =
  | 'summary'
  | 'line_label'
  | 'line_detail'

export type EditorialAlias = {
  phrase: string
  source: EditorialAliasSource
  confidence: EditorialAliasConfidence
}

function unique(items: readonly string[]): string[] {
  return Array.from(new Set(items))
}

function uniqueAliases(
  aliases: readonly EditorialAlias[],
): EditorialAlias[] {
  const seen = new Set<string>()
  const out: EditorialAlias[] = []

  for (const alias of aliases) {
    const key = `${alias.phrase}::${alias.source}::${alias.confidence}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    out.push(alias)
  }

  return out
}

function humanizePhrase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[`*_#>\[\]()"]/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripMarkdown(input: string): string {
  return input
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim()
}

function parseFrontmatter(markdown: string) {
  const match = markdown.match(
    /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/u,
  )
  if (!match) {
    throw new Error('Missing frontmatter block in intent page.')
  }

  const [, frontmatter, body] = match
  return {
    frontmatter,
    body: body.trim(),
  }
}

function readQuotedField(
  frontmatter: string,
  key: string,
): string {
  const match = frontmatter.match(
    new RegExp(`^${key}:\\s*"([^"]+)"\\s*$`, 'mu'),
  )
  if (!match) {
    throw new Error(
      `Missing required frontmatter field "${key}".`,
    )
  }

  return match[1]!
}

function splitPhraseList(input: string): string[] {
  const cleaned = stripMarkdown(input)
    .replace(/\bemoji(?:es)?\b/giu, ' ')
    .replace(/\bmessage\b/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const pieces = cleaned
    .split(/\s*,\s*|\s+\bor\b\s+|\s+\band\b\s+/iu)
    .map((part) =>
      humanizePhrase(
        part.replace(/^(?:or|and)\s+/iu, ''),
      ),
    )
    .filter(Boolean)
    .filter((part) => {
      const words = part.split(/\s+/)
      return words.length >= 1 && words.length <= 6
    })

  if (pieces.length > 0) {
    return unique(pieces)
  }

  const fallback = humanizePhrase(cleaned)
  if (!fallback) return []

  const words = fallback.split(/\s+/)
  return words.length <= 8 ? [fallback] : []
}

function phraseWordCount(phrase: string) {
  return phrase.split(/\s+/).filter(Boolean).length
}

function classifyLineLabel(
  phrase: string,
): EditorialAliasConfidence | null {
  const words = phrase.split(/\s+/).filter(Boolean)
  if (
    words.length === 0 ||
    words.length > 3 ||
    GENERIC_LABEL_PHRASES.has(phrase)
  ) {
    return null
  }

  if (
    words.some((word) => GENERIC_LABEL_TOKENS.has(word))
  ) {
    return null
  }

  return 'high'
}

function classifyPhrase(
  phrase: string,
  source: EditorialAliasSource,
): EditorialAliasConfidence | null {
  const words = phrase.split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return null
  }

  const firstWord = words[0]!
  const hasLeadingStopWord =
    NON_QUERY_LEADING_TOKENS.has(firstWord)

  if (source === 'line_label') {
    return classifyLineLabel(phrase)
  }

  if (source === 'line_detail') {
    if (!hasLeadingStopWord && words.length <= 4) {
      return 'high'
    }
    if (!hasLeadingStopWord && words.length <= 6) {
      return 'medium'
    }
    return null
  }

  if (!hasLeadingStopWord && words.length <= 4) {
    return 'medium'
  }
  if (!hasLeadingStopWord && words.length <= 6) {
    return 'low'
  }

  return null
}

function extractSummaryAliases(
  body: string,
): EditorialAlias[] {
  const firstParagraph = body
    .split(/\n\s*\n/u)[0]
    ?.trim()

  if (!firstParagraph) {
    return []
  }

  const cleaned = stripMarkdown(firstParagraph)
  const patterns = [
    /\bcan mean ([^.?!]+)(?:[.?!]|$)/iu,
    /\bwhen you want to ([^.?!]+)(?:[.?!]|$)/iu,
    /\bwork best when ([^.?!]+)(?:[.?!]|$)/iu,
  ]

  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (!match?.[1]) continue
    return splitPhraseList(match[1])
      .map((phrase) => {
        const confidence = classifyPhrase(
          phrase,
          'summary',
        )
        if (!confidence) {
          return null
        }
        return {
          phrase,
          source: 'summary' as const,
          confidence,
        }
      })
      .filter(
        (
          alias,
        ): alias is EditorialAlias => alias !== null,
      )
  }

  return []
}

function extractLineAliases(
  line: string,
): EditorialAlias[] {
  const cleaned = stripMarkdown(line)
  const aliases: EditorialAlias[] = []
  const [label, remainder] = cleaned.split(':', 2)

  if (label) {
    const humanizedLabel = humanizePhrase(label)
    const confidence = humanizedLabel
      ? classifyPhrase(
          humanizedLabel,
          'line_label',
        )
      : null
    if (humanizedLabel && confidence) {
      aliases.push({
        phrase: humanizedLabel,
        source: 'line_label',
        confidence,
      })
    }
  }

  if (!remainder) {
    return uniqueAliases(aliases)
  }

  const patterns = [
    /\bfor ([^.?!]+)(?:[.?!]|$)/iu,
    /\bif you want to signal ([^.?!]+)(?:[.?!]|$)/iu,
    /\bif you want ([^.?!]+)(?:[.?!]|$)/iu,
  ]

  for (const pattern of patterns) {
    const match = remainder.match(pattern)
    if (!match?.[1]) continue
    aliases.push(
      ...splitPhraseList(match[1])
        .map((phrase) => {
          const confidence = classifyPhrase(
            phrase,
            'line_detail',
          )
          if (!confidence) {
            return null
          }
          return {
            phrase,
            source: 'line_detail' as const,
            confidence,
          }
        })
        .filter(
          (
            alias,
          ): alias is EditorialAlias => alias !== null,
        ),
    )
  }

  return uniqueAliases(aliases)
}

export async function buildIntentPageEditorialAliasMap(
  options: {
    contentDir?: string
    minConfidence?: EditorialAliasConfidence
  } = {},
) {
  const contentDir =
    options.contentDir ?? DEFAULT_CONTENT_DIR
  const entries = await fs.readdir(contentDir, {
    withFileTypes: true,
  })
  const confidenceOrder: Record<
    EditorialAliasConfidence,
    number
  > = {
    high: 3,
    medium: 2,
    low: 1,
  }
  const minConfidence =
    options.minConfidence ?? 'low'
  const map = new Map<string, EditorialAlias[]>()

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue
    }

    const fullPath = path.join(contentDir, entry.name)
    const markdown = await fs.readFile(fullPath, 'utf8')
    const { frontmatter, body } =
      parseFrontmatter(markdown)
    const intentId = readQuotedField(
      frontmatter,
      'intentId',
    )
    const intent = emojiIntents.find(
      (candidate) => candidate.id === intentId,
    )

    if (!intent) {
      throw new Error(
        `Intent page ${entry.name} points to unknown intent "${intentId}".`,
      )
    }

    const sharedAliases = extractSummaryAliases(
      body,
    ).filter(
      (alias) =>
        confidenceOrder[alias.confidence] >=
        confidenceOrder[minConfidence],
    )
    if (sharedAliases.length > 0) {
      for (const emoji of intent.relevant) {
        const current = map.get(emoji) ?? []
        map.set(
          emoji,
          uniqueAliases([
            ...current,
            ...sharedAliases,
          ]),
        )
      }
    }

    const lines = body
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    for (const line of lines) {
      if (!line.includes(':')) {
        continue
      }

      const aliases = extractLineAliases(line)
      if (aliases.length === 0) {
        continue
      }

      for (const emoji of intent.relevant) {
        if (!line.includes(emoji)) {
          continue
        }

        const filteredAliases = aliases.filter(
          (alias) =>
            confidenceOrder[alias.confidence] >=
            confidenceOrder[minConfidence],
        )
        if (filteredAliases.length === 0) {
          continue
        }

        const current = map.get(emoji) ?? []
        map.set(
          emoji,
          uniqueAliases([
            ...current,
            ...filteredAliases,
          ]),
        )
      }
    }
  }

  return map
}

export async function buildIntentPageEditorialKeywordMap(
  options: {
    contentDir?: string
    minConfidence?: EditorialAliasConfidence
  } = {},
) {
  const aliasMap =
    await buildIntentPageEditorialAliasMap(options)
  const keywordMap = new Map<string, string[]>()

  for (const [emoji, aliases] of aliasMap) {
    keywordMap.set(
      emoji,
      unique(aliases.map((alias) => alias.phrase)),
    )
  }

  return keywordMap
}
