// https://github.com/muan/emojilib?tab=readme-ov-file
import Emojilib from 'emojilib'

export const emojiIndex = Emojilib

interface EmojiRow {
    /** identifier */
    id: string
    /** emoji glyph */
    emoji: string
    /** short name */
    // name: string
    /** keywords */
    // keywords: string[]
}

/**
 * Build emoji -> keywords map from
 * emojilib (keyword -> emoji list).
 */
export function buildEmojiRows(): EmojiRow[] {
    const map = new Map<string, Set<string>>()
  
    const emojis = Object.entries(emojiIndex)
  
    for (const [kw, list] of emojis) {
      for (const ch of list) {
        if (!map.has(ch)) map.set(ch, new Set())
        map.get(ch)!.add(kw)
      }
    }
    const rows: EmojiRow[] = []
    for (const [ch, set] of map) {
      const keys = Array.from(set).sort()
      const name = keys[0] ?? ch
      const id = ch
      rows.push({
        id,
        emoji: keys[0],
        // name,
        // keywords: keys,
      })
    }
    if (rows.length === 0) {
      throw new Error('no emojis found')
    }
    return rows
}