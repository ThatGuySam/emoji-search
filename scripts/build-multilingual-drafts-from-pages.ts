import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import {
  buildLocalizedIntentDraftArtifact,
} from '../src/utils/localizedIntentDrafts'
import { listIntentPageLocales } from '../src/lib/intentPageLocales'

const DEFAULT_OUTPUT_DIR =
  'docs/generated/multilingual'

type Options = {
  outputDir: string
}

function parseArgs(argv: string[]): Options {
  const args = argv.slice(2)
  let outputDir = DEFAULT_OUTPUT_DIR

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case '--output-dir':
        if (!next) {
          throw new Error(
            'Missing value for --output-dir',
          )
        }
        outputDir = next
        i += 1
        break

      case '--help':
        console.log(
          [
            'Usage: bun scripts/build-multilingual-drafts-from-pages.ts [options]',
            '',
            `  --output-dir <path>  Default: ${DEFAULT_OUTPUT_DIR}`,
          ].join('\n'),
        )
        process.exit(0)

      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return { outputDir }
}

async function main() {
  const options = parseArgs(process.argv)
  const outputDir = path.resolve(options.outputDir)

  for (const locale of listIntentPageLocales()) {
    const artifact =
      await buildLocalizedIntentDraftArtifact({
        locale: locale.code,
      })
    const localeDir = path.join(
      outputDir,
      locale.code,
    )
    await mkdir(localeDir, { recursive: true })
    const outputPath = path.join(
      localeDir,
      'emoji-intents.generated.json',
    )
    await Bun.write(
      outputPath,
      `${JSON.stringify(artifact, null, 2)}\n`,
    )
    console.log(
      `${locale.code}: wrote ${artifact.records.length} records to ${outputPath}`,
    )
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : error,
  )
  process.exit(1)
})
