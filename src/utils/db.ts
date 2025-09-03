// https://pglite.dev/docs/api
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import * as zst from '@bokuweb/zstd-wasm'
import {
  decodeEmbeddingsBinary,
} from './embeddings'
import { emojiIndex } from './emoji'
import { DEFAULT_DIMENSIONS } from '../constants'
import type { EmbeddingRow } from './types'


let dbInstance: PGlite | null = null
// Implement a singleton pattern to make sure we only create one database instance.
export async function getDB( options: {
  loadDataDir?: Blob
} = {}) {
  const { loadDataDir } = options
  if (dbInstance) {
    return dbInstance
  }
  
  try {
    const metaDb = new PGlite({
        loadDataDir,
        extensions: {
          vector,
        },
    })
    await metaDb.waitReady
    dbInstance = metaDb
    return metaDb
  } catch (e) {
    console.error('DB init failed', e)
    throw new Error('DB init failed')
  }
}

/**
 * Load a prebuilt PGlite data dir tar into
 * IndexedDB and return the opened handle.
 * Mirrors how the app DB is created.
 *
 * Accepts either a raw tar Blob/stream or a
 * Brotli-compressed tar (.tar.br). Will try
 * to decompress with DecompressionStream,
 * then fall back to raw body when needed.
 */
export async function loadPrebuiltDb(
  options: { binUrl: string; noCache?: boolean },
) {
  const startTime = performance.now()
  const { binUrl } = options
  const noCache = options.noCache === true
  const isUncompressed = binUrl.endsWith('.bin')
  const isZstd = binUrl.endsWith('.bin.zst')
  const isGzip = binUrl.endsWith('.bin.gz')

  // Close existing handle to avoid name
  // conflicts before we restore data.
  if (dbInstance) {
    throw new Error('DB already loaded, cannot load into existing instance')
  }

  const url = noCache
    ? `${binUrl}${binUrl.includes('?') ? '&' : '?'}no_cache=${Date.now()}`
    : binUrl
  const resp = await fetch(url, {
    cache: noCache ? 'no-store' : 'force-cache',
  })
  if (!resp.ok) {
    throw new Error('failed to fetch db')
  }

  console.log('🔍 Content encoding', resp.headers.get('content-encoding'))

  // Decompress when needed. Support .zst via
  // zstd-wasm; fall back to Brotli stream; and
  // finally to raw blob when already decoded.
  let tarBlob: Blob
  if (isUncompressed) {
    tarBlob = await resp.blob()
  } else if (isZstd) {
    try {
      const buf = await resp.arrayBuffer()
      if (typeof zst.init === 'function') {
        await zst.init()
      }
      const out = await zst.decompress(
        new Uint8Array(buf)
      )
      if (!(out instanceof Uint8Array)) {
        throw new Error('zstd bad output')
      }
      tarBlob = new Blob([out], {
        type: 'application/x-tar'
      })
    } catch {
      // Fallback to raw body (likely useless
      // for restore) to mirror existing style
      tarBlob = await resp.blob()
    }
  } else {
    try {
      const Decomp =
        (self as unknown as {
          DecompressionStream?:
            new (type: string) => any
        }).DecompressionStream
      if (Decomp && resp.body) {
        const ds = new Decomp('br')
        const stream = resp.body
          .pipeThrough(ds)
        tarBlob = await new Response(
          stream
        ).blob()
      } else {
        tarBlob = await resp.blob()
      }
    } catch {
      tarBlob = await resp.blob()
    }
  }

  // Restore into our IDB-backed database
  // and return the ready connection.
  const db = await getDB({
    loadDataDir: tarBlob
  })

  const endTime = performance.now()
  console.log(`🏁 Loaded in ${endTime - startTime}ms`)

  return db
}

/**
 * Seed the DB from a compressed
 * embeddings binary (.bin.br) and
 * a small JSON metadata file.
 *
 * The metadata should be an array of
 * objects with either `content` or `id`.
 */
async function seedDbFromEmbBin(
  db: PGlite,
  options: {
    binUrl: string
    noCache?: boolean
    batchSize?: number
  },
) {
  const { binUrl } = options
  const noCache = options.noCache === true
  const batchSize = options.batchSize ?? 256

  const bustUrl = noCache
    ? `${binUrl}${binUrl.includes('?') ? '&' : '?'}no_cache=${Date.now()}`
    : binUrl
  const binRes = await fetch(bustUrl, {
    cache: noCache ? 'no-store' : 'force-cache',
  })
  if (!binRes.ok) {
    throw new Error('failed to fetch bin')
  }

  // Try Brotli streaming; fall back when
  // body is already decoded by the UA.
  let buf: ArrayBuffer
  try {
    const Decomp = (
      self as unknown as {
        DecompressionStream?:
          new (type: string) => any
      }
    ).DecompressionStream
    if (Decomp && binRes.body) {
      const ds = new Decomp('br')
      const stream = binRes.body.pipeThrough(ds)
      const blob = await new Response(stream).blob()
      buf = await blob.arrayBuffer()
    } else {
      buf = await binRes.arrayBuffer()
    }
  } catch {
    buf = await binRes.arrayBuffer()
  }

  // Build meta from our local emoji index.
  const meta = emojiIndex.map(r => ({
    content: `${r.emoji} ${r.id}`
  }))
  const dec = decodeEmbeddingsBinary(buf, meta)
  const rows = dec.rows ?? []
  if (rows.length === 0) return 0

  // Insert in batches to keep queries small
  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize)
    const values = slice.map((_, j) =>
      `($${j*2+1},$${j*2+2})`
    ).join(',')
    const params: unknown[] = []
    for (const r of slice) {
      params.push(
        r.content,
        JSON.stringify(r.embedding),
      )
    }
    await db.query(
      `insert into embeddings
       (content, embedding)
       values ${values}`,
      params,
    )
  }

  return rows.length
}

export async function loadDBFromEmbedBin(options: { binUrl: string; noCache?: boolean }) {
  const startTime = performance.now()
  const { binUrl } = options
  const noCache = options.noCache === true
  const mojiDb = await getDB()

  console.log('🏁 Initializing schema')
  // Initialize the schema
  await initSchema(mojiDb)

  console.log('🌱 Seeding embeddings')
  // Seed with binary
  await seedDbFromEmbBin(mojiDb, {
    binUrl,
    noCache,
  })

  const endTime = performance.now()
  console.log(`🏁 Initialized in ${endTime - startTime}ms`)

  return mojiDb
}

// Initialize the database schema.
export const initSchema = async (db: PGlite) => {
  return await db.exec(`
    create extension if not exists vector;
    -- drop table if exists embeddings; -- Uncomment this line to reset the database
    create table if not exists embeddings (
      id bigint primary key generated always as identity,
      content text not null,
      embedding vector (384)
    );
    
    create index on embeddings using hnsw (embedding vector_ip_ops);
  `)
}

// Helper method to count the rows in a table.
export const countRows = async (db: PGlite, table: string) => {
  const res = await db.query<{ count: number }>(`SELECT COUNT(*) FROM ${table};`)
  return res.rows[0].count
}

/**
 * Search by embedding vector.
 * @param db Database handle
 * @param embedding 384-length numbers
 * @param match_threshold Cosine sim min
 * @param limit Max rows
 */
export const search = async (
    db: PGlite,
    embedding: number[],
    match_threshold = 0.8,
    limit = 20
) => {
    // Validate input embedding to ensure
    // correct vector dimensionality and type
    if (!Array.isArray(embedding) ||
        embedding.length !== DEFAULT_DIMENSIONS ||
        !embedding.every(n => typeof n === 'number')) {
      throw new TypeError(
        'embedding must be number[] len 384'
      )
    }

    const res = await db.query<EmbeddingRow>(
      `
      select id, identifier, content, embedding
      from (
        select distinct on (identifier)
          id, identifier, content, embedding,
          (embedding <#> $1) as dist
        from embeddings
        where embedding <#> $1 < $2
        order by identifier, dist
      ) d
      order by d.dist
      limit $3;
      `,
      [JSON.stringify(embedding), -Number(match_threshold), Number(limit)]
    )
    return res.rows
}