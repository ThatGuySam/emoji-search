export type EmojiIntentCategory =
  | 'bridge'
  | 'social'
  | 'slang'

export type EmojiIntent = {
  id: string
  slug: string
  query: string
  relevant: readonly [string, ...string[]]
  category: EmojiIntentCategory
  includeInExperiments: boolean
  seedInCorpus: boolean
  altQueries?: readonly string[]
}

export const emojiIntents = [
  {
    id: 'bridge_awkward',
    slug: 'awkward',
    query: 'awkward',
    relevant: ['😶', '😐', '😑', '😬', '😳'],
    category: 'bridge',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'bridge_awkward_silence',
    slug: 'awkward-silence',
    query: 'awkward silence',
    relevant: ['😶', '😬', '🫠'],
    category: 'bridge',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'bridge_yikes',
    slug: 'yikes',
    query: 'yikes',
    relevant: ['😓', '😰'],
    category: 'bridge',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'bridge_cringe',
    slug: 'cringe',
    query: 'cringe',
    relevant: ['😖'],
    category: 'bridge',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'bridge_magnifying_glass',
    slug: 'magnifying-glass',
    query: 'magnifying glass',
    relevant: ['🔎', '🔍'],
    category: 'bridge',
    includeInExperiments: true,
    seedInCorpus: true,
    altQueries: ['magnifying'],
  },
  {
    id: 'bridge_silence',
    slug: 'silence',
    query: 'silence',
    relevant: ['😶'],
    category: 'bridge',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'bridge_respect',
    slug: 'respect',
    query: 'respect',
    relevant: ['🫡'],
    category: 'bridge',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_secondhand_embarrassment',
    slug: 'secondhand-embarrassment',
    query: 'secondhand embarrassment',
    relevant: ['🫣', '😬'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_overstimulated',
    slug: 'overstimulated',
    query: 'overstimulated',
    relevant: ['😵‍💫', '🫨'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_burned_out',
    slug: 'burned-out',
    query: 'burned out',
    relevant: ['😮‍💨', '🫠'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
    altQueries: ['burnt out'],
  },
  {
    id: 'social_passive_aggressive',
    slug: 'passive-aggressive',
    query: 'passive aggressive',
    relevant: ['🙃', '😒'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_eye_roll',
    slug: 'eye-roll',
    query: 'eye roll',
    relevant: ['🙄'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_over_it',
    slug: 'over-it',
    query: 'over it',
    relevant: ['😑', '🙄'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_unhinged',
    slug: 'unhinged',
    query: 'unhinged',
    relevant: ['🤪', '😵‍💫'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_delulu',
    slug: 'delulu',
    query: 'delulu',
    relevant: ['🤡', '🙃'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_chaotic',
    slug: 'chaotic',
    query: 'chaotic',
    relevant: ['🤪', '🫠'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_proud_of_you',
    slug: 'proud-of-you',
    query: 'proud of you',
    relevant: ['🥹', '🥲', '🙌'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_rooting_for_you',
    slug: 'rooting-for-you',
    query: 'rooting for you',
    relevant: ['🙌', '🫶', '📣'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_respectfully',
    slug: 'respectfully',
    query: 'respectfully',
    relevant: ['🫡', '🙏'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_my_bad',
    slug: 'my-bad',
    query: 'my bad',
    relevant: ['😅', '🙇'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_petty',
    slug: 'petty',
    query: 'petty',
    relevant: ['💅', '😒'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_ick',
    slug: 'ick',
    query: 'ick',
    relevant: ['😬', '🤢'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_shook',
    slug: 'shook',
    query: 'shook',
    relevant: ['😳', '🫨'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_underwhelmed',
    slug: 'underwhelmed',
    query: 'underwhelmed',
    relevant: ['😐', '🫥'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_disappointed_not_surprised',
    slug: 'disappointed-but-not-surprised',
    query: 'disappointed but not surprised',
    relevant: ['😒', '😑'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_condolences',
    slug: 'condolences',
    query: 'condolences',
    relevant: ['🕊️', '🖤', '🙏'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_thinking_of_you',
    slug: 'thinking-of-you',
    query: 'thinking of you',
    relevant: ['💭', '🫶'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_manifesting',
    slug: 'manifesting',
    query: 'manifesting',
    relevant: ['✨', '🔮', '🙏'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_locked_in',
    slug: 'locked-in',
    query: 'locked in',
    relevant: ['🎯', '🧠'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
    altQueries: ['locked-in'],
  },
  {
    id: 'social_brain_rot',
    slug: 'brain-rot',
    query: 'brain rot',
    relevant: ['🧠', '💀'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_overthinking',
    slug: 'overthinking',
    query: 'overthinking',
    relevant: ['🤔', '😵‍💫'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'social_doomscrolling',
    slug: 'doomscrolling',
    query: 'doomscrolling',
    relevant: ['📱', '😵'],
    category: 'social',
    includeInExperiments: true,
    seedInCorpus: true,
  },
  {
    id: 'slang_soft_launch',
    slug: 'soft-launch',
    query: 'soft launch',
    relevant: ['🚀', '🔈'],
    category: 'slang',
    includeInExperiments: false,
    seedInCorpus: false,
  },
  {
    id: 'slang_hard_launch',
    slug: 'hard-launch',
    query: 'hard launch',
    relevant: ['🚀'],
    category: 'slang',
    includeInExperiments: false,
    seedInCorpus: false,
  },
  {
    id: 'slang_good_vibes',
    slug: 'good-vibes',
    query: 'good vibes',
    relevant: ['✨', '😎', '🎵'],
    category: 'slang',
    includeInExperiments: false,
    seedInCorpus: false,
  },
  {
    id: 'slang_hot_mess',
    slug: 'hot-mess',
    query: 'hot mess',
    relevant: ['🫠', '🥵'],
    category: 'slang',
    includeInExperiments: false,
    seedInCorpus: false,
  },
  {
    id: 'slang_messy',
    slug: 'messy',
    query: 'messy',
    relevant: ['🫠', '😵‍💫'],
    category: 'slang',
    includeInExperiments: false,
    seedInCorpus: false,
  },
  {
    id: 'slang_supportive',
    slug: 'supportive',
    query: 'supportive',
    relevant: ['🫶', '🙌'],
    category: 'slang',
    includeInExperiments: false,
    seedInCorpus: false,
  },
  {
    id: 'slang_clingy',
    slug: 'clingy',
    query: 'clingy',
    relevant: ['🥺', '🫶'],
    category: 'slang',
    includeInExperiments: false,
    seedInCorpus: false,
  },
  {
    id: 'slang_dramatic',
    slug: 'dramatic',
    query: 'dramatic',
    relevant: ['🎭', '😩'],
    category: 'slang',
    includeInExperiments: false,
    seedInCorpus: false,
  },
  {
    id: 'slang_copium',
    slug: 'copium',
    query: 'copium',
    relevant: ['🤡', '😮‍💨'],
    category: 'slang',
    includeInExperiments: false,
    seedInCorpus: false,
  },
  {
    id: 'slang_touch_grass',
    slug: 'touch-grass',
    query: 'touch grass',
    relevant: ['🌿', '☀️'],
    category: 'slang',
    includeInExperiments: false,
    seedInCorpus: false,
  },
] as const satisfies readonly EmojiIntent[]

export const experimentEmojiIntents =
  emojiIntents.filter(
    (intent) => intent.includeInExperiments,
  )

function unique(
  items: readonly string[],
): string[] {
  return Array.from(new Set(items))
}

export function getEmojiIntentRoute(
  intent: Pick<EmojiIntent, 'slug'>,
) {
  return `/emoji-for/${intent.slug}/`
}

export function getEmojiIntentTitle(
  intent: Pick<EmojiIntent, 'query'>,
) {
  return `Emoji for ${intent.query}`
}

export function getEmojiIntentBySlug(
  slug: string,
) {
  return (
    emojiIntents.find(
      (intent) => intent.slug === slug,
    ) ?? null
  )
}

export function getEmojiIntentLeadEmoji(
  intent: Pick<EmojiIntent, 'relevant'>,
) {
  return intent.relevant[0]
}

export function getEmojiIntentSearchTerms(
  intent: Pick<EmojiIntent, 'query' | 'altQueries'>,
) {
  return unique([
    intent.query,
    ...(intent.altQueries ?? []),
  ])
}

export function buildEmojiIntentKeywordMap(
  intents: readonly EmojiIntent[] = emojiIntents,
) {
  const map = new Map<string, string[]>()

  for (const intent of intents) {
    if (!intent.seedInCorpus) {
      continue
    }

    const terms = getEmojiIntentSearchTerms(intent)
    for (const emoji of intent.relevant) {
      const current = map.get(emoji) ?? []
      map.set(
        emoji,
        unique([
          ...current,
          ...terms,
        ]),
      )
    }
  }

  return map
}
