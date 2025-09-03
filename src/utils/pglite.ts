// https://pglite.dev/docs/api
import { PGlite, type PGliteOptions } from "@electric-sql/pglite";
import { vector } from '@electric-sql/pglite/vector'

import type { DBDriver, EmbeddingRow, EmojiRow } from "./types";
import { DEFAULT_DIMENSIONS } from "../constants";
import { encodeContent, getEncoder } from "./hf";

/**
 * Create embeddings schema.
 */
export async function initSchema(db: PGlite) {
    await db.exec(`
      create extension if not exists vector;
      create table if not exists embeddings (
        id bigint primary key
          generated always as identity,
        -- Keep the raw emoji glyph/id
        -- separate from the vectorized
        -- content for display/use later.
        identifier text,
        content text not null,
        embedding vector(${DEFAULT_DIMENSIONS})
      );
      create index if not exists
        embeddings_hnsw_ip
      on embeddings
        using hnsw (embedding vector_ip_ops);
    `)
}

/**
 * Insert embeddings in batches.
 */
export async function insertEmbeddings(
    db: PGlite,
    rows: EmojiRow[],
  ) {
    const all: EmbeddingRow[] = []
    const enc = await getEncoder()
    const batch = 64
    for (let i = 0; i < rows.length; i +=
         batch) {
      const slice = rows.slice(i, i + batch)
      const embeds: EmbeddingRow[] = await Promise.all(
        slice.map((row: EmojiRow) => {
          const content = `${row.emoji} ${row.id}`
          return encodeContent(
            content, enc
          ).then(e => ({
            identifier: row.emoji,
            content,
            embedding: e,
          }))
        })
      )
      await db.transaction(async (tx) => {
        const vals = embeds.map((_, j) =>
          `($${j*3+1},$${j*3+2},$${j*3+3})`
        ).join(',')
        const params: unknown[] = []
        for (let k = 0; k < embeds.length; k++) {
          const e = embeds[k]
          const r = slice[k]
          params.push(
            r.id,
            e.content,
            JSON.stringify(e.embedding)
          )
        }
        await tx.query(
          `insert into embeddings
           (identifier, content, embedding)
           values ${vals}`,
          params
        )
      })
      all.push(...embeds)
    }
    return all
}

/**
 * Insert prebuilt documents where we
 * already have identifier and content.
 */
export async function insertDocuments(
  db: PGlite,
  docs: { identifier: string; content: string }[],
) {
  const all: EmbeddingRow[] = []
  const enc = await getEncoder()
  const batch = 64
  for (let i = 0; i < docs.length; i += batch) {
    const slice = docs.slice(i, i + batch)
    const embeds: EmbeddingRow[] = await Promise.all(
      slice.map(async (d): Promise<EmbeddingRow> => {
        const embedding = await encodeContent(
          d.content, enc
        )
        return {
          identifier: d.identifier,
          content: d.content,
          embedding,
        }
      })
    )
    await db.transaction(async (tx) => {
      const vals = embeds.map((_, j) =>
        `($${j*3+1},$${j*3+2},$${j*3+3})`
      ).join(',')
      const params: unknown[] = []
      for (let k = 0; k < embeds.length; k++) {
        const e = embeds[k]
        const d = slice[k]
        params.push(
          d.identifier,
          e.content,
          JSON.stringify(e.embedding)
        )
      }
      await tx.query(
        `insert into embeddings
         (identifier, content, embedding)
         values ${vals}`,
        params
      )
    })
    all.push(...embeds)
  }
  return all
}

/**
 * Search by embedding vector (cosine/IP),
 * mirroring src/utils/db.ts logic.
 */
export async function searchEmbeddings(
    db: PGlite,
    text: string,
    matchThreshold = 0.8,
    limit = 5,
  ) {
    const enc = await getEncoder()
    const embedding = await encodeContent(text, enc)

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
      [
        JSON.stringify(embedding),
        -Number(matchThreshold),
        Number(limit),
      ]
    )

    return res.rows
}

async function getDump (db: PGlite) {
    return await db.dumpDataDir('none')
}

function defaultOptions({ loadDataDir }: PGliteOptions = {}): PGliteOptions {
    return {
        loadDataDir,
        extensions: {
          vector,
        },
    }
}

/**
 * Initialize a new PGLite driver.
 * @param options 
 * @returns 
 */
export async function initPGLiteDriver (options: PGliteOptions = {}): Promise<DBDriver> {
    try {
        const api = new PGlite(
            defaultOptions(options)
        )
        await api.waitReady
        
        // Initialize schema
        await initSchema(api)

        return {
            initSchema: () => initSchema(api),
            insertEmbeddings: (rows: EmojiRow[]) => insertEmbeddings(api, rows),
            insertDocuments: (docs: { identifier: string; content: string }[]) => insertDocuments(api, docs),
            searchEmbeddings: (
                text: string, 
                matchThreshold?: number, 
                limit?: number
            ) => searchEmbeddings(api, text, matchThreshold, limit),
            getDump: () => getDump(api),
            api
        }
    } catch (e) {
        console.error('DB init failed', e)
        throw new Error('DB init failed')
    }
}

let dbInstance: DBDriver | null = null

/**
 * Ensure a PGLite driver is initialized and return it.
 * @param options 
 * @returns 
 */
export async function ensurePGLiteDriver(options: PGliteOptions = {}): Promise<DBDriver> {
    if (dbInstance) {
        return dbInstance
    }

    const pgDriver = await initPGLiteDriver(options)

    dbInstance = pgDriver
    return pgDriver
}

// Implement a singleton pattern to make sure we only create one database instance.
export async function getDB( options: {
  loadDataDir?: PGliteOptions["loadDataDir"]
} = {}) {
  const { loadDataDir } = options
  if (dbInstance) {
    return dbInstance
  }

  return await initPGLiteDriver({ loadDataDir })
}