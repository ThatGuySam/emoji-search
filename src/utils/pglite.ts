import { PGlite, type PGliteOptions } from "@electric-sql/pglite";
import { vector } from '@electric-sql/pglite/vector'

import type { DBDriver } from "./types";
import { DEFAULT_DIMENSIONS } from "../constants";

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
        const metaDb = new PGlite(
            defaultOptions(options)
        )
        await metaDb.waitReady
        return metaDb
    } catch (e) {
        console.error('DB init failed', e)
        throw new Error('DB init failed')
    }
}

let dbInstance: PGlite | null = null

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