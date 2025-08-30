/**
 * We don't import any PGLite or SQLite code here 
 * so that we're not loading extra wasm binaries 
 * that we don't use.
 */
import type { DBDriverOptions, EmojiRow } from "./types"

interface StoreDocsOptions extends DBDriverOptions {
    queries: EmojiRow[]
}

export async function storeDocs(options: StoreDocsOptions) {
    const { driver } = options

    return await driver.insertEmbeddings(options.queries)
}

interface StoreDocsFromEmojiIndexOptions extends DBDriverOptions {
    emojiIndex: EmojiRow[]
}

export async function storeDocsFromEmojiIndex(options: StoreDocsFromEmojiIndexOptions) {
    const { emojiIndex } = options

    const queries: EmojiRow[] = emojiIndex.map(row => ({
        id: row.id,
        emoji: row.emoji,
    }))

    return await storeDocs({
        queries,
        ...options
    })
}

interface SearchOptions extends DBDriverOptions {
    term: string
}

export function search({ term, driver }: SearchOptions) {
  return [
    {
      emoji: '📣',
      rank: 1
    }
  ]
}