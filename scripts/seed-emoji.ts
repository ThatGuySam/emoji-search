/**
 * Build an embeddings DB and ship.
 *
 * Run:
 *   $ bun scripts/seed-emoji.ts
 *   # or: npx tsx scripts/seed-emoji.ts
 *
 * Outputs:
 *   dist/emoji.tar
 *   dist/emoji.tar.br
 */

import fs from 'node:fs/promises'
import { promisify } from 'node:util'
import {
  brotliCompress,
  constants as z,
} from 'node:zlib'
import { basename } from 'node:path'
import { argv } from 'node:process'
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { env, pipeline } from
  '@huggingface/transformers'
import { MODELS_HOST,
  MODELS_PATH_TEMPLATE,
  SUPA_GTE_SMALL } from
  '../src/constants'
// https://github.com/muan/emojilib
import Emojilib from 'emojilib'


const [
  // Whether to do a faster test run with less data
  fast = false
] = argv.slice(2)

const FAST_LIMIT = 50

/**
 * Row stored in JSON and DB.
 */
type Row = {
  /** identifier */
  id: string
  /** emoji glyph */
  emoji: string
  /** short name */
  // name: string
  /** keywords */
  // keywords: string[]
}

const OUT_DIR = './dist'
const OUT_DB_TAR = `${OUT_DIR}/emoji.tar`
const OUT_DB_TAR_BR = `${OUT_DB_TAR}.br`

/**
 * Brotli at max quality for static assets.
 */
const brotliCompressAsync =
  promisify(brotliCompress)

async function brotli(
  data: Buffer | Uint8Array,
) {
  return brotliCompressAsync(data, {
    params: {
      [z.BROTLI_PARAM_QUALITY]: 11,
      [z.BROTLI_PARAM_SIZE_HINT]:
        data.byteLength,
    },
  })
}

/**
 * Format a file size in MB.
 */
async function fileSize(path: string) {
  const s = await fs.stat(path)
  return (
    (s.size / (1024 * 1024)).toFixed(2) +
    ' MB'
  )
}

/**
 * Build emoji -> keywords map from
 * emojilib (keyword -> emoji list).
 */
function buildEmojiRows(): Row[] {
  const map = new Map<string, Set<string>>()
  const rowLimit = fast ? FAST_LIMIT : undefined

  const emojis = Object.entries(Emojilib)
    .slice(0, rowLimit)

  for (const [kw, list] of emojis) {
    for (const ch of list) {
      if (!map.has(ch)) map.set(ch, new Set())
      map.get(ch)!.add(kw)
    }
  }
  const rows: Row[] = []
  for (const [ch, set] of map) {
    const keys = Array.from(set).sort()
    const name = keys[0] ?? ch
    const id = ch
    rows.push({
      id,
      emoji: keys[0],
      // name,
      // keywords: keys,
    })
  }
  if (rows.length === 0) {
    throw new Error('no emojis found')
  }
  return rows
}

/**
 * Create embeddings schema.
 */
async function initSchema(db: PGlite) {
  await db.exec(`
    create extension if not exists vector;
    create table if not exists embeddings (
      id bigint primary key
        generated always as identity,
      content text not null,
      embedding vector(384)
    );
    create index if not exists
      embeddings_hnsw_ip
    on embeddings
      using hnsw (embedding vector_ip_ops);
  `)
}

/**
 * Create the encoder pipeline.
 */
async function getEncoder() {
  // mirror browser worker env
  env.allowRemoteModels = true
  env.remoteHost = MODELS_HOST
  env.remotePathTemplate =
    MODELS_PATH_TEMPLATE
  const enc = await pipeline(
    'feature-extraction',
    SUPA_GTE_SMALL,
    { dtype: 'fp32', device: 'cpu' }
  )
  return enc
}

/**
 * Ensure vector is 384 numbers.
 */
function assertEmbedding(vec: number[]) {
  if (!Array.isArray(vec) ||
      vec.length !== 384 ||
      !vec.every(n => Number.isFinite(n))) {
    throw new Error('len 384 number[]')
  }
}

/**
 * Encode content to embedding.
 */
async function encodeContent(
  content: string,
  enc: Awaited<ReturnType<
    typeof getEncoder
  >>,
) {
  const out = await enc(content, {
    pooling: 'mean',
    normalize: true,
  })
  // transformers.js returns a typed array at
  // runtime. Cast narrowly and normalize to
  // a plain number[].
  const raw = (out as unknown as {
    data: Float32Array | number[]
  }).data
  const arr = Array.isArray(raw)
    ? raw.slice()
    : Array.from(raw)
  assertEmbedding(arr)
  return arr
}

/**
 * Search by embedding vector (cosine/IP),
 * mirroring src/utils/db.ts logic.
 */
async function searchEmbeddings(
  db: PGlite,
  embedding: number[],
  matchThreshold = 0.8,
  limit = 5,
) {
  const res = await db.query<{
    content: string
  }>(
    `
    select content from embeddings
    where embedding <#> $1 < $2
    order by embedding <#> $1
    limit $3;
    `,
    [
      JSON.stringify(embedding),
      -Number(matchThreshold),
      Number(limit),
    ]
  )
  return res.rows
}

/**
 * Insert embeddings in batches.
 */
async function insertEmbeddings(
  db: PGlite,
  rows: Row[],
) {
  const enc = await getEncoder()
  const batch = 64
  for (let i = 0; i < rows.length; i +=
       batch) {
    const slice = rows.slice(i, i + batch)
    const embeds = await Promise.all(
      slice.map(r => {
        // const keys = r.keywords
        //   .slice(0, 10)
        //   .join(' ')
        const content = `${r.emoji}`
        return encodeContent(
          content, enc
        ).then(e => ({
          content,
          embedding: e,
        }))
      })
    )
    await db.transaction(async (tx) => {
      const vals = embeds.map((_, j) =>
        `($${j*2+1},$${j*2+2})`
      ).join(',')
      const params: unknown[] = []
      for (const e of embeds) {
        params.push(
          e.content,
          JSON.stringify(e.embedding)
        )
      }
      await tx.query(
        `insert into embeddings
         (content, embedding)
         values ${vals}`,
        params
      )
    })
  }
}

/**
 * Main build: JSON, DB, tar, Brotli.
 */
async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  console.log('🚣 Building emoji rows...')
  const rows = buildEmojiRows()

  console.log('🚣 Building emoji DB...')
  const db = new PGlite({
    extensions: { vector },
  })
  await db.waitReady

  console.log('🚣 Initializing schema...')
  await initSchema(db)

  console.log('🚣 Inserting embeddings...')
  await insertEmbeddings(db, rows)

  console.log('🚣 Dumping DB to memory...')
  const tarBlob = await db.dumpDataDir('none')
  const tarBuf = Buffer.from(
    await tarBlob.arrayBuffer()
  )

  // File size reporting moved after write

  // Demo query: encode text exactly like
  // the browser worker and run a vector
  // search using inner product.
  const enc = await getEncoder()
  const queryText = 'shout'
  const qVec = await encodeContent(
    queryText, enc
  )
  const top = await searchEmbeddings(
    db, qVec, 0.8, 5
  )
  console.log(
    'Top matches:',
    top.map(r => r.content)
  )

  const writeCompressed = async () => {
    if (fast) {
      console.log('⏭️ Skipping compression...')
      return
    }

    return await fs.writeFile(
      OUT_DB_TAR_BR,
      await brotli(tarBuf)
    )
  }

  console.log('🚣 Writing DB files...')
  await Promise.all([
    // Write uncompressed DB
    fs.writeFile(OUT_DB_TAR, tarBuf),
    // Compress DB
    writeCompressed(),
  ])

  const report = [
    [basename(OUT_DB_TAR),
      await fileSize(OUT_DB_TAR)],
    [basename(OUT_DB_TAR_BR),
      await fileSize(OUT_DB_TAR_BR)],
  ].map(([f, s]) => ({ file: f, size: s }))

  console.table(report)

  await db.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})