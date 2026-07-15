export const RECENT_EMOJIS_STORAGE_KEY =
  'fetchmoji:recent-emojis:v1'

export const RECENT_EMOJIS_LIMIT = 12

export type RecentEmoji = {
  char: string
  name: string
}

export type RecentEmojiStorage = Pick<
  Storage,
  'getItem' | 'setItem'
>

function isRecentEmoji(value: unknown): value is RecentEmoji {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<RecentEmoji>

  return (
    typeof candidate.char === 'string' &&
    candidate.char.length > 0 &&
    typeof candidate.name === 'string' &&
    candidate.name.length > 0
  )
}

function normalizeLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return RECENT_EMOJIS_LIMIT
  }

  return Math.max(0, Math.floor(limit))
}

function normalizeRecentEmojis(
  values: readonly unknown[],
  limit: number,
): RecentEmoji[] {
  const normalizedLimit = normalizeLimit(limit)
  if (normalizedLimit === 0) {
    return []
  }

  const normalized: RecentEmoji[] = []
  const seen = new Set<string>()

  for (const value of values) {
    if (!isRecentEmoji(value) || seen.has(value.char)) {
      continue
    }

    normalized.push({
      char: value.char,
      name: value.name,
    })
    seen.add(value.char)

    if (normalized.length >= normalizedLimit) {
      break
    }
  }

  return normalized
}

/**
 * Return localStorage when it is available without
 * assuming this module is running in a browser.
 */
export function getBrowserStorage(): RecentEmojiStorage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Read and validate the newest-first recent emoji list.
 */
export function loadRecentEmojis(
  storage: RecentEmojiStorage | null = getBrowserStorage(),
  limit = RECENT_EMOJIS_LIMIT,
): RecentEmoji[] {
  if (!storage) {
    return []
  }

  try {
    const raw = storage.getItem(RECENT_EMOJIS_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return normalizeRecentEmojis(parsed, limit)
  } catch {
    return []
  }
}

/**
 * Purely add an emoji to the front of a newest-first list.
 */
export function addRecentEmoji(
  recentEmojis: readonly RecentEmoji[],
  emoji: RecentEmoji,
  limit = RECENT_EMOJIS_LIMIT,
): RecentEmoji[] {
  return normalizeRecentEmojis(
    [emoji, ...recentEmojis.filter((item) => (
      item.char !== emoji.char
    ))],
    limit,
  )
}

/**
 * Persist a validated list. The returned state remains
 * usable when browser storage is missing or rejects writes.
 */
export function saveRecentEmojis(
  recentEmojis: readonly RecentEmoji[],
  storage: RecentEmojiStorage | null = getBrowserStorage(),
  limit = RECENT_EMOJIS_LIMIT,
): RecentEmoji[] {
  const next = normalizeRecentEmojis(recentEmojis, limit)

  try {
    storage?.setItem(
      RECENT_EMOJIS_STORAGE_KEY,
      JSON.stringify(next),
    )
  } catch {}

  return next
}

/**
 * Read, update, and persist one copied emoji.
 */
export function recordRecentEmoji(
  emoji: RecentEmoji,
  storage: RecentEmojiStorage | null = getBrowserStorage(),
  limit = RECENT_EMOJIS_LIMIT,
): RecentEmoji[] {
  const current = loadRecentEmojis(storage, limit)
  const next = addRecentEmoji(current, emoji, limit)

  return saveRecentEmojis(next, storage, limit)
}
