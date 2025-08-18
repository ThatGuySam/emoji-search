/**
 * Encode emojis into embeddings and insert
 * into a local PGlite database.
 *
 * Run (pick one):
 * - bun run scripts/encode-emoji.ts
 * - npx tsx scripts/encode-emoji.ts
 * - node --loader tsx scripts/encode-emoji.ts
 *
 * Notes:
 * - Uses the same model as the app:
 *   supabase/gte-small. Vectors are mean-
 *   pooled and L2-normalized (384 dims).
 * - Writes a file db at ./emoji.db
 */

import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { env, pipeline } from '@huggingface/transformers'

import Emojilib from 'emojilib'
import {
  MODELS_HOST,
  MODELS_PATH_TEMPLATE,
  SUPA_GTE_SMALL,
} from '../src/constants'

/** Build emoji → keywords index from emojilib. */
function buildEmojiIndex() {
  const emojiToKeys = new Map<string, Set<string>>()
  for (const [keyword, emojiList] of
       Object.entries(Emojilib)) {
    for (const emojiChar of emojiList) {
      if (!emojiToKeys.has(emojiChar)) {
        emojiToKeys.set(emojiChar, new Set())
      }
      emojiToKeys.get(emojiChar)!.add(keyword)
    }
  }
  return new Map(
    Array.from(emojiToKeys.entries())
         .map(([e, set]) => [e, Array.from(set)])
  )
}

/** Ensure a 384-length float vector. */
function assertEmbedding(vec: number[]) {
  if (!Array.isArray(vec) || vec.length !== 384) {
    throw new Error('embedding must be len 384')
  }
  if (!vec.every(n => Number.isFinite(n))) {
    throw new Error('embedding contains non-finite')
  }
}

/** Create the embeddings table and index. */
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

/** Create the feature-extraction pipeline. */
async function getEncoder() {
  env.allowRemoteModels = true
  env.remoteHost = MODELS_HOST
  env.remotePathTemplate = MODELS_PATH_TEMPLATE

  const pipe = await pipeline(
    'feature-extraction',
    SUPA_GTE_SMALL,
    { dtype: 'fp32', device: 'cpu' }
  )
  return pipe
}

/** Encode text to a normalized 384-dim vector. */
async function encodeText(
  text: string,
  encoder: Awaited<ReturnType<typeof getEncoder>>,
) {
  const out = await encoder(text, {
    pooling: 'mean',
    normalize: true,
  })
  // array (.data) at runtime; we cast here
  const arr = Array.from(out.data as Float32Array)
  assertEmbedding(arr)
  return arr
}

/** Insert one row. */
async function insertRow(
  db: PGlite,
  content: string,
  embedding: number[],
) {
  await db.query(
    `
    insert into embeddings (content, embedding)
    values ($1, $2);
    `,
    [content, JSON.stringify(embedding)],
  )
}

async function main() {
  // 1) DB (file-backed so it works in Node)
  const db = new PGlite('file:emoji.db', {
    extensions: { vector },
  })
  await db.waitReady
  await initSchema(db)

  // 2) Model
  const encoder = await getEncoder()

  // 3) Build emoji → keywords
  const index = buildEmojiIndex()

  // Optional limit to speed first run
  const limit =
    Number(process.env.LIMIT ?? '150')

  let count = 0
  for (const [emojiChar, keys] of index) {
    if (count >= limit) break
    const keywords = keys.slice(0, 10)
    const content =
      `${emojiChar} ${keywords.join(' ')}`

    const vec = await encodeText(
      content, encoder
    )
    await insertRow(db, content, vec)
    count += 1
    if (count % 25 === 0) {
      console.log(`inserted ${count}`)
    }
  }

  console.log(`done. inserted ${count}`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})