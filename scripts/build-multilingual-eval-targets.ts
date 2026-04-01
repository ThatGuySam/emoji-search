import { mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import {
  buildMultilingualEvalTargets,
  type MultilingualEvalTargetsArtifact,
} from '../src/utils/multilingualEvalTargets'
import type { MultilingualAutoresearchSeed } from '../src/utils/multilingualAutoresearchSeed'

const DEFAULT_SEED_PATH =
  'src/artifacts/autoresearch/multilingual-e5/seed.json'
const DEFAULT_OUTPUT_PATH =
  'src/artifacts/autoresearch/multilingual-e5/eval-targets.json'

type Options = {
  seedPath: string
  outputPath: string
}

function parseArgs(argv: string[]): Options {
  const args = argv.slice(2)
  let seedPath = DEFAULT_SEED_PATH
  let outputPath = DEFAULT_OUTPUT_PATH

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case '--seed':
        if (!next) {
          throw new Error('Missing value for --seed')
        }
        seedPath = next
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
            'Usage: bun scripts/build-multilingual-eval-targets.ts [options]',
            '',
            `  --seed <path>     Default: ${DEFAULT_SEED_PATH}`,
            `  --output <path>   Default: ${DEFAULT_OUTPUT_PATH}`,
          ].join('\n'),
        )
        process.exit(0)

      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return {
    seedPath,
    outputPath,
  }
}

async function readSeed(
  path: string,
): Promise<MultilingualAutoresearchSeed> {
  const raw = await readFile(path, 'utf8')
  return JSON.parse(raw) as MultilingualAutoresearchSeed
}

async function writeArtifact(
  outputPath: string,
  artifact: MultilingualEvalTargetsArtifact,
) {
  await mkdir(dirname(outputPath), {
    recursive: true,
  })
  await Bun.write(
    outputPath,
    `${JSON.stringify(artifact, null, 2)}\n`,
  )
}

async function main() {
  const options = parseArgs(process.argv)
  const seedPath = resolve(options.seedPath)
  const outputPath = resolve(options.outputPath)
  const seed = await readSeed(seedPath)
  const artifact =
    buildMultilingualEvalTargets(seed, {
      sourceSeedPath: seedPath,
    })

  await writeArtifact(outputPath, artifact)

  console.log(
    JSON.stringify(
      {
        outputPath,
        locales: artifact.locales.map(
          (locale) => ({
            locale: locale.locale,
            candidateQueries:
              locale.coverageSummary
                .candidateQueries,
            readyQueries:
              locale.coverageSummary.readyQueries,
            reviewQueries:
              locale.coverageSummary.reviewQueries,
            intentsMissingTracks:
              locale.coverageSummary
                .intentsMissingTracks,
          }),
        ),
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
