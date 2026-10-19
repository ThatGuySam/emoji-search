/// <reference types="bun-types" />

import { Database } from 'bun:sqlite'

import { getEncoder } from '../src/utils/hf'
import { promotedSearches } from '../src/data/promotedSearches'
import { searchSqliteRows } from '../src/utils/sqlite'

const DB_FILE = process.env.DB_FILE ?? 'public/db/emoji-search.sqlite'
const TOP_N = 3

const ACCEPTABLE: Record<(typeof promotedSearches)[number], string[]> = {
  'shout': ['🗣️', '📢', '📣'],
  'attach': ['📎', '🖇️', '🔗'],
  'copy': ['📋', '📄', '📑', '©️'],
  'celebrate': ['🎉', '🥳', '🎊', '🍾'],
  'secure': ['🔒', '🔐', '🛡️'],
  'awkward silence': ['😶', '😬', '🦗'],
}
const PROMOTED_QUERIES = promotedSearches.map((query) => [query, ACCEPTABLE[query]] as const)

const db = new Database(DB_FILE, { readonly: true })
const rows = db.query('select emoji, content, embedding from emoji_docs').all() as Array<{
  emoji: string
  content: string
  embedding: Uint8Array
}>
const searchRows = rows.map((row) => ({
  identifier: row.emoji,
  content: row.content,
  embedding: Array.from(new Float32Array(
    row.embedding.buffer,
    row.embedding.byteOffset,
    row.embedding.byteLength / 4,
  )),
}))

const encoder = await getEncoder()
let failures = 0
for (const [query, acceptable] of PROMOTED_QUERIES) {
  const tensor = await encoder([query], { pooling: 'mean', normalize: true })
  const results = searchRows.length
    ? searchSqliteRows(searchRows as never, Array.from(tensor.data as Float32Array))
    : []
  const top = results.slice(0, 10).map((r) => r.identifier)
  const hit = top.slice(0, TOP_N).some((emoji) => acceptable.includes(emoji))
  if (!hit) failures += 1
  console.log(`${hit ? '✅' : '❌'} ${query.padEnd(16)} top: ${top.join(' ')}`)
}
console.log(`${failures ? '❌' : '✅'} ${PROMOTED_QUERIES.length - failures}/${PROMOTED_QUERIES.length} promoted queries have an acceptable emoji in the top ${TOP_N}  (${DB_FILE})`)
process.exitCode = failures ? 1 : 0
