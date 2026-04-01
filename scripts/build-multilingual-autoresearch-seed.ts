import { mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import {
  MULTILINGUAL_E5_PROTOTYPE_LOCALES,
  buildMultilingualAutoresearchSeed,
  type LocaleDraftArtifact,
} from '../src/utils/multilingualAutoresearchSeed'

const DEFAULT_DRAFTS_DIR =
  'docs/generated/multilingual'
const DEFAULT_OUTPUT_PATH =
  'src/artifacts/autoresearch/multilingual-e5/seed.json'

type DraftFileRecord = {
  id: string
  localizedQuery: string
  localizedAltQueries: string[]
  confidence: number
  reviewFlags: string[]
}

type DraftFile = {
  locale: string
  records: DraftFileRecord[]
}

type Options = {
  draftsDir: string
  outputPath: string
}

function parseArgs(argv: string[]): Options {
  const args = argv.slice(2)
  let draftsDir = DEFAULT_DRAFTS_DIR
  let outputPath = DEFAULT_OUTPUT_PATH

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case '--drafts-dir':
        if (!next) {
          throw new Error(
            'Missing value for --drafts-dir',
          )
        }
        draftsDir = next
        i += 1
        break

      case '--output':
        if (!next) {
          throw new Error(
            'Missing value for --output',
          )
        }
        outputPath = next
        i += 1
        break

      case '--help':
        console.log(
          [
            'Usage: bun scripts/build-multilingual-autoresearch-seed.ts [options]',
            '',
            `  --drafts-dir <path>   Default: ${DEFAULT_DRAFTS_DIR}`,
            `  --output <path>       Default: ${DEFAULT_OUTPUT_PATH}`,
          ].join('\n'),
        )
        process.exit(0)

      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return {
    draftsDir,
    outputPath,
  }
}

async function maybeLoadDraft(
  draftsDir: string,
  locale: string,
): Promise<LocaleDraftArtifact | null> {
  const path = resolve(
    draftsDir,
    locale,
    'emoji-intents.generated.json',
  )

  try {
    const raw = await readFile(path, 'utf8')
    const parsed = JSON.parse(raw) as DraftFile
    return {
      locale: parsed.locale,
      path,
      records: parsed.records.map((record) => ({
        id: record.id,
        localizedQuery: record.localizedQuery,
        localizedAltQueries:
          record.localizedAltQueries,
        confidence: record.confidence,
        reviewFlags: record.reviewFlags,
      })),
    }
  } catch {
    return null
  }
}

async function main() {
  const options = parseArgs(process.argv)
  const drafts: LocaleDraftArtifact[] = []

  for (const locale of MULTILINGUAL_E5_PROTOTYPE_LOCALES) {
    const draft = await maybeLoadDraft(
      options.draftsDir,
      locale.locale,
    )
    if (draft) {
      drafts.push(draft)
    }
  }

  const artifact =
    buildMultilingualAutoresearchSeed({
      drafts,
      draftsDir: options.draftsDir,
    })

  const outputPath = resolve(options.outputPath)
  await mkdir(dirname(outputPath), {
    recursive: true,
  })
  await Bun.write(
    outputPath,
    `${JSON.stringify(artifact, null, 2)}\n`,
  )

  const availableLocales = artifact.locales.filter(
    (locale) => locale.draftStatus === 'available',
  ).length

  console.log(
    JSON.stringify(
      {
        outputPath,
        candidateModel:
          artifact.candidateModel,
        locales: artifact.locales.map(
          (locale) => ({
            locale: locale.locale,
            draftStatus: locale.draftStatus,
            records: locale.records.length,
          }),
        ),
        availableLocales,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : error,
  )
  process.exit(1)
})
