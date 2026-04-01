import type { FeatureExtractionPipeline } from '@huggingface/transformers'
import { env, pipeline } from '@huggingface/transformers'
import { describe, expect, it } from 'vitest'

import {
  DATA_TYPE,
  DEFAULT_DIMENSIONS,
  DEFAULT_MODEL,
  MODEL_REVISION,
} from '../src/constants'
import { defaultPipelineOptions } from '../src/utils/hf'

type QueryMeasurement = {
  query: string
  elapsedMs: number
  dimensions: number
}

type BenchmarkMetrics = {
  userAgent: string
  remoteHost: string
  coldInitMs: number
  warmInitMs: number
  coldEncode: QueryMeasurement
  warmEncodes: QueryMeasurement[]
  warmEncodeMedianMs: number
  warmEncodeAvgMs: number
}

const QUERIES = [
  'celebrate a win',
  'facepalm',
  'please pray for me',
  'sad crying',
  'thinking hard',
]

function roundMs(value: number): number {
  return Number(value.toFixed(1))
}

function average(values: number[]): number {
  const total = values.reduce(
    (sum, value) => sum + value,
    0,
  )
  return total / values.length
}

function median(values: number[]): number {
  const sorted = values
    .slice()
    .sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1]! + sorted[middle]!) / 2
  }

  return sorted[middle]!
}

async function measureQuery(options: {
  encoder: FeatureExtractionPipeline
  query: string
}): Promise<QueryMeasurement> {
  const start = performance.now()
  const output = await options.encoder(
    options.query,
    {
      pooling: 'mean',
      normalize: true,
    },
  )
  const dimensions = Array.from(output.data).length

  return {
    query: options.query,
    elapsedMs: roundMs(
      performance.now() - start,
    ),
    dimensions,
  }
}

describe('transformers browser benchmark', () => {
  it(
    'reports comparable init and query timings',
    async () => {
      env.allowRemoteModels = true
      env.remoteHost = 'https://huggingface.co'
      env.remotePathTemplate =
        '{model}/resolve/{revision}/'

      const coldInitStart = performance.now()
      const coldEncoder = await pipeline(
        'feature-extraction',
        DEFAULT_MODEL,
        defaultPipelineOptions({
          dtype: DATA_TYPE,
          revision: MODEL_REVISION,
        }),
      )
      const coldInitMs = roundMs(
        performance.now() - coldInitStart,
      )

      const coldEncode = await measureQuery({
        encoder: coldEncoder,
        query: QUERIES[0]!,
      })

      await coldEncoder.dispose()

      const warmInitStart = performance.now()
      const warmEncoder = await pipeline(
        'feature-extraction',
        DEFAULT_MODEL,
        defaultPipelineOptions({
          dtype: DATA_TYPE,
          revision: MODEL_REVISION,
        }),
      )
      const warmInitMs = roundMs(
        performance.now() - warmInitStart,
      )

      const warmEncodes: QueryMeasurement[] = []
      for (const query of QUERIES.slice(1)) {
        warmEncodes.push(
          await measureQuery({
            encoder: warmEncoder,
            query,
          })
        )
      }

      const warmLatencies = warmEncodes.map(
        (entry) => entry.elapsedMs,
      )
      const metrics: BenchmarkMetrics = {
        userAgent: navigator.userAgent,
        remoteHost: env.remoteHost,
        coldInitMs,
        warmInitMs,
        coldEncode,
        warmEncodes,
        warmEncodeMedianMs: roundMs(
          median(warmLatencies),
        ),
        warmEncodeAvgMs: roundMs(
          average(warmLatencies),
        ),
      }

      console.log(
        `TRANSFORMERS_BENCH ${JSON.stringify(metrics)}`,
      )

      expect(coldEncode.dimensions).toBe(
        DEFAULT_DIMENSIONS,
      )
      expect(warmEncodes).toHaveLength(
        QUERIES.length - 1,
      )
      for (const entry of warmEncodes) {
        expect(entry.dimensions).toBe(
          DEFAULT_DIMENSIONS,
        )
      }

      await warmEncoder.dispose()
    },
    180_000,
  )
})
