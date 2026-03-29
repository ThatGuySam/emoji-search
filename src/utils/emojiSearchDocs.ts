import Emojilib from 'emojilib'

export type EmojiSearchDoc = {
  emoji: string
  content: string
  keywords: string[]
  tokens: string[]
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function humanizeKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text: string): string[] {
  return humanizeKeyword(text)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

/**
 * Mirrors the best-performing experiment corpus:
 * humanized phrases + deduped split tokens.
 */
export function buildEmojiSearchDocs(): EmojiSearchDoc[] {
  return Object.entries(Emojilib as Record<string, string[]>)
    .map(([emoji, keywords]) => {
      const humanized = unique(
        keywords
          .map(humanizeKeyword)
          .filter(Boolean),
      )
      const tokens = unique(humanized.flatMap(tokenize))
      const content = unique([
        ...humanized,
        ...tokens,
      ]).join(', ')

      return {
        emoji,
        content,
        keywords: humanized,
        tokens,
      }
    })
}
