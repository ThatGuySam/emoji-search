/**
 * Build an embeddings DB and ship.
 *
 * Run:
 *   $ bun scripts/seed-emoji.ts
 *   $ bun scripts/seed-emoji.ts --fast
 *   $ bun scripts/seed-emoji.ts --with-upload
 *
 * Outputs:
 *   dist/emoji.tar
 *   dist/emoji.tar.br
 */

import fs from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { argv } from 'node:process'
import zst from '@bokuweb/zstd-wasm';

import {
  DB_TAR,
  DB_TAR_ZST,
  OUT_DIR,
} from
  '../src/constants'
import { packEmbeddingsBinary } from '../src/utils/embeddings'
import { emojiIndex } from '../src/utils/emoji'
import { upsertObject } from '../src/utils/r2.node'
import { initPGLiteDriver } from '../src/utils/pglite'
import assert from 'node:assert';

/**
 * Flags
 *  --fast: limit rows for quicker runs
 *  --with-upload: push artifacts to R2
 */
const argumentList = argv.slice(2)
const argumentSet = new Set(argumentList)
const withUpload = argumentSet.has('--with-upload')
const fast = argumentSet.has('--fast')

const FAST_LIMIT = 50
const useBrotli: boolean = false

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
  const mojiDb = await initPGLiteDriver()

  console.log('🚣 Inserting embeddings...')
  const embeds = await mojiDb.insertEmbeddings(
    rows
  )

  console.log('🚣 Dumping DB to memory...')
  const tarBlob = await mojiDb.getDump()
  const tarBuf = Buffer.from(
    await tarBlob.arrayBuffer()
  )

  // File size reporting moved after write
  // Write embeddings JSON for debugging
  // and inspection alongside the DB.
  const EMBED_JSON =
    `${OUT_DIR}/embeddings.json`
  const embedsStr = JSON.stringify(embeds)
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


  // Demo query: encode text exactly like
  // the browser worker and run a vector
  // search using inner product.
  const queryText = 'shout'
  const top = await mojiDb.searchEmbeddings(
    queryText,
    0.8,
    10
  )
  console.log(
    'Top matches:',
    top.map((row: { content: string }) =>
      row.content
    )
  )

  assert(top.some(row => row.content.includes('🗣️')), '🗣️ should be in the top matches')

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

  console.log('🚣 Writing DB files...')
  await Promise.all([
    // Write uncompressed DB
    fs.writeFile(DB_TAR, tarBuf).then(
      () => console.log('🚣 Uncompressed DB written')
    ),
    // Compress DB (Zstd)
    writeZstd(),
    // Compress Embeddings BIN variants
    writeEmbedZstd(),
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
    DB_TAR_ZST,
  ]

  if (withUpload) {
    console.log('🚣 Uploading to R2...')
    await Promise.all(
      files.map(async (f) => {
        const key = 'db/' + f.replace(/^\.\//, '')
        await upsertObject({
          key,
          body: await fs.readFile(f)
        })
      })
    )
  } else {
    console.log(
      '🚣 Skipping upload. Use --with-upload.'
    )
  }

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

  await mojiDb.api.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})