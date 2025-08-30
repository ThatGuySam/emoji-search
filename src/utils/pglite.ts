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
      const embeds = await Promise.all(
        slice.map(r => {
          const content = `${r.emoji} ${r.id}`
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
        return {
            initSchema: () => initSchema(api),
            insertEmbeddings: (rows: EmojiRow[]) => insertEmbeddings(api, rows),
            searchEmbeddings: (
                text: string, 
                matchThreshold?: number, 
                limit?: number
            ) => searchEmbeddings(api, text, matchThreshold, limit),
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