import fs from 'node:fs/promises'
import path from 'node:path'

import Emojilib from 'emojilib'

import {
  buildEmojiIntentKeywordMap,
  experimentEmojiIntents,
} from '../src/data/emojiIntents'
import { getEncoder } from '../src/utils/hf'

const RUN_DATE = new Date().toISOString().slice(0, 10)
const OUTPUT_DIR = path.join(
  process.cwd(),
  'src/artifacts/experiments',
)
const OUTPUT_JSON = path.join(
  OUTPUT_DIR,
  `emoji-search-experiments-${RUN_DATE}.json`,
)

const VECTOR_LIMIT = 50
const METRIC_LIMIT = 10
const AUTO_QUERY_LIMIT = 24
const BATCH_SIZE = 64
const RRF_K = 60

type QuerySource = 'manual' | 'heldout'

type QuerySpec = {
  id: string
  source: QuerySource
  query: string
  relevant: string[]
}

type KeywordPair = {
  raw: string
  human: string
}

type EmojiRecord = {
  emoji: string
  trainRaw: string[]
  trainHuman: string[]
  evalHuman: string[]
  trainTokens: string[]
  salientTokens: string[]
}

type CorpusVariantId =
  | 'glyph_only'
  | 'raw_keywords'
  | 'humanized_phrases'
  | 'humanized_plus_tokens'
  | 'prompted_slim'

type ScorerVariantId =
  | 'vector_float_raw'
  | 'vector_float_prompted'
  | 'vector_int8_raw'
  | 'vector_binary_raw'
  | 'vector_binary_rescore20'
  | 'bm25_only'
  | 'hybrid_rrf_equal'
  | 'hybrid_rrf_vector_heavy'

type MetricSummary = {
  count: number
  hit1: number
  hit3: number
  hit10: number
  mrr10: number
  ndcg10: number
}

type RankedResult = {
  index: number
  score: number
}

type SearchArtifacts = {
  vectorFloatRaw: RankedResult[]
  vectorFloatPrompted: RankedResult[]
  vectorInt8Raw: RankedResult[]
  vectorBinaryRaw: RankedResult[]
  vectorBinaryRescore20: RankedResult[]
  bm25Only: RankedResult[]
  hybridRrfEqual: RankedResult[]
  hybridRrfVectorHeavy: RankedResult[]
}

type QueryTrace = {
  id: string
  source: QuerySource
  query: string
  relevant: string[]
  top10: string[]
}

type ExperimentResult = {
  id: string
  corpus: CorpusVariantId
  scorer: ScorerVariantId
  metrics: {
    all: MetricSummary
    manual: MetricSummary
    heldout: MetricSummary
  }
  misses: QueryTrace[]
}

type CorpusIndex = {
  id: CorpusVariantId
  docs: string[]
  tokens: string[][]
  floatDocs: Float32Array[]
  int8Docs: Float32Array[]
  binaryDocs: Int8Array[]
  bm25: BM25Index
}

type BM25Index = {
  docTerms: Map<string, number>[]
  docFreq: Map<string, number>
  avgDocLen: number
}

const MANUAL_QUERIES: QuerySpec[] = [
  {
    id: 'manual_celebrate_win',
    source: 'manual',
    query: 'celebrate a win',
    relevant: ['🎉', '🥳', '🙌'],
  },
  {
    id: 'manual_congrats',
    source: 'manual',
    query: 'congrats',
    relevant: ['🎉', '🎊', '🥳'],
  },
  {
    id: 'manual_party_time',
    source: 'manual',
    query: 'party time',
    relevant: ['🎉', '🥳', '🎊'],
  },
  {
    id: 'manual_applause',
    source: 'manual',
    query: 'clap applause',
    relevant: ['👏', '🙌'],
  },
  {
    id: 'manual_hilarious',
    source: 'manual',
    query: 'that is hilarious',
    relevant: ['😂', '🤣'],
  },
  {
    id: 'manual_cry_laughing',
    source: 'manual',
    query: "i'm crying laughing",
    relevant: ['😂', '🤣', '💀'],
  },
  {
    id: 'manual_dead_inside',
    source: 'manual',
    query: 'dead inside',
    relevant: ['💀', '😵'],
  },
  {
    id: 'manual_send_love',
    source: 'manual',
    query: 'send love',
    relevant: ['❤️', '🥰', '😍'],
  },
  {
    id: 'manual_broken_heart',
    source: 'manual',
    query: 'broken heart',
    relevant: ['💔', '😭'],
  },
  {
    id: 'manual_in_love',
    source: 'manual',
    query: 'in love',
    relevant: ['😍', '🥰', '❤️'],
  },
  {
    id: 'manual_feeling_sick',
    source: 'manual',
    query: 'feeling sick',
    relevant: ['🤒', '🤢', '🤮'],
  },
  {
    id: 'manual_nauseous',
    source: 'manual',
    query: 'nauseous',
    relevant: ['🤢', '🤮'],
  },
  {
    id: 'manual_sleepy_tired',
    source: 'manual',
    query: 'sleepy tired',
    relevant: ['😴', '🥱', '😪'],
  },
  {
    id: 'manual_mind_blown',
    source: 'manual',
    query: 'mind blown',
    relevant: ['🤯', '😮'],
  },
  {
    id: 'manual_facepalm',
    source: 'manual',
    query: 'facepalm',
    relevant: ['🤦'],
  },
  {
    id: 'manual_thinking_hard',
    source: 'manual',
    query: 'thinking hard',
    relevant: ['🤔', '🧐'],
  },
  {
    id: 'manual_suspicious',
    source: 'manual',
    query: 'suspicious look',
    relevant: ['🤨', '🧐'],
  },
  {
    id: 'manual_awkward',
    source: 'manual',
    query: 'awkward yikes',
    relevant: ['😬', '😅'],
  },
  {
    id: 'manual_nervous_sweating',
    source: 'manual',
    query: 'nervous sweating',
    relevant: ['😅', '😰'],
  },
  {
    id: 'manual_angry',
    source: 'manual',
    query: 'angry rage',
    relevant: ['😡', '🤬'],
  },
  {
    id: 'manual_sad_crying',
    source: 'manual',
    query: 'sad crying',
    relevant: ['😭', '😢'],
  },
  {
    id: 'manual_pray',
    source: 'manual',
    query: 'please pray for me',
    relevant: ['🙏'],
  },
  {
    id: 'manual_thumbs_up',
    source: 'manual',
    query: 'thumbs up yes',
    relevant: ['👍', '👌'],
  },
  {
    id: 'manual_thumbs_down',
    source: 'manual',
    query: 'thumbs down no',
    relevant: ['👎', '🙅'],
  },
  {
    id: 'manual_okay_perfect',
    source: 'manual',
    query: 'okay perfect',
    relevant: ['👌', '✅'],
  },
  {
    id: 'manual_strong_flex',
    source: 'manual',
    query: 'strong flex',
    relevant: ['💪', '🔥'],
  },
  {
    id: 'manual_fire_amazing',
    source: 'manual',
    query: 'fire amazing',
    relevant: ['🔥', '💯'],
  },
  {
    id: 'manual_rocket_launch',
    source: 'manual',
    query: 'rocket launch',
    relevant: ['🚀'],
  },
  {
    id: 'manual_coffee_break',
    source: 'manual',
    query: 'coffee break',
    relevant: ['☕'],
  },
  {
    id: 'manual_music_vibes',
    source: 'manual',
    query: 'music vibes',
    relevant: ['🎵', '🎶', '🎧'],
  },
  {
    id: 'manual_cool',
    source: 'manual',
    query: 'cool sunglasses',
    relevant: ['😎'],
  },
  {
    id: 'manual_star_struck',
    source: 'manual',
    query: 'star struck',
    relevant: ['🤩', '✨'],
  },
  {
    id: 'manual_shocked',
    source: 'manual',
    query: 'shocked surprise',
    relevant: ['😱', '😮', '🤯'],
  },
  {
    id: 'manual_hot_weather',
    source: 'manual',
    query: 'hot weather',
    relevant: ['🥵', '☀️'],
  },
  {
    id: 'manual_freezing',
    source: 'manual',
    query: 'cold freezing',
    relevant: ['🥶', '❄️'],
  },
  {
    id: 'manual_good_luck',
    source: 'manual',
    query: 'good luck',
    relevant: ['🍀', '🤞'],
  },
  ...experimentEmojiIntents.map((intent) => ({
    id: `research_${intent.slug.replace(/-/g, '_')}`,
    source: 'manual' as const,
    query: intent.query,
    relevant: [...intent.relevant],
  })),
]

const CORPUS_VARIANTS: {
  id: CorpusVariantId
  label: string
}[] = [
  { id: 'glyph_only', label: 'emoji glyph only' },
  { id: 'raw_keywords', label: 'raw emojilib keywords' },
  { id: 'humanized_phrases', label: 'humanized phrases' },
  { id: 'humanized_plus_tokens', label: 'humanized phrases plus split tokens' },
  { id: 'prompted_slim', label: 'prompted salient phrases/tokens' },
]

const SCORER_VARIANTS: {
  id: ScorerVariantId
  label: string
}[] = [
  { id: 'vector_float_raw', label: 'exact cosine, raw query' },
  { id: 'vector_float_prompted', label: 'exact cosine, prompted query' },
  { id: 'vector_int8_raw', label: 'int8 cosine, raw query' },
  { id: 'vector_binary_raw', label: 'binary sign search, raw query' },
  {
    id: 'vector_binary_rescore20',
    label: 'binary sign search with float rescoring',
  },
  { id: 'bm25_only', label: 'bm25 lexical only' },
  { id: 'hybrid_rrf_equal', label: 'rrf hybrid, equal weights' },
  {
    id: 'hybrid_rrf_vector_heavy',
    label: 'rrf hybrid, vector-heavy',
  },
]

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = Math.imul(31, hash) + input.charCodeAt(i) | 0
  }
  return hash
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

function pickTrainEvalPairs(keywords: string[]): {
  train: KeywordPair[]
  eval: KeywordPair[]
} {
  const seen = new Set<string>()
  const pairs: KeywordPair[] = []
  for (const raw of keywords) {
    const human = humanizeKeyword(raw)
    if (!human || seen.has(human)) continue
    seen.add(human)
    pairs.push({ raw: raw.toLowerCase(), human })
  }

  if (pairs.length <= 1) {
    return { train: pairs, eval: [] }
  }

  const sorted = pairs
    .slice()
    .sort((a, b) => hashString(a.human) - hashString(b.human))
  const evalCount = Math.max(
    1,
    Math.min(sorted.length - 1, Math.floor(sorted.length / 3)),
  )

  return {
    train: sorted.slice(evalCount),
    eval: sorted.slice(0, evalCount),
  }
}

function buildEmojiRecords(): EmojiRecord[] {
  const intentKeywordMap =
    buildEmojiIntentKeywordMap(
      experimentEmojiIntents,
    )
  const entries = Object.entries(Emojilib as Record<string, string[]>)
  return entries.map(([emoji, keywords]) => {
    const extraKeywords =
      intentKeywordMap.get(emoji) ?? []
    const { train, eval: heldout } =
      pickTrainEvalPairs([
        ...keywords,
        ...extraKeywords,
      ])
    const trainHuman = train.map((pair) => pair.human)
    const trainTokens = unique(trainHuman.flatMap(tokenize))
    return {
      emoji,
      trainRaw: train.map((pair) => pair.raw),
      trainHuman,
      evalHuman: heldout.map((pair) => pair.human),
      trainTokens,
      salientTokens: [],
    }
  })
}

function buildNoiseTokens(records: EmojiRecord[]): Set<string> {
  const df = new Map<string, number>()
  for (const record of records) {
    const seen = new Set(record.trainTokens)
    for (const token of seen) {
      df.set(token, (df.get(token) ?? 0) + 1)
    }
  }

  const threshold = Math.max(35, Math.floor(records.length * 0.04))
  return new Set(
    Array.from(df.entries())
      .filter(([, count]) => count >= threshold)
      .map(([token]) => token),
  )
}

function buildTokenDf(
  records: EmojiRecord[],
): Map<string, number> {
  const df = new Map<string, number>()
  for (const record of records) {
    const seen = new Set(record.trainTokens)
    for (const token of seen) {
      df.set(token, (df.get(token) ?? 0) + 1)
    }
  }
  return df
}

function withSalientTokens(
  records: EmojiRecord[],
  noiseTokens: Set<string>,
): EmojiRecord[] {
  return records.map((record) => ({
    ...record,
    salientTokens: record.trainTokens.filter(
      (token) => !noiseTokens.has(token) && token.length > 2,
    ),
  }))
}

function buildCorpusText(
  record: EmojiRecord,
  variant: CorpusVariantId,
): string {
  switch (variant) {
    case 'glyph_only':
      return record.emoji
    case 'raw_keywords':
      return record.trainRaw.join(', ')
    case 'humanized_phrases':
      return record.trainHuman.join(', ')
    case 'humanized_plus_tokens':
      return unique([
        ...record.trainHuman,
        ...record.trainTokens,
      ]).join(', ')
    case 'prompted_slim': {
      const phrases = record.trainHuman.filter((phrase) =>
        tokenize(phrase).some((token) => record.salientTokens.includes(token)),
      )
      const salient = unique([
        ...phrases.slice(0, 8),
        ...record.salientTokens.slice(0, 16),
      ])
      const body = salient.join(', ') || record.trainHuman.join(', ')
      return `emoji for ${body}`
    }
  }
}

function buildHeldoutQueries(
  records: EmojiRecord[],
  noiseTokens: Set<string>,
  tokenDf: Map<string, number>,
): QuerySpec[] {
  const candidates = records.flatMap((record) => {
    const phrase = record.evalHuman
      .slice()
      .sort((a, b) => {
        const aScore = heldoutScore(a, noiseTokens, tokenDf)
        const bScore = heldoutScore(b, noiseTokens, tokenDf)
        if (aScore !== bScore) return bScore - aScore
        return a.localeCompare(b)
      })[0]

    if (!phrase) return []
    const score = heldoutScore(phrase, noiseTokens, tokenDf)
    if (score <= 0) return []

    return [
      {
        id: `heldout_${record.emoji.codePointAt(0)?.toString(16) ?? 'emoji'}`,
        source: 'heldout' as const,
        query: phrase,
        relevant: [record.emoji],
        score,
        sortKey: hashString(`${record.emoji}:${phrase}`),
      },
    ]
  })

  return candidates
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(0, AUTO_QUERY_LIMIT)
    .map(({ score: _score, sortKey: _sortKey, ...query }) => query)
}

function heldoutScore(
  phrase: string,
  noiseTokens: Set<string>,
  tokenDf: Map<string, number>,
): number {
  const tokens = tokenize(phrase)
  if (tokens.length === 0) return 0

  const salient = tokens.filter(
    (token) => token.length > 2 && !noiseTokens.has(token),
  )
  const rareCount = salient.filter(
    (token) => (tokenDf.get(token) ?? Infinity) <= 12,
  ).length
  const rarestDf = Math.min(
    ...salient.map((token) => tokenDf.get(token) ?? Infinity),
    Infinity,
  )
  const averageDf = salient.length > 0
    ? salient.reduce(
        (total, token) => total + (tokenDf.get(token) ?? 0),
        0,
      ) / salient.length
    : Infinity

  if (salient.length === 0) return 0
  if (tokens.length === 1 && rarestDf > 6) return 0
  if (averageDf > 18) return 0

  return (
    (rareCount * 20) +
    (salient.length * 8) +
    Math.min(phrase.length, 30) -
    averageDf
  )
}

function assertRelevantEmoji(
  records: EmojiRecord[],
  queries: QuerySpec[],
) {
  const known = new Set(records.map((record) => record.emoji))
  for (const query of queries) {
    for (const emoji of query.relevant) {
      if (!known.has(emoji)) {
        throw new Error(
          `Unknown emoji ${emoji} in query ${query.id}`,
        )
      }
    }
  }
}

async function encodeTexts(
  encoder: Awaited<ReturnType<typeof getEncoder>>,
  texts: string[],
): Promise<Float32Array[]> {
  const out: Float32Array[] = []
  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    const batch = texts.slice(start, start + BATCH_SIZE)
    const tensor = await encoder(batch, {
      pooling: 'mean',
      normalize: true,
    })
    const dims = tensor.dims as number[]
    const batchSize = dims[0] ?? batch.length
    const width = dims[1] ?? 384
    const data = tensor.data as Float32Array
    for (let index = 0; index < batchSize; index += 1) {
      out.push(
        Float32Array.from(
          data.subarray(index * width, (index + 1) * width),
        ),
      )
    }
  }
  return out
}

function quantizeInt8(
  vector: Float32Array,
): Float32Array {
  let maxAbs = 0
  for (let i = 0; i < vector.length; i += 1) {
    const value = Math.abs(vector[i] ?? 0)
    if (value > maxAbs) maxAbs = value
  }
  const scale = maxAbs > 0 ? maxAbs / 127 : 1
  const out = new Float32Array(vector.length)
  for (let i = 0; i < vector.length; i += 1) {
    const q = Math.max(
      -127,
      Math.min(127, Math.round((vector[i] ?? 0) / scale)),
    )
    out[i] = q * scale
  }
  return out
}

function quantizeBinary(
  vector: Float32Array,
): Int8Array {
  const out = new Int8Array(vector.length)
  for (let i = 0; i < vector.length; i += 1) {
    out[i] = (vector[i] ?? 0) >= 0 ? 1 : -1
  }
  return out
}

function buildBM25Index(
  docs: string[][],
): BM25Index {
  const docTerms: Map<string, number>[] = []
  const docFreq = new Map<string, number>()
  let totalLength = 0

  for (const tokens of docs) {
    const tf = new Map<string, number>()
    totalLength += tokens.length
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1)
    }
    docTerms.push(tf)
    for (const token of new Set(tokens)) {
      docFreq.set(token, (docFreq.get(token) ?? 0) + 1)
    }
  }

  return {
    docTerms,
    docFreq,
    avgDocLen: totalLength / docs.length,
  }
}

function insertRanked(
  ranked: RankedResult[],
  candidate: RankedResult,
  limit: number,
) {
  if (
    ranked.length === limit &&
    candidate.score <= ranked[ranked.length - 1]!.score
  ) {
    return
  }

  let index = 0
  while (
    index < ranked.length &&
    ranked[index]!.score >= candidate.score
  ) {
    index += 1
  }

  ranked.splice(index, 0, candidate)
  if (ranked.length > limit) {
    ranked.length = limit
  }
}

function topByDot(
  query: Float32Array,
  docs: Float32Array[],
  limit = VECTOR_LIMIT,
): RankedResult[] {
  const ranked: RankedResult[] = []
  for (let docIndex = 0; docIndex < docs.length; docIndex += 1) {
    const doc = docs[docIndex]!
    let dot = 0
    for (let i = 0; i < doc.length; i += 1) {
      dot += (query[i] ?? 0) * (doc[i] ?? 0)
    }
    insertRanked(ranked, { index: docIndex, score: dot }, limit)
  }
  return ranked
}

function topByBinary(
  query: Int8Array,
  docs: Int8Array[],
  limit = VECTOR_LIMIT,
): RankedResult[] {
  const ranked: RankedResult[] = []
  for (let docIndex = 0; docIndex < docs.length; docIndex += 1) {
    const doc = docs[docIndex]!
    let score = 0
    for (let i = 0; i < doc.length; i += 1) {
      score += doc[i] === query[i] ? 1 : -1
    }
    insertRanked(ranked, { index: docIndex, score }, limit)
  }
  return ranked
}

function topByBm25(
  query: string,
  bm25: BM25Index,
  limit = VECTOR_LIMIT,
): RankedResult[] {
  const ranked: RankedResult[] = []
  const tokens = tokenize(query)
  const uniqueTokens = unique(tokens)
  const docCount = bm25.docTerms.length
  const k1 = 1.2
  const b = 0.75

  for (let docIndex = 0; docIndex < bm25.docTerms.length; docIndex += 1) {
    const tf = bm25.docTerms[docIndex]!
    const docLength = Array.from(tf.values()).reduce(
      (total, count) => total + count,
      0,
    )
    let score = 0
    for (const token of uniqueTokens) {
      const termFreq = tf.get(token) ?? 0
      if (termFreq === 0) continue
      const df = bm25.docFreq.get(token) ?? 0
      const idf = Math.log(
        1 + ((docCount - df + 0.5) / (df + 0.5)),
      )
      const numerator = termFreq * (k1 + 1)
      const denominator =
        termFreq +
        k1 * (1 - b + b * (docLength / bm25.avgDocLen))
      score += idf * (numerator / denominator)
    }
    if (score > 0) {
      insertRanked(ranked, { index: docIndex, score }, limit)
    }
  }

  return ranked
}

function rrfCombine(
  parts: Array<{ ranked: RankedResult[]; weight: number }>,
  limit = VECTOR_LIMIT,
): RankedResult[] {
  const scores = new Map<number, number>()
  for (const { ranked, weight } of parts) {
    ranked.forEach((result, rankIndex) => {
      const current = scores.get(result.index) ?? 0
      scores.set(
        result.index,
        current + (weight / (RRF_K + rankIndex + 1)),
      )
    })
  }

  return Array.from(scores.entries())
    .map(([index, score]) => ({ index, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function idealDcg(relevantCount: number): number {
  const capped = Math.min(relevantCount, METRIC_LIMIT)
  let score = 0
  for (let rank = 1; rank <= capped; rank += 1) {
    score += 1 / Math.log2(rank + 1)
  }
  return score
}

function evaluateQueries(
  queries: QuerySpec[],
  rankMap: Map<string, string[]>,
): MetricSummary {
  let hit1 = 0
  let hit3 = 0
  let hit10 = 0
  let mrr10 = 0
  let ndcg10 = 0

  for (const query of queries) {
    const ranked = rankMap.get(query.id) ?? []
    const relevant = new Set(query.relevant)
    const top10 = ranked.slice(0, METRIC_LIMIT)
    const firstMatchIndex = top10.findIndex((emoji) =>
      relevant.has(emoji),
    )

    if (firstMatchIndex === 0) hit1 += 1
    if (firstMatchIndex >= 0 && firstMatchIndex < 3) hit3 += 1
    if (firstMatchIndex >= 0) {
      hit10 += 1
      mrr10 += 1 / (firstMatchIndex + 1)
    }

    let dcg = 0
    top10.forEach((emoji, rankIndex) => {
      if (relevant.has(emoji)) {
        dcg += 1 / Math.log2(rankIndex + 2)
      }
    })
    const maxDcg = idealDcg(relevant.size)
    if (maxDcg > 0) {
      ndcg10 += dcg / maxDcg
    }
  }

  const count = queries.length || 1
  return {
    count: queries.length,
    hit1: hit1 / count,
    hit3: hit3 / count,
    hit10: hit10 / count,
    mrr10: mrr10 / count,
    ndcg10: ndcg10 / count,
  }
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

async function main() {
  console.log('Building emoji records...')
  const initialRecords = buildEmojiRecords()
  const noiseTokens = buildNoiseTokens(initialRecords)
  const tokenDf = buildTokenDf(initialRecords)
  const records = withSalientTokens(initialRecords, noiseTokens)

  const heldoutQueries = buildHeldoutQueries(
    records,
    noiseTokens,
    tokenDf,
  )
  const queries = [...MANUAL_QUERIES, ...heldoutQueries]

  assertRelevantEmoji(records, queries)

  console.log(
    `Records: ${records.length}, manual queries: ${MANUAL_QUERIES.length}, heldout queries: ${heldoutQueries.length}`,
  )

  const encoder = await getEncoder()

  const corpora = CORPUS_VARIANTS.map((variant) => ({
    id: variant.id,
    docs: records.map((record) =>
      buildCorpusText(record, variant.id),
    ),
  }))

  console.log('Encoding corpora...')
  const corpusIndexes: CorpusIndex[] = []
  for (const corpus of corpora) {
    console.log(`  corpus ${corpus.id}`)
    const floatDocs = await encodeTexts(encoder, corpus.docs)
    const int8Docs = floatDocs.map(quantizeInt8)
    const binaryDocs = floatDocs.map(quantizeBinary)
    const tokenDocs = corpus.docs.map(tokenize)
    corpusIndexes.push({
      id: corpus.id,
      docs: corpus.docs,
      tokens: tokenDocs,
      floatDocs,
      int8Docs,
      binaryDocs,
      bm25: buildBM25Index(tokenDocs),
    })
  }

  console.log('Encoding queries...')
  const normalizedQueries = queries.map((query) => humanizeKeyword(query.query))
  const promptedQueries = normalizedQueries.map(
    (query) => `emoji for ${query}`,
  )
  const rawQueryEmbeddings = await encodeTexts(
    encoder,
    normalizedQueries,
  )
  const promptedQueryEmbeddings = await encodeTexts(
    encoder,
    promptedQueries,
  )
  const rawBinaryQueries = rawQueryEmbeddings.map(quantizeBinary)

  console.log('Running experiment matrix...')
  const experimentResults: ExperimentResult[] = []

  for (const corpus of corpusIndexes) {
    for (let queryIndex = 0; queryIndex < queries.length; queryIndex += 1) {
      const query = queries[queryIndex]!
      const rawQuery = rawQueryEmbeddings[queryIndex]!
      const promptedQuery = promptedQueryEmbeddings[queryIndex]!
      const rawBinary = rawBinaryQueries[queryIndex]!

      const searchArtifacts: SearchArtifacts = {
        vectorFloatRaw: topByDot(rawQuery, corpus.floatDocs),
        vectorFloatPrompted: topByDot(promptedQuery, corpus.floatDocs),
        vectorInt8Raw: topByDot(rawQuery, corpus.int8Docs),
        vectorBinaryRaw: topByBinary(rawBinary, corpus.binaryDocs),
        vectorBinaryRescore20: [],
        bm25Only: topByBm25(query.query, corpus.bm25),
        hybridRrfEqual: [],
        hybridRrfVectorHeavy: [],
      }

      searchArtifacts.vectorBinaryRescore20 = searchArtifacts.vectorBinaryRaw
        .slice(0, 20)
        .map((candidate) => ({
          index: candidate.index,
          score: dot(
            rawQuery,
            corpus.floatDocs[candidate.index]!,
          ),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, VECTOR_LIMIT)

      searchArtifacts.hybridRrfEqual = rrfCombine([
        {
          ranked: searchArtifacts.vectorFloatRaw,
          weight: 1,
        },
        {
          ranked: searchArtifacts.bm25Only,
          weight: 1,
        },
      ])
      searchArtifacts.hybridRrfVectorHeavy = rrfCombine([
        {
          ranked: searchArtifacts.vectorFloatRaw,
          weight: 2,
        },
        {
          ranked: searchArtifacts.bm25Only,
          weight: 1,
        },
      ])

      const rankedEmojiByScorer = new Map<
        ScorerVariantId,
        string[]
      >([
        [
          'vector_float_raw',
          mapEmoji(searchArtifacts.vectorFloatRaw, records),
        ],
        [
          'vector_float_prompted',
          mapEmoji(searchArtifacts.vectorFloatPrompted, records),
        ],
        [
          'vector_int8_raw',
          mapEmoji(searchArtifacts.vectorInt8Raw, records),
        ],
        [
          'vector_binary_raw',
          mapEmoji(searchArtifacts.vectorBinaryRaw, records),
        ],
        [
          'vector_binary_rescore20',
          mapEmoji(searchArtifacts.vectorBinaryRescore20, records),
        ],
        [
          'bm25_only',
          mapEmoji(searchArtifacts.bm25Only, records),
        ],
        [
          'hybrid_rrf_equal',
          mapEmoji(searchArtifacts.hybridRrfEqual, records),
        ],
        [
          'hybrid_rrf_vector_heavy',
          mapEmoji(searchArtifacts.hybridRrfVectorHeavy, records),
        ],
      ])

      for (const scorer of SCORER_VARIANTS) {
        let result = experimentResults.find(
          (item) =>
            item.corpus === corpus.id &&
            item.scorer === scorer.id,
        )
        if (!result) {
          result = {
            id: `${corpus.id}__${scorer.id}`,
            corpus: corpus.id,
            scorer: scorer.id,
            metrics: {
              all: emptyMetricSummary(),
              manual: emptyMetricSummary(),
              heldout: emptyMetricSummary(),
            },
            misses: [],
          }
          experimentResults.push(result)
        }

        const ranked = rankedEmojiByScorer.get(scorer.id) ?? []
        result.misses.push({
          id: query.id,
          source: query.source,
          query: query.query,
          relevant: query.relevant,
          top10: ranked.slice(0, METRIC_LIMIT),
        })
      }
    }
  }

  for (const result of experimentResults) {
    const rankMap = new Map(
      result.misses.map((trace) => [trace.id, trace.top10]),
    )
    result.metrics.all = evaluateQueries(queries, rankMap)
    result.metrics.manual = evaluateQueries(
      queries.filter((query) => query.source === 'manual'),
      rankMap,
    )
    result.metrics.heldout = evaluateQueries(
      queries.filter((query) => query.source === 'heldout'),
      rankMap,
    )
    result.misses = result.misses.filter((trace) => {
      const relevant = new Set(trace.relevant)
      return !trace.top10.some((emoji) => relevant.has(emoji))
    }).slice(0, 12)
  }

  const rankedExperiments = experimentResults
    .slice()
    .sort((a, b) => {
      const ndcgDiff =
        b.metrics.all.ndcg10 - a.metrics.all.ndcg10
      if (ndcgDiff !== 0) return ndcgDiff
      const hit3Diff =
        b.metrics.all.hit3 - a.metrics.all.hit3
      if (hit3Diff !== 0) return hit3Diff
      return b.metrics.manual.hit3 - a.metrics.manual.hit3
    })

  const summary = rankedExperiments.slice(0, 10).map((result) => ({
    id: result.id,
    corpus: result.corpus,
    scorer: result.scorer,
    all: compactMetrics(result.metrics.all),
    manual: compactMetrics(result.metrics.manual),
    heldout: compactMetrics(result.metrics.heldout),
  }))

  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  await fs.writeFile(
    OUTPUT_JSON,
    JSON.stringify(
      {
        date: RUN_DATE,
        corpusVariants: CORPUS_VARIANTS,
        scorerVariants: SCORER_VARIANTS,
        noiseTokens: Array.from(noiseTokens).sort(),
        queries,
        summary,
        results: rankedExperiments,
      },
      null,
      2,
    ),
  )

  console.log(`Saved ${OUTPUT_JSON}`)
  console.log('Top experiments:')
  for (const result of rankedExperiments.slice(0, 10)) {
    console.log(
      [
        result.id,
        `all nDCG@10 ${formatPercent(result.metrics.all.ndcg10)}`,
        `all Hit@3 ${formatPercent(result.metrics.all.hit3)}`,
        `manual Hit@3 ${formatPercent(result.metrics.manual.hit3)}`,
        `heldout Hit@10 ${formatPercent(result.metrics.heldout.hit10)}`,
      ].join(' | '),
    )
  }
}

function dot(
  left: Float32Array,
  right: Float32Array,
): number {
  let value = 0
  for (let i = 0; i < left.length; i += 1) {
    value += (left[i] ?? 0) * (right[i] ?? 0)
  }
  return value
}

function mapEmoji(
  ranked: RankedResult[],
  records: EmojiRecord[],
): string[] {
  return ranked.map((item) => records[item.index]!.emoji)
}

function emptyMetricSummary(): MetricSummary {
  return {
    count: 0,
    hit1: 0,
    hit3: 0,
    hit10: 0,
    mrr10: 0,
    ndcg10: 0,
  }
}

function compactMetrics(metrics: MetricSummary) {
  return {
    count: metrics.count,
    hit1: Number(metrics.hit1.toFixed(4)),
    hit3: Number(metrics.hit3.toFixed(4)),
    hit10: Number(metrics.hit10.toFixed(4)),
    mrr10: Number(metrics.mrr10.toFixed(4)),
    ndcg10: Number(metrics.ndcg10.toFixed(4)),
  }
}

await main()
