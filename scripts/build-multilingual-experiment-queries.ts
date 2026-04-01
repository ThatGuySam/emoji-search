import { mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import {
  buildMultilingualExperimentQueryBundle,
  type MultilingualExperimentQueryBundle,
} from '../src/utils/multilingualExperimentQueries'
import type { MultilingualEvalTargetsArtifact } from '../src/utils/multilingualEvalTargets'

const DEFAULT_EVAL_TARGETS_PATH =
  'src/artifacts/autoresearch/multilingual-e5/eval-targets.json'
const DEFAULT_OUTPUT_PATH =
  'src/artifacts/autoresearch/multilingual-e5/experiment-queries.json'

type Options = {
  evalTargetsPath: string
  outputPath: string
}

function parseArgs(argv: string[]): Options {
  const args = argv.slice(2)
  let evalTargetsPath =
    DEFAULT_EVAL_TARGETS_PATH
  let outputPath = DEFAULT_OUTPUT_PATH

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case '--eval-targets':
        if (!next) {
          throw new Error(
            'Missing value for --eval-targets',
          )
        }
        evalTargetsPath = next
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
            'Usage: bun scripts/build-multilingual-experiment-queries.ts [options]',
            '',
            `  --eval-targets <path>  Default: ${DEFAULT_EVAL_TARGETS_PATH}`,
            `  --output <path>        Default: ${DEFAULT_OUTPUT_PATH}`,
          ].join('\n'),
        )
        process.exit(0)

      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return {
    evalTargetsPath,
    outputPath,
  }
}

async function readEvalTargets(
  filePath: string,
): Promise<MultilingualEvalTargetsArtifact> {
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw) as MultilingualEvalTargetsArtifact
}

async function writeArtifact(
  outputPath: string,
  artifact: MultilingualExperimentQueryBundle,
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
  const evalTargetsPath = resolve(
    options.evalTargetsPath,
  )
  const outputPath = resolve(options.outputPath)
  const evalTargets =
    await readEvalTargets(evalTargetsPath)
  const artifact =
    buildMultilingualExperimentQueryBundle(
      evalTargets,
      {
        sourceEvalTargetsPath:
          evalTargetsPath,
      },
    )

  await writeArtifact(outputPath, artifact)

  console.log(
    JSON.stringify(
      {
        outputPath,
        locales: artifact.locales,
        queries: artifact.queries.length,
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
