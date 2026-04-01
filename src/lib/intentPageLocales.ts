export type IntentPageLocaleCode =
  | 'pt-BR'
  | 'ja-JP'
  | 'hi-IN'

export type IntentPageLocaleSlug =
  | 'pt-br'
  | 'ja-jp'
  | 'hi-in'

export type IntentPageLocale = {
  code: IntentPageLocaleCode
  slug: IntentPageLocaleSlug
  nativeLabel: string
  hubEyebrow: string
  hubTitle: string
  hubDescription: string
  fastPickLabel: string
  fastPickDescription: string
  tryExactHeading: string
  tryExactDescription: string
  relatedPagesHeading: string
}

export type LocalizedIntentSlugMap = Record<
  IntentPageLocaleSlug,
  Record<string, string>
>

const INTENT_PAGE_LOCALES: readonly IntentPageLocale[] = [
  {
    code: 'pt-BR',
    slug: 'pt-br',
    nativeLabel: 'Portugues (Brasil)',
    hubEyebrow: 'Hub em Portugues',
    hubTitle: 'Emoji para frases do dia a dia',
    hubDescription:
      'Abra paginas em portugues para momentos constrangedores, apoio emocional e reacoes comuns.',
    fastPickLabel: 'Escolha rapida para',
    fastPickDescription:
      'Toque no emoji mais proximo para copiar na hora e continue se quiser mais nuance.',
    tryExactHeading: 'Teste sua frase exata',
    tryExactDescription:
      'A busca do FetchMoji funciona melhor quando voce digita a frase natural, nao apenas o nome do emoji.',
    relatedPagesHeading: 'Paginas relacionadas',
  },
  {
    code: 'ja-JP',
    slug: 'ja-jp',
    nativeLabel: '日本語',
    hubEyebrow: '日本語のハブ',
    hubTitle: '日常のフレーズ向け絵文字',
    hubDescription:
      '気まずい場面、励まし、よくあるリアクションに合う絵文字ページをまとめています。',
    fastPickLabel: 'すぐ選べる候補',
    fastPickDescription:
      '近い絵文字をタップしてすぐコピーし、必要なら下でニュアンスを確認してください。',
    tryExactHeading: '言い方そのままで試す',
    tryExactDescription:
      'FetchMoji は絵文字名より自然な言い回しを入れた方が、合う結果を出しやすいです。',
    relatedPagesHeading: '関連する絵文字ページ',
  },
  {
    code: 'hi-IN',
    slug: 'hi-in',
    nativeLabel: 'हिन्दी',
    hubEyebrow: 'हिंदी हब',
    hubTitle: 'रोज़मर्रा की बातों के लिए इमोजी',
    hubDescription:
      'अटपटी स्थिति, सहारा देने वाले संदेश और आम रिएक्शन के लिए इमोजी पेज देखें।',
    fastPickLabel: 'तेज़ चुनने वाला विकल्प',
    fastPickDescription:
      'सबसे करीब वाले इमोजी पर टैप करके तुरंत कॉपी करें, फिर चाहें तो नीचे बारीक फर्क देखें।',
    tryExactHeading: 'अपनी सटीक लाइन आज़माएँ',
    tryExactDescription:
      'FetchMoji तब सबसे अच्छा काम करता है जब आप सिर्फ इमोजी का नाम नहीं, अपनी नैचुरल लाइन लिखते हैं।',
    relatedPagesHeading: 'मिलते-जुलते इमोजी पेज',
  },
] as const

const LOCALIZED_INTENT_SLUGS: LocalizedIntentSlugMap = {
  'pt-br': {
    'awkward-silence': 'silencio-constrangedor',
    awkward: 'constrangedor',
    cringe: 'cringe',
    delulu: 'delulu',
    'my-bad': 'foi-mal',
    overthinking: 'pensando-demais',
    'proud-of-you': 'orgulho-de-voce',
    'secondhand-embarrassment': 'vergonha-alheia',
    'thinking-of-you': 'pensando-em-voce',
    yikes: 'eita',
  },
  'ja-jp': {
    'awkward-silence': '気まずい沈黙',
    awkward: '気まずい',
    cringe: '痛い',
    delulu: '妄想モード',
    'my-bad': 'ごめん',
    overthinking: '考えすぎ',
    'proud-of-you': '誇らしい',
    'secondhand-embarrassment': '見てられない',
    'thinking-of-you': '気にかけてる',
    yikes: 'やばい',
  },
  'hi-in': {
    'awkward-silence': 'अजीब-चुप्पी',
    awkward: 'अटपटा',
    cringe: 'क्रिंज',
    delulu: 'डिलुलु',
    'my-bad': 'मेरी-गलती',
    overthinking: 'ज़्यादा-सोचना',
    'proud-of-you': 'तुम-पर-गर्व-है',
    'secondhand-embarrassment': 'दूसरों-की-वजह-से-शर्म',
    'thinking-of-you': 'तुम्हारी-याद',
    yikes: 'हाय-राम',
  },
}

export function listIntentPageLocales() {
  return [...INTENT_PAGE_LOCALES]
}

export function getIntentPageLocaleByCode(
  code: string,
) {
  return INTENT_PAGE_LOCALES.find(
    (locale) => locale.code === code,
  ) ?? null
}

export function getIntentPageLocaleBySlug(
  slug: string,
) {
  return INTENT_PAGE_LOCALES.find(
    (locale) => locale.slug === slug,
  ) ?? null
}

export function buildLocalizedIntentHubRoute(
  localeSlug: IntentPageLocaleSlug,
) {
  return `/emoji-for/${localeSlug}/`
}

export function buildLocalizedIntentRoute(options: {
  localeSlug: IntentPageLocaleSlug
  slug: string
}) {
  return `/emoji-for/${options.localeSlug}/${options.slug}/`
}

export function buildLegacyLocalizedIntentRoute(options: {
  localeSlug: IntentPageLocaleSlug
  sourceSlug: string
}) {
  return buildLocalizedIntentRoute({
    localeSlug: options.localeSlug,
    slug: options.sourceSlug,
  })
}

export function getLocalizedIntentSlug(options: {
  localeSlug: IntentPageLocaleSlug
  sourceSlug: string
}) {
  return (
    LOCALIZED_INTENT_SLUGS[options.localeSlug]?.[
      options.sourceSlug
    ] ?? null
  )
}

export function buildLocalizedIntentRouteForSource(options: {
  localeSlug: IntentPageLocaleSlug
  sourceSlug: string
}) {
  return buildLocalizedIntentRoute({
    localeSlug: options.localeSlug,
    slug:
      getLocalizedIntentSlug(options) ??
      options.sourceSlug,
  })
}

export function listLocalizedIntentSlugRedirects() {
  return (
    Object.entries(LOCALIZED_INTENT_SLUGS) as Array<
      [IntentPageLocaleSlug, Record<string, string>]
    >
  ).flatMap(([localeSlug, slugs]) =>
    Object.entries(slugs).flatMap(
      ([sourceSlug, localizedSlug]) => {
        if (localizedSlug === sourceSlug) {
          return []
        }
        return [
          {
            from: buildLegacyLocalizedIntentRoute({
              localeSlug,
              sourceSlug,
            }),
            to: buildLocalizedIntentRoute({
              localeSlug,
              slug: localizedSlug,
            }),
          },
        ]
      },
    ),
  )
}

export function buildIntentPageAlternates(
  sourceSlug: string,
) {
  return [
    {
      hreflang: 'x-default',
      href: `/emoji-for/${sourceSlug}/`,
    },
    {
      hreflang: 'en',
      href: `/emoji-for/${sourceSlug}/`,
    },
    ...INTENT_PAGE_LOCALES.map((locale) => ({
      hreflang: locale.code,
      href: buildLocalizedIntentRouteForSource({
        localeSlug: locale.slug,
        sourceSlug,
      }),
    })),
  ]
}

export function buildIntentHubAlternates() {
  return [
    {
      hreflang: 'x-default',
      href: '/emoji-for/',
    },
    {
      hreflang: 'en',
      href: '/emoji-for/',
    },
    ...INTENT_PAGE_LOCALES.map((locale) => ({
      hreflang: locale.code,
      href: buildLocalizedIntentHubRoute(
        locale.slug,
      ),
    })),
  ]
}
