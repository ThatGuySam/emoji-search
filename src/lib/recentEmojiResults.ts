import { parseEmojiResult } from '../utils/emojiResult'

import type { RecentEmoji } from './recentEmojis'

export const RECENT_EMOJI_STRONG_MATCH_LIMIT = 3

/**
 * Promote recently used emojis only when the current semantic
 * search already ranks them among its strongest results.
 */
export function mergeRecentEmojiResults(
  results: readonly string[],
  recentEmojis: readonly RecentEmoji[],
  strongMatchLimit = RECENT_EMOJI_STRONG_MATCH_LIMIT,
): string[] {
  if (results.length === 0 || recentEmojis.length === 0) {
    return [...results]
  }

  const normalizedLimit = Number.isFinite(strongMatchLimit)
    ? Math.max(0, Math.floor(strongMatchLimit))
    : RECENT_EMOJI_STRONG_MATCH_LIMIT
  const strongResultsByEmoji = new Map<string, string>()

  for (const result of results.slice(0, normalizedLimit)) {
    const { char } = parseEmojiResult(result)

    if (char && !strongResultsByEmoji.has(char)) {
      strongResultsByEmoji.set(char, result)
    }
  }

  const promotedResults: string[] = []
  const promotedEmojis = new Set<string>()

  for (const emoji of recentEmojis) {
    const result = strongResultsByEmoji.get(emoji.char)

    if (!result || promotedEmojis.has(emoji.char)) {
      continue
    }

    promotedResults.push(result)
    promotedEmojis.add(emoji.char)
  }

  if (promotedResults.length === 0) {
    return [...results]
  }

  return [
    ...promotedResults,
    ...results.filter((result) => (
      !promotedEmojis.has(parseEmojiResult(result).char)
    )),
  ]
}
