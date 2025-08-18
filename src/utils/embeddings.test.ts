import { describe, it, expect } from 'vitest'
import {
  packEmbeddingsBinary,
  decodeEmbeddingsBinary,
  type EmbeddingRow,
} from './embeddings'
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'

function l2norm(v: number[]) {
  let s = 0
  for (const x of v) s += x * x
  return Math.sqrt(s)
}

function normalize(r: EmbeddingRow): EmbeddingRow {
  const n = l2norm(r.embedding) || 1
  return {
    content: r.content,
    embedding: r.embedding.map(x => x / n)
  }
}

function cosine(a: number[], b: number[]) {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    const y = b[i]
    dot += x * y
    na += x * x
    nb += y * y
  }
  const d = (Math.sqrt(na) || 1) *
            (Math.sqrt(nb) || 1)
  return dot / d
}

describe('embeddings binary pack/dec', () => {
  it('loads into pglite and verifies', async () => {
    const raw: EmbeddingRow[] = [
      { content: '😀 grinning',
        embedding: [-0.006822244, -0.0073390524, 0.040399525, 0.000736064] },
      { content: '🚀 rocket',
        embedding: [-0.013675096, 0.027324528, 0.06942244, 0.0013266953] },
    ]
    const rows = raw.map(normalize)

    const buf = packEmbeddingsBinary(rows)
    const meta = rows.map(r => ({
      content: r.content
    }))
    const dec = decodeEmbeddingsBinary(buf, meta)

    expect(dec.n).toBe(2)
    expect(dec.dim).toBe(4)

    // Verify cosine similarity tolerance
    for (const [i, r] of rows.entries()) {
      const want = r.embedding
      const got = dec.rows?.[i].embedding || []
      expect(cosine(want, got)).toBeGreaterThan(
        0.98
      )
    }

    // Load originals into a small pglite db
    const db = new PGlite({
      extensions: { vector }
    })
    await db.exec(`
      create extension if not exists vector;
      create table if not exists emb4 (
        id bigint primary key generated
          always as identity,
        content text not null,
        embedding vector(4)
      );
    `)

    for (const r of rows) {
      await db.query(
        `insert into emb4 (content, embedding)
         values ($1, $2)`,
        [r.content, JSON.stringify(r.embedding)]
      )
    }

    // Query with decoded vectors and expect
    // top-1 is the matching original row
    for (const r of dec.rows!) {
      const res = await db.query<{content: string}>(
        `select content from emb4
         order by embedding <#> $1
         limit 1`,
        [JSON.stringify(r.embedding)]
      )
      expect(res.rows[0].content)
        .toBe(r.content)
    }
  })
})


