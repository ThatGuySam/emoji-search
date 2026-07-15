import emojiKeywords from "emojilib"
import type { EmojiResult } from "./types"

const DEFAULT_LIMIT = 18

const QUICK_PICK_EMOJI = [
  "😂",
  "❤️",
  "👍",
  "🎉",
  "😭",
  "🤔",
  "🥹",
  "🫠",
  "🙏",
  "🔥",
  "✨",
  "👀",
  "💀",
  "✅",
  "😊",
  "🤣",
  "🙌",
  "😅",
] as const

interface IndexedEmoji extends EmojiResult {
  normalizedLabel: string
  normalizedKeywords: readonly string[]
  sourceOrder: number
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/[^\p{Letter}\p{Number}+\s]/gu, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
}

function humanize(keyword: string): string {
  return keyword.replaceAll(/[_-]+/g, " ").replaceAll(/\s+/g, " ").trim()
}

const emojiIndex: readonly IndexedEmoji[] = Object.entries(emojiKeywords).map(
  ([emoji, keywords], sourceOrder) => {
    const label = humanize(keywords[0] ?? "emoji")
    return {
      emoji,
      label,
      keywords,
      normalizedLabel: normalize(label),
      normalizedKeywords: keywords.map(normalize),
      sourceOrder,
    }
  },
)

const emojiByGlyph = new Map(emojiIndex.map((entry) => [entry.emoji, entry]))

export function getQuickPicks(limit = DEFAULT_LIMIT): EmojiResult[] {
  return QUICK_PICK_EMOJI.flatMap((emoji) => {
    const match = emojiByGlyph.get(emoji)
    return match ? [match] : []
  }).slice(0, limit)
}

function scoreTerm(term: string, entry: IndexedEmoji): number | undefined {
  if (entry.normalizedLabel === term) return 0
  if (entry.normalizedLabel.startsWith(term)) return 4

  const exactKeywordIndex = entry.normalizedKeywords.indexOf(term)
  if (exactKeywordIndex >= 0) return 8 + exactKeywordIndex

  const prefixKeywordIndex = entry.normalizedKeywords.findIndex((keyword) =>
    keyword.startsWith(term),
  )
  if (prefixKeywordIndex >= 0) return 18 + prefixKeywordIndex

  if (entry.normalizedLabel.includes(term)) return 34

  const containsKeywordIndex = entry.normalizedKeywords.findIndex((keyword) =>
    keyword.includes(term),
  )
  if (containsKeywordIndex >= 0) return 42 + containsKeywordIndex

  return undefined
}

export function searchEmoji(query: string, limit = DEFAULT_LIMIT): EmojiResult[] {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return getQuickPicks(limit)

  const terms = normalizedQuery.split(" ")
  const matches: Array<{ entry: IndexedEmoji; score: number }> = []

  for (const entry of emojiIndex) {
    let score = 0
    let isMatch = true

    for (const term of terms) {
      const termScore = scoreTerm(term, entry)
      if (termScore === undefined) {
        isMatch = false
        break
      }
      score += termScore
    }

    if (!isMatch) continue
    if (entry.normalizedLabel === normalizedQuery) score -= 20
    if (entry.normalizedLabel.startsWith(normalizedQuery)) score -= 8

    matches.push({ entry, score })
  }

  return matches
    .sort((left, right) => {
      return left.score - right.score || left.entry.sourceOrder - right.entry.sourceOrder
    })
    .slice(0, limit)
    .map(({ entry }) => entry)
}
