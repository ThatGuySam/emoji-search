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
  gzip as gzipCompress,
  constants as z,
} from 'node:zlib'
import { basename, dirname } from 'node:path'
import { argv } from 'node:process'
// https://pglite.dev/docs/api
import { PGlite } from '@electric-sql/pglite'
import zst from '@bokuweb/zstd-wasm';

import {
  DB_TAR,
  DB_TAR_BR,
  DB_TAR_GZ,
  DB_TAR_ZST,
  OUT_DIR,
} from
  '../src/constants'
import { getDB } from '../src/utils/db'
import { packEmbeddingsBinary } from '../src/utils/embeddings'
import { emojiIndex } from '../src/utils/emoji'
import { upsertObject } from '../src/utils/r2.node'
import { encodeContent, getEncoder } from '../src/utils/hf'
import { initSchema, insertEmbeddings } from '../src/utils/pglite'

const [
  // Whether to do a faster test run with less data
  fast = false
] = argv.slice(2)

const FAST_LIMIT = 50
const useBrotli: boolean = true

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
      // This only seems to give a 0.03mb reduction vs 4
      [z.BROTLI_PARAM_QUALITY]: 11,
      [z.BROTLI_PARAM_SIZE_HINT]:
        data.byteLength,
    },
  })
}

/**
 * Zstandard at high level for static assets.
 * Uses dynamic import to avoid ESM/CJS frictions.
 */
async function zstd(
  data: Buffer | Uint8Array,
  level = 19,
) {
  const out = await zst.compress(
    Buffer.from(data), level
  )
  return Buffer.from(out)
}

// Ensure WASM is ready
if (typeof zst.init === 'function') {
  await zst.init()
}

/**
 * Initialize and use zstd-wasm to
 * decompress a Buffer/Uint8Array.
 */
async function zstdDecompress(
  data: Buffer | Uint8Array,
) {
  const out = await zst.decompress(
    Buffer.from(data)
  )
  return Buffer.from(out)
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
 * Query embeddings table using inner
 * product (<#>). Mirrors app search.
 */
async function searchEmbeddings(
  db: PGlite,
  embedding: number[],
  matchThreshold = 0.8,
  limit = 5,
): Promise<Array<{ content: string }>> {
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
 * Main build: JSON, DB, tar, Brotli.
 */
async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  // Ensure nested dir (e.g. supabase/gte-small-384)
  // exists before writing DB tar files.
  await fs.mkdir(dirname(DB_TAR), {
    recursive: true,
  })

  console.log('🚣 Building emoji rows...')
  const rows = emojiIndex.slice(0, fast ? FAST_LIMIT : undefined)

  console.log('🚣 Building emoji DB...')
  const mojiDb = await getDB()

  console.log('🚣 Initializing schema...')
  await initSchema(mojiDb)

  console.log('🚣 Inserting embeddings...')
  const embeds = await insertEmbeddings(
    mojiDb, rows
  )

  console.log('🚣 Dumping DB to memory...')
  const tarBlob = await mojiDb.dumpDataDir('none')
  const tarBuf = Buffer.from(
    await tarBlob.arrayBuffer()
  )

  // File size reporting moved after write
  // Write embeddings JSON for debugging
  // and inspection alongside the DB.
  const EMBED_JSON =
    `${OUT_DIR}/embeddings.json`
  const embedsStr = JSON.stringify(embeds)
  const embedsBuf = Buffer.from(embedsStr)
  await fs.writeFile(
    EMBED_JSON,
    embedsStr
  )
  const META_JSON =
    `${OUT_DIR}/emoji-meta.json`
  const meta = rows.map(r => ({
    id: r.id,
    content: `${r.emoji} ${r.id}`,
  }))
  await fs.writeFile(
    META_JSON,
    JSON.stringify(meta)
  )

  // Pack a compact int8 binary for web
  const EMBED_BIN =
    `${OUT_DIR}/embeddings.bin`
  const embedBinBuf =
    packEmbeddingsBinary(embeds)
  await fs.writeFile(
    EMBED_BIN, embedBinBuf
  )
  const EMBED_BIN_ZST =
    `${EMBED_BIN}.zst`
  const EMBED_BIN_BR =
    `${EMBED_BIN}.br`
  const EMBED_BIN_GZ =
    `${EMBED_BIN}.gz`


  // Demo query: encode text exactly like
  // the browser worker and run a vector
  // search using inner product.
  const enc = await getEncoder()
  const queryText = 'shout'
  const qVec = await encodeContent(
    queryText, enc
  )
  const top = await searchEmbeddings(
    mojiDb, qVec, 0.8, 5
  )
  console.log(
    'Top matches:',
    top.map((row: { content: string }) =>
      row.content
    )
  )

  const writeCompressed = async () => {
    if (fast || !useBrotli) {
      console.log('⏭️ Skipping br compression...')
      return
    }

    await fs.writeFile(
      DB_TAR_BR,
      await brotli(tarBuf)
    )

    console.log(
      '🚣 Brotli compressed DB to',
      DB_TAR_BR
    )

    return
  }

  const gzipAsync = promisify(gzipCompress)
  const writeGzip = async () => {
    await fs.writeFile(
      DB_TAR_GZ,
      await gzipAsync(tarBuf)
    )
    console.log('🚣 Gzip compressed DB to', DB_TAR_GZ)
    return
  }

  const writeZstd = async () => {
    // if (fast) return
    const buf = await zstd(
      tarBuf, 19
    )
    await fs.writeFile(
      DB_TAR_ZST, buf
    )

    console.log('🚣 Zstd compressed DB to', DB_TAR_ZST)

    return
  }

  const writeEmbedZstd = async () => {
    const buf = await zstd(
      embedBinBuf, 19
    )
    await fs.writeFile(
      EMBED_BIN_ZST, buf
    )
    return
  }

  const writeEmbedGzip = async () => {
    const gzipAsync = promisify(gzipCompress)
    await fs.writeFile(
      EMBED_BIN_GZ,
      await gzipAsync(embedBinBuf)
    )
    return
  }

  const writeEmbedBrotli = async () => {
    if (fast || !useBrotli) return
    await fs.writeFile(
      EMBED_BIN_BR,
      await brotli(embedBinBuf)
    )
    return
  }

  console.log('🚣 Writing DB files...')
  await Promise.all([
    // Write uncompressed DB
    fs.writeFile(DB_TAR, tarBuf).then(
      () => console.log('🚣 Uncompressed DB written')
    ),
    // Compress DB
    writeCompressed(),
    // Compress DB (Zstd)
    writeZstd(),
    // Compress DB (Gzip)
    writeGzip(),
    // Compress Embeddings BIN variants
    writeEmbedZstd(),
    writeEmbedGzip(),
    writeEmbedBrotli(),
  ])

  // Verify .zst round-trip by reading
  // the BIN file and ensuring it matches
  // the original packed binary buffer
  try {
    const zstBuf = await fs.readFile(
      EMBED_BIN_ZST
    )
    const dec = await zstdDecompress(
      zstBuf
    )
    const same = dec.equals(embedBinBuf)
    console.log(
      '🚣 Zstd round-trip ok:', same
    )
    if (!same) {
      throw new Error(
        'zstd round-trip mismatch'
      )
    }
  } catch (e) {
    console.warn(
      '⚠️ Zstd verify failed:', e
    )
  }

  const files = [
    DB_TAR,
    EMBED_JSON,
    META_JSON,
    EMBED_BIN,
    EMBED_BIN_ZST,
    EMBED_BIN_GZ,
    DB_TAR_BR,
    DB_TAR_GZ,
    DB_TAR_ZST,
  ]

  if (!fast) {
    if (useBrotli) files.push(
      EMBED_BIN_BR
    )
  }

  console.log('🚣 Uploading to R2...')
  await Promise.all(
    files.map(async (f) => {
      const key = 'db/' + f.replace(/^\.\//, '')
      await upsertObject({ key, body: await fs.readFile(f) })
    })
  )

  const report = (await Promise.all(
    files.map(async (f) => [
      basename(f),
      await fileSize(f)
    ])
  )).map(([f, s]) => ({
    file: f,
    size: s
  }))

  console.table(report)

  await mojiDb.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})