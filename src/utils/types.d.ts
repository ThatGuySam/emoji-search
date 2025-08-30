import type { PGlite } from "@electric-sql/pglite";

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

export interface DBDriver extends PGlite {}

export interface DBDriverOptions {
    driver: DBDriver
}