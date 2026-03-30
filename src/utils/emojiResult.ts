import Emojilib from 'emojilib'

function humanizeKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const emojiNameMap = new Map(
  Object.entries(Emojilib as Record<string, string[]>)
    .map(([emoji, keywords]) => [
      emoji,
      humanizeKeyword(keywords[0] ?? ''),
    ])
    .filter((entry): entry is [string, string] => {
      return entry[0].length > 0 && entry[1].length > 0
    }),
)

export function getEmojiName(
  emoji: string,
): string | null {
  return emojiNameMap.get(emoji) ?? null
}

export function parseEmojiResult(row: string): {
  char: string
  name: string
} {
  const parts = String(row).trim().split(/\s+/)
  const char = parts[0] ?? ''
  const explicitName = parts
    .slice(1)
    .join(' ')
    .trim()

  return {
    char,
    name:
      explicitName ||
      getEmojiName(char) ||
      'emoji',
  }
}
