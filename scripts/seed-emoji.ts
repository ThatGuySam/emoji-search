/**
 * Build an emoji FTS DB and ship artifacts.
 *
 * Run:
 *   $ bun scripts/seed-emoji.ts
 *   # or: npx tsx scripts/seed-emoji.ts
 *
 * Outputs:
 *   dist/emojis.compact.json
 *   dist/emojis.compact.json.br
 *   dist/emoji.tar
 *   dist/emoji.tar.br
 */

import { promises as fs } from 'node:fs'
import {
  brotliCompressSync,
  constants as z,
} from 'node:zlib'
import { basename } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
// https://github.com/muan/emojilib?tab=readme-ov-file
import Emojilib from 'emojilib'

/**
 * Row stored in JSON and DB.
 */
type Row = {
  id: string
  emoji: string
  name: string
  keywords: string[]
  category?: string | null
}

const OUT_DIR = './dist'
const OUT_JSON = `${OUT_DIR}/emojis.compact.json`
const OUT_JSON_BR = `${OUT_JSON}.br`
const OUT_DB_TAR = `${OUT_DIR}/emoji.tar`
const OUT_DB_TAR_BR = `${OUT_DB_TAR}.br`

/**
 * Brotli at max quality for static assets.
 */
function brotli(
  data: Buffer | Uint8Array,
) {
  return brotliCompressSync(data, {
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
  for (const [kw, list] of
       Object.entries(Emojilib)) {
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
      emoji: ch,
      name,
      keywords: keys,
      category: null,
    })
  }
  if (rows.length === 0) {
    throw new Error('no emojis found')
  }
  return rows
}

/**
 * Create table and FTS index.
 */
async function initSchema(db: PGlite) {
  await db.exec(`
    create table if not exists emoji (
      id text primary key,
      emoji text not null,
      name text not null,
      keywords text[] not null,
      category text,
      tsv tsvector
    );
    create index if not exists emoji_tsv_gin
    on emoji using gin (tsv);
  `)
}

/**
 * Bulk insert rows in batches.
 */
async function insertAll(
  db: PGlite,
  rows: Row[],
) {
  const batch = 500
  await db.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i +=
         batch) {
      const slice = rows.slice(i, i + batch)
      const vals = slice.map((_, j) =>
        `($${j*5+1},$${j*5+2},$${j*5+3},` +
        `$${j*5+4}::text[],$${j*5+5})`
      ).join(',')
      const params: unknown[] = []
      for (const r of slice) {
        params.push(
          r.id, r.emoji, r.name, r.keywords,
          r.category ?? null
        )
      }
      const valuesSql = slice.map((_, j) => {
        const b = j * 5
        return `($${b+1},$${b+2},$${b+3},` +
          `$${b+4}::text[],$${b+5},` +
          `setweight(to_tsvector('simple',` +
          `coalesce($${b+3},'')),'A')||` +
          `setweight(to_tsvector('simple',` +
          `array_to_string($${b+4},' ')),'B')||` +
          `setweight(to_tsvector('simple',` +
          `coalesce($${b+5},'')),'C'))`
      }).join(',')

      await tx.query(
        `insert into emoji
         (id,emoji,name,keywords,category,tsv)
         values ${valuesSql}
         on conflict (id) do update set
           emoji=excluded.emoji,
           name=excluded.name,
           keywords=excluded.keywords,
           category=excluded.category,
           tsv =
             setweight(to_tsvector('simple',
               coalesce(excluded.name,'')),'A') ||
             setweight(to_tsvector('simple',
               array_to_string(excluded.keywords,' ')
             ),'B') ||
             setweight(to_tsvector('simple',
               coalesce(excluded.category,'')),'C')
        `,
        params
      )
    }
  })
}

/**
 * Main build: JSON, DB, tar, Brotli.
 */
async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  const rows = buildEmojiRows()

  // Compact JSON (short keys)
  const compact = rows.map(r => ({
    id: r.id,
    e: r.emoji,
    n: r.name,
    k: r.keywords,
    c: r.category ?? null,
  }))

  await fs.writeFile(
    OUT_JSON,
    JSON.stringify(compact)
  )
  await fs.writeFile(
    OUT_JSON_BR,
    brotli(Buffer.from(
      JSON.stringify(compact)))
  )

  const db = new PGlite()
  await db.waitReady
  await initSchema(db)
  await insertAll(db, rows)

  const tarBlob = await db.dumpDataDir('none')
  const tarBuf = Buffer.from(
    await tarBlob.arrayBuffer()
  )
  await fs.writeFile(OUT_DB_TAR, tarBuf)
  await fs.writeFile(
    OUT_DB_TAR_BR,
    brotli(tarBuf)
  )

  const report = [
    [basename(OUT_JSON),
      await fileSize(OUT_JSON)],
    [basename(OUT_JSON_BR),
      await fileSize(OUT_JSON_BR)],
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