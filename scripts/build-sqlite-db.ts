/// <reference types="bun-types" />

import fs from 'node:fs/promises'
import path from 'node:path'

import { Database } from 'bun:sqlite'

import { getEncoder } from '../src/utils/hf'
import { buildEmojiSearchDocs } from '../src/utils/emojiSearchDocs'

const OUTPUT_DIR = path.join(
  process.cwd(),
  'public/db',
)
const OUTPUT_FILE = path.join(
  OUTPUT_DIR,
  'emoji-search.sqlite',
)
const BATCH_SIZE = 64

async function encodeTexts(
  encoder: Awaited<ReturnType<typeof getEncoder>>,
  texts: string[],
) {
  const out: Float32Array[] = []

  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    const batch = texts.slice(start, start + BATCH_SIZE)
    const tensor = await encoder(batch, {
      pooling: 'mean',
      normalize: true,
    })
    const dims = tensor.dims as number[]
    const batchSize = dims[0] ?? batch.length
    const width = dims[1] ?? 384
    const data = tensor.data as Float32Array

    for (let index = 0; index < batchSize; index += 1) {
      out.push(
        Float32Array.from(
          data.subarray(index * width, (index + 1) * width),
        ),
      )
    }
  }

  return out
}

async function main() {
  const docs = buildEmojiSearchDocs()
  console.log(`Building sqlite db for ${docs.length} emoji docs`)

  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  await fs.rm(OUTPUT_FILE, { force: true })

  const db = new Database(OUTPUT_FILE)
  db.exec(`
    pragma journal_mode = delete;
    pragma synchronous = normal;
    create table emoji_docs (
      emoji text primary key,
      content text not null,
      embedding blob not null
    );
  `)

  const encoder = await getEncoder()
  const insert = db.query(
    `insert into emoji_docs
      (emoji, content, embedding)
     values (?, ?, ?)`,
  )

  for (let start = 0; start < docs.length; start += BATCH_SIZE) {
    const batch = docs.slice(start, start + BATCH_SIZE)
    const embeddings = await encodeTexts(
      encoder,
      batch.map((doc) => doc.content),
    )

    batch.forEach((doc, index) => {
      const embedding = embeddings[index]!
      const blob = Buffer.from(
        embedding.buffer,
        embedding.byteOffset,
        embedding.byteLength,
      )
      insert.run(doc.emoji, doc.content, blob)
    })

    console.log(
      `Inserted ${Math.min(start + BATCH_SIZE, docs.length)} / ${docs.length}`,
    )
  }

  db.exec('vacuum;')
  db.close()

  const stat = await fs.stat(OUTPUT_FILE)
  console.log(
    `Wrote ${OUTPUT_FILE} (${(
      stat.size / 1024 / 1024
    ).toFixed(2)} MiB)`,
  )
}

await main()
