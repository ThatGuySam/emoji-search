import type { PGlite } from "@electric-sql/pglite";

export interface EmbeddingRow {
    id?: number
    identifier: string
    content: string
    embedding: number[]
}

export interface EmojiRow {
    /** identifier */
    id: string
    /** emoji glyph */
    emoji: string
    /** short name */
    // name: string
    /** keywords */
    // keywords: string[]
}

export interface DBDriver {
    initSchema: () => Promise<void>
    insertEmbeddings: (rows: EmojiRow[]) => Promise<EmbeddingRow[]>
    insertDocuments: (
      docs: { identifier: string; content: string }[]
    ) => Promise<EmbeddingRow[]>
    searchEmbeddings: (text: string, matchThreshold?: number, limit?: number) => Promise<EmbeddingRow[]>
    getDump: () => Promise<File | Blob>

    /* Internal DB API */
    api: PGlite
}

export interface DBDriverOptions {
    driver: DBDriver
}