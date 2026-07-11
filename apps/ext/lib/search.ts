import emojilib from 'emojilib'

export type EmojiSearchResult = {
  emoji: string
  name: string
  keywords: string[]
  score: number
}

const MAX_RESULTS = 8

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('en-US')
    .replaceAll('_', ' ')
    .replace(/[^\p{L}\p{N}\s:+-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreKeywords(query: string, keywords: string[]): number {
  const tokens = query.split(' ').filter(Boolean)
  let score = 0

  for (const keyword of keywords) {
    if (keyword === query) score = Math.max(score, 100)
    else if (keyword.startsWith(query)) score = Math.max(score, 70)
    else if (keyword.includes(query)) score = Math.max(score, 50)

    const matchingTokens = tokens.filter((token) => keyword.includes(token))
    score += matchingTokens.length * 8
  }

  return score
}

export function searchEmoji(input: string, limit = MAX_RESULTS): EmojiSearchResult[] {
  const query = normalize(input)
  if (!query) return []

  return Object.entries(emojilib)
    .map(([emoji, rawKeywords]) => {
      const keywords = rawKeywords.map(normalize).filter(Boolean)
      return {
        emoji,
        name: keywords[0] ?? 'emoji',
        keywords: [...new Set(keywords.slice(1, 5))],
        score: scoreKeywords(query, keywords),
      }
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, limit)
}
