import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { emojiIntents } from '../src/data/emojiIntents'

type SourceIntent = {
  id: string
  slug: string
  query: string
  altQueries: string[]
  category: string
  relevant: string[]
}

type DraftRecord = {
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

type LocaleDraftResponse = {
  locale: string
  records: DraftRecord[]
}

type EmbeddingPair = {
  id: string
  field: string
  source: string
  candidate: string
}

type EmbeddingPairScore = {
  id: string
  field: string
  similarity: number
}

type EmbeddingResponse = {
  model: string
  scores: EmbeddingPairScore[]
}

type Options = {
  locales: string[]
  limit: number | null
  outputDir: string
  model: string
  embeddingModel: string
  qaLowThreshold: number
  qaHighThreshold: number
  qaSampleSize: number
  dryRun: boolean
  skipEmbeddingGemma: boolean
  include: Set<string>
}

type QaBand =
  | 'high'
  | 'medium'
  | 'low'
  | 'skipped'

type ArtifactRecord = DraftRecord & {
  sourceQuery: string
  sourceAltQueries: string[]
  category: string
  relevant: string[]
  embeddingGemmaQa: {
    status: 'ok' | 'review' | 'skipped'
    band: QaBand
    averageSimilarity: number | null
    querySimilarity: number | null
    titleSimilarity: number | null
    descriptionSimilarity: number | null
    reason?: string
  }
}

type Artifact = {
  generatedAt: string
  locale: string
  source: string
  generator: {
    model: string
    script: string
    embeddingGemmaModel: string | null
    dryRun: boolean
  }
  qaSummary: {
    thresholds: {
      low: number
      high: number
    }
    sampleSize: number
    counts: Record<QaBand, number>
    samples: {
      high: Array<{
        id: string
        slug: string
        sourceQuery: string
        localizedQuery: string
        averageSimilarity: number
      }>
      low: Array<{
        id: string
        slug: string
        sourceQuery: string
        localizedQuery: string
        averageSimilarity: number
      }>
    }
  }
  records: ArtifactRecord[]
}

const DEFAULT_OUTPUT_DIR = 'docs/generated/multilingual'
const DEFAULT_MODEL = 'claude-opus-4-6'
const DEFAULT_EMBEDDING_MODEL = 'google/embeddinggemma-300m'
const DEFAULT_QA_LOW_THRESHOLD = 0.55
const DEFAULT_QA_HIGH_THRESHOLD = 0.8
const DEFAULT_QA_SAMPLE_SIZE = 5

function usage() {
  return [
    'Usage: bun scripts/generate-multilingual-drafts.ts [options]',
    '',
    'Options:',
    '  --locales <csv>              Required. Example: es,fr,pt-BR',
    '  --limit <n>                 Limit source intents for a small run',
    `  --output-dir <path>         Output directory (default: ${DEFAULT_OUTPUT_DIR})`,
    `  --model <name>              Claude model name (default: ${DEFAULT_MODEL})`,
    `  --embedding-model <name>    EmbeddingGemma model name (default: ${DEFAULT_EMBEDDING_MODEL})`,
    `  --qa-low-threshold <n>      Low QA threshold (default: ${DEFAULT_QA_LOW_THRESHOLD})`,
    `  --qa-high-threshold <n>     High QA threshold (default: ${DEFAULT_QA_HIGH_THRESHOLD})`,
    `  --qa-sample-size <n>        QA sample count per band (default: ${DEFAULT_QA_SAMPLE_SIZE})`,
    '  --include <csv>             Restrict to ids or slugs',
    '  --dry-run                   Print prompt summary without calling Claude',
    '  --skip-embeddinggemma       Skip EmbeddingGemma semantic QA',
    '  --help                      Show this help',
  ].join('\n')
}

function parseArgs(argv: string[]): Options {
  const args = argv.slice(2)
  let locales: string[] = []
  let limit: number | null = null
  let outputDir = DEFAULT_OUTPUT_DIR
  let model = DEFAULT_MODEL
  let embeddingModel = DEFAULT_EMBEDDING_MODEL
  let qaLowThreshold = DEFAULT_QA_LOW_THRESHOLD
  let qaHighThreshold = DEFAULT_QA_HIGH_THRESHOLD
  let qaSampleSize = DEFAULT_QA_SAMPLE_SIZE
  let dryRun = false
  let skipEmbeddingGemma = false
  let include = new Set<string>()

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const next = args[index + 1]

    if (arg === '--help' || arg === '-h') {
      console.log(usage())
      process.exit(0)
    }

    if (arg === '--dry-run') {
      dryRun = true
      continue
    }

    if (arg === '--skip-embeddinggemma') {
      skipEmbeddingGemma = true
      continue
    }

    if (
      arg === '--locales' ||
      arg === '--limit' ||
      arg === '--output-dir' ||
      arg === '--model' ||
      arg === '--embedding-model' ||
      arg === '--qa-low-threshold' ||
      arg === '--qa-high-threshold' ||
      arg === '--qa-sample-size' ||
      arg === '--include'
    ) {
      if (!next) {
        throw new Error(`Missing value for ${arg}`)
      }

      index += 1

      switch (arg) {
        case '--locales':
          locales = parseCsv(next)
          break
        case '--limit':
          limit = Number.parseInt(next, 10)
          if (!Number.isFinite(limit) || limit <= 0) {
            throw new Error(`Invalid --limit value: ${next}`)
          }
          break
        case '--output-dir':
          outputDir = next
          break
        case '--model':
          model = next
          break
        case '--embedding-model':
          embeddingModel = next
          break
        case '--qa-low-threshold':
          qaLowThreshold = parseFloatArg(
            next,
            '--qa-low-threshold',
          )
          break
        case '--qa-high-threshold':
          qaHighThreshold = parseFloatArg(
            next,
            '--qa-high-threshold',
          )
          break
        case '--qa-sample-size':
          qaSampleSize = parseIntArg(
            next,
            '--qa-sample-size',
          )
          break
        case '--include':
          include = new Set(parseCsv(next))
          break
      }

      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  if (locales.length === 0) {
    throw new Error('Missing required --locales argument')
  }

  if (qaLowThreshold <= 0 || qaLowThreshold >= 1) {
    throw new Error(
      '--qa-low-threshold must be greater than 0 and less than 1.',
    )
  }
  if (qaHighThreshold <= qaLowThreshold || qaHighThreshold > 1) {
    throw new Error(
      '--qa-high-threshold must be greater than --qa-low-threshold and less than or equal to 1.',
    )
  }
  if (!Number.isInteger(qaSampleSize) || qaSampleSize <= 0) {
    throw new Error(
      '--qa-sample-size must be a positive integer.',
    )
  }

  return {
    locales,
    limit,
    outputDir,
    model,
    embeddingModel,
    qaLowThreshold,
    qaHighThreshold,
    qaSampleSize,
    dryRun,
    skipEmbeddingGemma,
    include,
  }
}

function parseFloatArg(value: string, name: string) {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${name} value: ${value}`)
  }
  return parsed
}

function parseIntArg(value: string, name: string) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${name} value: ${value}`)
  }
  return parsed
}

function parseCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildSourceIntents(options: Options): SourceIntent[] {
  let intents = emojiIntents.map((intent) => ({
    id: intent.id,
    slug: intent.slug,
    query: intent.query,
    altQueries: [...(intent.altQueries ?? [])],
    category: intent.category,
    relevant: [...intent.relevant],
  }))

  if (options.include.size > 0) {
    intents = intents.filter(
      (intent) =>
        options.include.has(intent.id) ||
        options.include.has(intent.slug),
    )
  }

  if (options.limit != null) {
    intents = intents.slice(0, options.limit)
  }

  return intents
}

function buildSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['locale', 'records'],
    properties: {
      locale: { type: 'string' },
      records: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'slug',
            'localizedSlug',
            'localizedQuery',
            'localizedAltQueries',
            'localizedTitle',
            'localizedMetaDescription',
            'translationNotes',
            'reviewFlags',
            'confidence',
          ],
          properties: {
            id: { type: 'string' },
            slug: { type: 'string' },
            localizedSlug: { type: 'string' },
            localizedQuery: { type: 'string' },
            localizedAltQueries: {
              type: 'array',
              items: { type: 'string' },
            },
            localizedTitle: { type: 'string' },
            localizedMetaDescription: { type: 'string' },
            translationNotes: { type: 'string' },
            reviewFlags: {
              type: 'array',
              items: { type: 'string' },
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
            },
          },
        },
      },
    },
  }
}

function buildPrompt(locale: string, intents: SourceIntent[]) {
  return [
    `Localize FetchMoji's English emoji intent catalog for locale "${locale}".`,
    'Return JSON only that matches the provided schema.',
    '',
    'Goal:',
    '- Produce reviewed-but-unpublished localization drafts for search terms and SEO metadata.',
    '',
    'Rules:',
    '- Preserve every id and original slug exactly as given.',
    '- Translate for meaning and likely real-world search phrasing, not literal word-for-word output.',
    '- Keep emoji glyphs and intent categories unchanged.',
    '- Generate concise localized titles and natural meta descriptions.',
    '- Do not invent Apple UI labels, OS-version claims, or support facts.',
    '- If an item is slangy, culturally unstable, or hard to localize directly, keep the best candidate you can and add review flags.',
    '- Review flags should be short kebab-case strings such as "slang-ambiguity", "apple-terminology-risk", "needs-human-review", "low-confidence".',
    '- Confidence should be between 0 and 1.',
    '',
    'Source intents:',
    JSON.stringify(intents, null, 2),
  ].join('\n')
}

async function runClaude(
  locale: string,
  intents: SourceIntent[],
  options: Options,
): Promise<LocaleDraftResponse> {
  const schema = buildSchema()
  const prompt = buildPrompt(locale, intents)

  const proc = Bun.spawn({
    cmd: [
      'claude',
      '-p',
      '--model',
      options.model,
      '--output-format',
      'json',
      '--json-schema',
      JSON.stringify(schema),
      '--tools',
      '',
      '--max-turns',
      '1',
      prompt,
    ],
    cwd: process.cwd(),
    env: process.env,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited

  if (exitCode !== 0) {
    throw new Error(formatClaudeFailure(stderr || stdout))
  }

  const parsed = parsePossiblyWrappedJson(stdout)

  if (!isLocaleDraftResponse(parsed)) {
    throw new Error(
      `Claude returned JSON that does not match the expected shape for locale ${locale}.`,
    )
  }

  return parsed
}

function formatClaudeFailure(raw: string) {
  if (
    raw.includes('Failed to authenticate') ||
    raw.includes('authentication_error')
  ) {
    return [
      'Claude Code authentication failed.',
      'Refresh auth with `claude auth login` or `claude setup-token`, then rerun the script.',
      '',
      raw.trim(),
    ].join('\n')
  }

  return raw.trim() || 'Claude generation failed with no stderr output.'
}

function parsePossiblyWrappedJson(raw: string) {
  const trimmed = raw.trim()

  if (trimmed.length === 0) {
    throw new Error('Claude returned empty output.')
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i)
    if (fenced?.[1]) {
      return JSON.parse(fenced[1])
    }
  }

  throw new Error(`Unable to parse JSON from Claude output:\n${trimmed}`)
}

function isLocaleDraftResponse(value: unknown): value is LocaleDraftResponse {
  if (
    typeof value !== 'object' ||
    value == null ||
    !Array.isArray((value as LocaleDraftResponse).records)
  ) {
    return false
  }

  return typeof (value as LocaleDraftResponse).locale === 'string'
}

async function runEmbeddingGemmaQa(
  locale: string,
  intents: SourceIntent[],
  draft: LocaleDraftResponse,
  options: Options,
) {
  if (options.skipEmbeddingGemma) {
    return {
      scores: new Map<string, number>(),
      skippedReason: 'Skipped by --skip-embeddinggemma.',
    }
  }

  const pairs: EmbeddingPair[] = []
  for (const record of draft.records) {
    const source = intents.find((intent) => intent.id === record.id)
    if (!source) {
      continue
    }

    pairs.push({
      id: record.id,
      field: 'query',
      source: source.query,
      candidate: record.localizedQuery,
    })
    pairs.push({
      id: record.id,
      field: 'title',
      source: `Emoji for ${source.query}`,
      candidate: record.localizedTitle,
    })
    pairs.push({
      id: record.id,
      field: 'description',
      source: `Find the best emoji for ${source.query}.`,
      candidate: record.localizedMetaDescription,
    })
  }

  const proc = Bun.spawn({
    cmd: [
      'python3',
      'scripts/embeddinggemma_similarity.py',
      '--model',
      options.embeddingModel,
    ],
    cwd: process.cwd(),
    env: process.env,
    stdin: JSON.stringify({ locale, pairs }),
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited

  if (exitCode !== 0) {
    return {
      scores: new Map<string, number>(),
      skippedReason:
        stderr.trim() ||
        stdout.trim() ||
        'EmbeddingGemma QA helper failed.',
    }
  }

  const parsed = JSON.parse(stdout) as EmbeddingResponse
  const scores = new Map<string, number>()
  for (const score of parsed.scores ?? []) {
    scores.set(`${score.id}:${score.field}`, score.similarity)
  }

  return {
    scores,
    skippedReason: null,
  }
}

function scoreFor(
  scores: Map<string, number>,
  id: string,
  field: string,
) {
  return scores.get(`${id}:${field}`) ?? null
}

function average(values: Array<number | null>) {
  const present = values.filter(
    (value): value is number => value != null,
  )
  if (present.length === 0) {
    return null
  }

  return present.reduce((sum, value) => sum + value, 0) / present.length
}

function dedupe(values: string[]) {
  const seen = new Set<string>()
  const unique: string[] = []

  for (const value of values) {
    const normalized = value.trim()
    if (!normalized) {
      continue
    }

    const key = normalized.toLocaleLowerCase()
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    unique.push(normalized)
  }

  return unique
}

function rankQaBand(
  averageSimilarity: number | null,
  options: Pick<
    Options,
    'qaLowThreshold' | 'qaHighThreshold'
  >,
): QaBand {
  if (averageSimilarity == null) {
    return 'low'
  }
  if (averageSimilarity < options.qaLowThreshold) {
    return 'low'
  }
  if (averageSimilarity >= options.qaHighThreshold) {
    return 'high'
  }
  return 'medium'
}

function buildArtifact(
  intents: SourceIntent[],
  draft: LocaleDraftResponse,
  scores: Map<string, number>,
  skippedReason: string | null,
  options: Options,
): Artifact {
  const localizedQueries = new Map<string, string[]>()
  for (const record of draft.records) {
    const key = record.localizedQuery
      .trim()
      .toLocaleLowerCase()
    const current = localizedQueries.get(key) ?? []
    localizedQueries.set(key, [...current, record.id])
  }

  const records = draft.records.map((record) => {
    const source = intents.find((intent) => intent.id === record.id)
    if (!source) {
      throw new Error(
        `Missing source record for localized draft ${record.id}.`,
      )
    }

    const querySimilarity = scoreFor(scores, record.id, 'query')
    const titleSimilarity = scoreFor(scores, record.id, 'title')
    const descriptionSimilarity = scoreFor(
      scores,
      record.id,
      'description',
    )
    const averageSimilarity = average([
      querySimilarity,
      titleSimilarity,
      descriptionSimilarity,
    ])

    const reviewFlags = dedupe([...record.reviewFlags])
    if (
      localizedQueries.get(
        record.localizedQuery.trim().toLocaleLowerCase(),
      )!.length > 1
    ) {
      reviewFlags.push('duplicate-localized-query')
    }
    if (
      querySimilarity != null &&
      querySimilarity < options.qaLowThreshold
    ) {
      reviewFlags.push('embeddinggemma-low-query-similarity')
    }
    if (
      averageSimilarity != null &&
      averageSimilarity < options.qaLowThreshold
    ) {
      reviewFlags.push('embeddinggemma-low-average-similarity')
    }

    const qaBand =
      skippedReason != null
        ? 'skipped'
        : rankQaBand(averageSimilarity, options)
    const qaStatus =
      skippedReason != null
        ? 'skipped'
        : qaBand === 'low'
          ? 'review'
          : 'ok'

    return {
      ...record,
      localizedAltQueries: dedupe(record.localizedAltQueries),
      reviewFlags: dedupe(reviewFlags),
      sourceQuery: source.query,
      sourceAltQueries: source.altQueries,
      category: source.category,
      relevant: source.relevant,
      embeddingGemmaQa: {
        status: qaStatus,
        band: qaBand,
        averageSimilarity,
        querySimilarity,
        titleSimilarity,
        descriptionSimilarity,
        ...(skippedReason != null
          ? { reason: skippedReason }
          : {}),
      },
    } satisfies ArtifactRecord
  })

  const counts: Record<QaBand, number> = {
    high: 0,
    medium: 0,
    low: 0,
    skipped: 0,
  }
  for (const record of records) {
    counts[record.embeddingGemmaQa.band] += 1
  }

  const highSamples = records
    .filter(
      (record) =>
        record.embeddingGemmaQa.band === 'high' &&
        record.embeddingGemmaQa.averageSimilarity != null,
    )
    .sort(
      (left, right) =>
        right.embeddingGemmaQa.averageSimilarity! -
        left.embeddingGemmaQa.averageSimilarity!,
    )
    .slice(0, options.qaSampleSize)
    .map((record) => ({
      id: record.id,
      slug: record.slug,
      sourceQuery: record.sourceQuery,
      localizedQuery: record.localizedQuery,
      averageSimilarity:
        record.embeddingGemmaQa.averageSimilarity!,
    }))

  const lowSamples = records
    .filter(
      (record) =>
        record.embeddingGemmaQa.band === 'low' &&
        record.embeddingGemmaQa.averageSimilarity != null,
    )
    .sort(
      (left, right) =>
        left.embeddingGemmaQa.averageSimilarity! -
        right.embeddingGemmaQa.averageSimilarity!,
    )
    .slice(0, options.qaSampleSize)
    .map((record) => ({
      id: record.id,
      slug: record.slug,
      sourceQuery: record.sourceQuery,
      localizedQuery: record.localizedQuery,
      averageSimilarity:
        record.embeddingGemmaQa.averageSimilarity!,
    }))

  return {
    generatedAt: new Date().toISOString(),
    locale: draft.locale,
    source: 'src/data/emojiIntents.ts',
    generator: {
      model: options.model,
      script: 'scripts/generate-multilingual-drafts.ts',
      embeddingGemmaModel: options.skipEmbeddingGemma
        ? null
        : options.embeddingModel,
      dryRun: options.dryRun,
    },
    qaSummary: {
      thresholds: {
        low: options.qaLowThreshold,
        high: options.qaHighThreshold,
      },
      sampleSize: options.qaSampleSize,
      counts,
      samples: {
        high: highSamples,
        low: lowSamples,
      },
    },
    records,
  }
}

async function writeArtifact(
  locale: string,
  artifact: Artifact,
  outputDir: string,
) {
  const localeDir = resolve(outputDir, locale)
  await mkdir(localeDir, { recursive: true })
  const outputPath = join(
    localeDir,
    'emoji-intents.generated.json',
  )
  await Bun.write(
    outputPath,
    `${JSON.stringify(artifact, null, 2)}\n`,
  )
  return outputPath
}

async function main() {
  const options = parseArgs(Bun.argv)
  const intents = buildSourceIntents(options)

  if (intents.length === 0) {
    throw new Error(
      'No source intents matched the current filters.',
    )
  }

  for (const locale of options.locales) {
    if (options.dryRun) {
      const prompt = buildPrompt(locale, intents)
      console.log(
        JSON.stringify(
          {
            locale,
            records: intents.length,
            outputDir: resolve(options.outputDir, locale),
            model: options.model,
            embeddingGemmaModel: options.skipEmbeddingGemma
              ? null
              : options.embeddingModel,
            qaThresholds: {
              low: options.qaLowThreshold,
              high: options.qaHighThreshold,
            },
            qaSampleSize: options.qaSampleSize,
            promptPreview: prompt.slice(0, 700),
          },
          null,
          2,
        ),
      )
      continue
    }

    const draft = await runClaude(locale, intents, options)
    const qa = await runEmbeddingGemmaQa(
      locale,
      intents,
      draft,
      options,
    )
    const artifact = buildArtifact(
      intents,
      draft,
      qa.scores,
      qa.skippedReason,
      options,
    )
    const outputPath = await writeArtifact(
      locale,
      artifact,
      options.outputDir,
    )

    console.log(
      `${locale}: wrote ${artifact.records.length} records to ${outputPath}`,
    )
    console.log(
      `${locale}: qa bands high=${artifact.qaSummary.counts.high} medium=${artifact.qaSummary.counts.medium} low=${artifact.qaSummary.counts.low} skipped=${artifact.qaSummary.counts.skipped}`,
    )
    if (qa.skippedReason) {
      console.warn(
        `${locale}: EmbeddingGemma QA skipped: ${qa.skippedReason}`,
      )
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
