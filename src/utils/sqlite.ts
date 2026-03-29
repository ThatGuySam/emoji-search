import initSqlJs from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

import { DEFAULT_DIMENSIONS } from '../constants'

type SqlJsModule = Awaited<
  ReturnType<typeof initSqlJs>
>

export type SqliteSearchRow = {
  identifier: string
  content: string
  embedding: Float32Array
}

export type SqliteSearchDb = {
  rows: SqliteSearchRow[]
}

let sqlModulePromise: Promise<SqlJsModule> | null = null
let sqliteDbPromise:
  | Promise<SqliteSearchDb>
  | null = null

async function getSqlModule() {
  if (!sqlModulePromise) {
    sqlModulePromise = initSqlJs({
      locateFile: () => sqlWasmUrl,
    })
  }

  return sqlModulePromise
}

function decodeEmbeddingBlob(
  value: unknown,
): Float32Array {
  const bytes =
    value instanceof Uint8Array
      ? value
      : Uint8Array.from(value as ArrayLike<number>)

  if (bytes.byteLength !== DEFAULT_DIMENSIONS * 4) {
    throw new Error(
      `bad sqlite embedding blob size: ${bytes.byteLength}`,
    )
  }

  return new Float32Array(bytes.slice().buffer)
}

function dotProduct(
  left: number[],
  right: Float32Array,
): number {
  let value = 0
  for (let i = 0; i < right.length; i += 1) {
    value += (left[i] ?? 0) * (right[i] ?? 0)
  }
  return value
}

function insertRanked(
  ranked: Array<{
    row: SqliteSearchRow
    score: number
  }>,
  candidate: {
    row: SqliteSearchRow
    score: number
  },
  limit: number,
) {
  if (
    ranked.length === limit &&
    candidate.score <= ranked[ranked.length - 1]!.score
  ) {
    return
  }

  let index = 0
  while (
    index < ranked.length &&
    ranked[index]!.score >= candidate.score
  ) {
    index += 1
  }

  ranked.splice(index, 0, candidate)
  if (ranked.length > limit) {
    ranked.length = limit
  }
}

export async function loadSqliteDb(options: {
  dbUrl: string
  noCache?: boolean
}): Promise<SqliteSearchDb> {
  const noCache = options.noCache === true

  if (sqliteDbPromise && !noCache) {
    return sqliteDbPromise
  }

  sqliteDbPromise = (async () => {
    const SQL = await getSqlModule()
    const url = noCache
      ? `${options.dbUrl}${
          options.dbUrl.includes('?') ? '&' : '?'
        }no_cache=${Date.now()}`
      : options.dbUrl
    const response = await fetch(url, {
      cache: noCache ? 'no-store' : 'force-cache',
    })

    if (!response.ok) {
      throw new Error(
        `failed to fetch sqlite db: ${response.status}`,
      )
    }

    const buffer = await response.arrayBuffer()
    const db = new SQL.Database(
      new Uint8Array(buffer),
    )
    const statement = db.prepare(
      `select emoji, content, embedding
       from emoji_docs`,
    )
    const rows: SqliteSearchRow[] = []

    while (statement.step()) {
      const [identifier, content, embedding] =
        statement.get() as [
          string,
          string,
          Uint8Array,
        ]
      rows.push({
        identifier,
        content,
        embedding: decodeEmbeddingBlob(embedding),
      })
    }

    statement.free()

    return { rows }
  })()

  return sqliteDbPromise
}

export function searchSqliteRows(
  rows: SqliteSearchRow[],
  embedding: number[],
  matchThreshold = 0.8,
  limit = 20,
) {
  const ranked: Array<{
    row: SqliteSearchRow
    score: number
  }> = []

  for (const row of rows) {
    const score = dotProduct(
      embedding,
      row.embedding,
    )

    if (score < matchThreshold) {
      continue
    }

    insertRanked(
      ranked,
      { row, score },
      limit,
    )
  }

  return ranked.map(({ row }) => ({
    identifier: row.identifier,
    content: row.content,
  }))
}

export function searchSqlite(
  db: SqliteSearchDb,
  embedding: number[],
  matchThreshold = 0.8,
  limit = 20,
) {
  return searchSqliteRows(
    db.rows,
    embedding,
    matchThreshold,
    limit,
  )
}
