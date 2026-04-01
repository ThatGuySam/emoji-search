# Trending Term Sources And Multilingual Emoji Search

Tease: Trend vocabulary should come from systems that already observe search
behavior, not from scraped slang lists or one-off social snapshots.

Lede: Repo-local review plus official docs from Tenor, GIPHY, TMDb, Wikimedia,
YouTube, and Hugging Face point to a two-track plan for FetchMoji: keep an
evergreen intent catalog in the core corpus, add a separate trend-ingestion
layer with source tags and TTLs, and treat full multilingual semantic search as
an explicit model migration rather than "just more translated terms."

Why it matters:

- The current production path is a compact English embedding stack built around
  `Xenova/gte-small`, 384-d normalized vectors, and a prebuilt SQLite corpus.
- The new shared intent catalog already gives the repo a clean place to hang
  dedicated pages, evergreen aliases, and later locale-specific terms.
- Trend words and multilingual aliases have different lifecycles, so collapsing
  them into one flat keyword list will create ranking drift and maintenance
  noise.

Go deeper:

- Use Tenor and GIPHY for phrase-level trend terms; use TMDb, Wikimedia, and
  optionally YouTube for entity trends.
- Keep trend aliases separate from evergreen corpus seeds and expire them on a
  schedule.
- If multilingual semantic search becomes a real requirement, the most
  realistic browser-friendly upgrade path is `Xenova/multilingual-e5-small`
  plus a corpus rebuild and E5-style `query:` / `passage:` formatting.

Date: 2026-03-30

## Scope

Research:

- which official sources could feed trendy search terms into FetchMoji
- the current embedding model setup in this repo
- what going multilingual would actually mean for search, the terms list, and
  future dedicated pages

## Short Answer

The cleanest product split is:

1. Keep a curated evergreen intent layer for durable phrases like `awkward`,
   `condolences`, and `brain rot`.
2. Add a separate trend layer sourced from official APIs that already track
   searches or cultural entities.
3. Treat multilingual support as two different problems:
   - localized term coverage for pages, aliases, and exact lookup
   - multilingual semantic retrieval for free-form queries

Those are related, but not the same.

For the current repo, the lowest-risk near-term path is:

- keep `Xenova/gte-small` for the default English semantic layer
- extend the shared intent catalog with locale-aware aliases later
- ingest trend terms into a separate store with source metadata and expiry

If you need true multilingual semantic search, the most plausible migration is
to `Xenova/multilingual-e5-small`. It is available as a Transformers.js ONNX
model and keeps the same 384-d embedding width, which means the SQLite blob
shape can stay the same. But it is still a real migration because you would
need to re-embed the corpus, change query/document formatting to match E5
guidance, and re-measure browser performance and ranking thresholds.

## Repo Context

Confirmed from local files on 2026-03-30:

- `src/constants.ts` sets:
  - `DEFAULT_MODEL = 'Xenova/gte-small'`
  - `DEFAULT_DIMENSIONS = 384`
  - `DATA_TYPE = 'int8'`
  - `MODEL_REVISION = 'main'`
- `src/utils/hf.ts` creates a Transformers.js
  `pipeline('feature-extraction', modelId, ...)` encoder and calls it with
  `pooling: 'mean'` and `normalize: true`.
- `src/utils/worker.ts` uses the same feature-extraction pipeline in the worker
  that serves query embeddings back to the app.
- `scripts/build-sqlite-db.ts` builds the SQLite corpus from
  `buildEmojiSearchDocs()` and stores embeddings as raw float32 blobs in
  `public/db/emoji-search.sqlite`.
- `src/utils/sqlite.ts` decodes those blobs and ranks rows by direct dot
  product against the query embedding.

Important local nuance:

- The code comments talk about preferring WebGPU, but the current runtime
  configuration does not actually take that path.
- `deviceType()` only uses `webgpu` for `fp32`, `fp16`, or `q4f16`.
- Because `DATA_TYPE` is currently `int8`, the browser path falls back to
  `wasm`, while Node uses `cpu`.

This matters because multilingual model tradeoffs need to be compared against
the current WASM baseline, not an assumed WebGPU baseline.

Also relevant:

- The prior memo at
  `docs/research/ios-emoji-keyboard-friction-and-vocabulary-gaps-2026-03-29.md`
  identified the first durable set of intent gaps.
- The new shared catalog in `src/data/emojiIntents.ts` now gives the repo
  stable ids, slugs, routes, and corpus-seeding flags for future dedicated
  pages.

## Source Quality Notes

High confidence:

- repo-local code and tests
- official vendor docs for Tenor, GIPHY, TMDb, Wikimedia, YouTube
- Hugging Face model cards and Transformers.js-compatible model repos

Medium confidence:

- inference about product architecture from the repo and model-card constraints

Low confidence / mostly discarded:

- HN and Lobsters searches were low-yield for this specific question
- GitHub validation added little beyond confirming that JS-ready ONNX repos
  exist for the candidate multilingual model

## Trend Source Options

### 1. Tenor is the strongest official source for phrase-level trend vocabulary

Confirmed:

- Tenor documents a `trending_terms` endpoint.
- It returns `string[]` results sorted by Trending Rank.
- Tenor supports `country` and `locale` parameters.
- Tenor also has a `categories` endpoint whose labels can be localized.
- Tenor recommends sending `client_key` consistently and says the `key` plus
  `client_key` pairing affects custom behavior.

Why it fits FetchMoji:

- It is the best official source in this set for short, expressive,
  search-native phrases.
- It maps well to "people are typing this right now" rather than
  "people talked about this in a post title."

Recommendation:

- Use Tenor as the primary trend-term feed for slang, reactions, and searchable
  mood phrases.

### 2. GIPHY is a strong second source for trend terms and term expansion

Confirmed:

- GIPHY exposes `api.giphy.com/v1/trending/searches`.
- GIPHY also exposes autocomplete and related-tag endpoints:
  - `api.giphy.com/v1/gifs/search/tags`
  - `api.giphy.com/v1/tags/related/<term>`
- GIPHY recommends using `random_id` across requests for better adjustment of
  responses.
- GIPHY's official migration guide says new beta keys are rate limited to
  `100 searches/API calls per hour` until upgraded.

Why it fits FetchMoji:

- Tenor gives the best clean trend phrases.
- GIPHY is useful as a companion source because it can expand a known phrase
  into neighboring tags and trending variants.

Recommendation:

- Use GIPHY as a secondary source for related-tag expansion and trend
  cross-checking, not as the only source of truth.

### 3. TMDb is a good entity-trend source for movies, TV, and people

Confirmed:

- TMDb documents `GET /3/trending/all/{time_window}`.
- The endpoint description is: "Get the trending movies, TV shows and people."
- TMDb requires API credentials via an authorization header / API key flow.

Why it fits FetchMoji:

- This is useful for named entities that become emoji-adjacent search terms:
  celebrity names, franchises, shows, and characters.
- It is better for entity pages or "people also searched" modules than for the
  core semantic corpus.

Recommendation:

- Use TMDb for pop-culture entity trend ingestion, not for slang discovery.

### 4. Wikimedia pageviews are a high-signal open source for broad entity trends

Confirmed:

- Wikimedia's Analytics API provides "List most-viewed pages" endpoints.
- The pageviews reference includes:
  - `/pageviews/top/{project}/{access}/{year}/{month}/{day}`
  - `/pageviews/top-per-country/{country}/{access}/{year}/{month}/{day}`
- The getting-started guide says the Analytics API gives open access to
  Wikimedia project data.
- The access policy says the data is available under CC0 1.0 and requires a
  `User-Agent` or `Api-User-Agent` header.

Why it fits FetchMoji:

- It is an unusually clean and licensing-friendly source for entity popularity.
- Because the API is project-based, it also gives you a natural multilingual
  split by wiki project such as `en.wikipedia.org`, `es.wikipedia.org`, and so
  on.

Recommendation:

- Use Wikimedia for broad entity trend detection and locale-aware entity pages.

### 5. YouTube can surface popular titles, but it is noisier than the others

Confirmed:

- `videos.list` supports `chart=mostPopular`.
- The docs say `mostPopular` returns the most popular videos for the specified
  region and video category.
- The docs also expose `regionCode` and `videoCategoryId`.
- A call to this method has a quota cost of 1 unit.

Why it fits FetchMoji:

- YouTube can surface creators, songs, memes, and phrases that the other feeds
  miss.
- But the raw titles are longer, noisier, and more SEO-shaped than Tenor or
  GIPHY search terms.

Recommendation:

- Treat YouTube as an optional enrichment layer, not a first ingestion target.

## What Works For Trend Ingestion

Inference from the repo plus source constraints:

- Keep evergreen intent aliases and fast-moving trend aliases in separate
  stores.
- Attach metadata to each trend alias:
  - `source`
  - `locale`
  - `observedAt`
  - `expiresAt`
  - optional `entityType`
- Add trend aliases to dedicated pages, query suggestions, and experiment
  fixtures before adding them to the core embedded corpus.
- Use source-specific normalization:
  - lowercase
  - trim punctuation noise
  - dedupe close variants
  - preserve original display case for page copy

The durable pattern is:

- evergreen terms belong in `src/data/emojiIntents.ts`
- trend terms belong in a separate time-bound layer

## What To Avoid

Do not:

- automatically seed every daily trending term into `buildEmojiSearchDocs()`
- mix entity names, reaction phrases, and locale variants without source tags
- assume translated keyword lists alone will produce good multilingual semantic
  retrieval with an English-only model
- use scraped "internet slang" pages as the primary trend source when official
  APIs already expose live search behavior

## Current Embedding Setup

The current semantic search stack is:

1. Build text documents from `emojilib` keywords plus seeded intent terms in
   `src/utils/emojiSearchDocs.ts`.
2. Encode those documents with `Xenova/gte-small` using Transformers.js
   `feature-extraction`, mean pooling, and normalized output.
3. Store the 384-length float32 vectors in SQLite as blobs.
4. Encode user queries with the same model in the worker.
5. Rank rows by dot product in `src/utils/sqlite.ts`.

Important implications:

- The system assumes a fixed vector width of 384 in multiple places.
- The production query path currently embeds raw query text, not E5-style
  `query:`-prefixed text.
- The corpus build path currently embeds raw document text, not E5-style
  `passage:` text.

The experiments script does already test a prompted query variant
(`emoji for ${query}`), which is conceptually adjacent to prompt formatting,
but that is not the same as following E5's retrieval guidance.

## What Multilingual Would Actually Look Like

### Option A: localized term lists without changing the embedding model

This is the lower-risk product move.

What it would mean:

- keep `Xenova/gte-small` as the semantic model
- add locale-aware aliases to the intent catalog
- use those aliases for dedicated pages, suggestions, and lexical matching
- optionally add locale-aware exact/BM25 fallback before semantic ranking

Suggested shape:

```ts
type LocalizedEmojiIntent = EmojiIntent & {
  aliasesByLocale?: Record<string, readonly string[]>
  trendAliases?: readonly TrendAlias[]
}

type TrendAlias = {
  term: string
  locale: string
  source: 'tenor' | 'giphy' | 'tmdb' | 'wikimedia' | 'youtube'
  observedAt: string
  expiresAt: string
}
```

Benefits:

- no model swap
- no SQLite schema change
- clean fit for dedicated pages and future SEO / routing work

Limits:

- `gte-small` is explicitly English-only in its model card
- translated aliases alone will help exact lookup and page copy, but they will
  not reliably deliver multilingual semantic similarity for arbitrary free-form
  queries

### Option B: full multilingual semantic search

This is the real search migration.

The strongest realistic candidate in the current stack is
`Xenova/multilingual-e5-small` because:

- there is an official Transformers.js-compatible ONNX repo for it
- the base model card documents 384-d embeddings
- the model card explicitly supports multilingual use and documents retrieval
  prefixes

What would change:

1. Swap the model id from `Xenova/gte-small` to `Xenova/multilingual-e5-small`.
2. Rebuild the entire SQLite corpus with the new model.
3. Format texts according to the E5 guidance:
   - queries as `query: ...`
   - documents/passages as `passage: ...`
4. Re-run experiments and recalibrate match thresholds.
5. Measure download size, init cost, and search latency on the current WASM
   path, especially on iPhone Safari.

What would stay the same:

- 384-d vector width, so the SQLite blob shape and ranker logic can stay the
  same
- the intent catalog and dedicated-page structure still remain useful

Important constraint:

- multilingual embeddings do not remove the need for localized aliases
- page copy, exact-match behavior, and trending-term display still need
  locale-aware text data even after a model upgrade

### Option C: hybrid rollout

This is the recommendation.

- Keep `gte-small` in production now.
- Build locale-aware aliases into the intent catalog and related page data.
- Add trend ingestion from official APIs into a separate, expiring layer.
- Prototype `multilingual-e5-small` behind a flag and compare:
  - recall
  - latency
  - memory pressure
  - model download cost

## Recommendation

### Near term

1. Keep the current English embedding model in production.
2. Expand the shared intent catalog with future `aliasesByLocale` support.
3. Add a trend alias pipeline that starts with:
   - Tenor for phrase-level trends
   - GIPHY for related tags and secondary trend validation
   - TMDb plus Wikimedia for entity trends
4. Surface those terms first in:
   - tests
   - dedicated page metadata
   - suggestion UIs
   - experiments

### Medium term

Prototype multilingual search on a branch with `Xenova/multilingual-e5-small`.

Success criteria should be explicit:

- multilingual queries materially improve recall
- iPhone/Safari startup remains acceptable on the current WASM path
- ranking stays stable enough that threshold tuning is manageable

### Why this order is right

Inference:

- Most of the immediate product win comes from better intent coverage and a
  better trend vocabulary, not from a model migration.
- Multilingual semantic search is valuable, but it is the more invasive change.
- The shared intent/page catalog now gives the repo a safe place to accumulate
  that coverage before you decide whether the embedding layer should move too.

## Source Links

Repo-local files, accessed 2026-03-30:

- `src/constants.ts`
- `src/utils/hf.ts`
- `src/utils/worker.ts`
- `scripts/build-sqlite-db.ts`
- `src/utils/sqlite.ts`
- `src/utils/emojiSearchDocs.ts`
- `src/data/emojiIntents.ts`
- `src/data/emojiIntents.test.ts`
- `src/utils/emojiSearchDocs.test.ts`
- `docs/research/ios-emoji-keyboard-friction-and-vocabulary-gaps-2026-03-29.md`

Official docs and model cards, accessed 2026-03-30:

- Tenor API endpoints:
  https://developers.google.com/tenor/guides/endpoints
- GIPHY API endpoints:
  https://developers.giphy.com/docs/api/endpoint/
- GIPHY Tenor migration guide:
  https://developers.giphy.com/docs/api/tenor-migration/
- TMDb trending all:
  https://developer.themoviedb.org/reference/trending-all
- TMDb API key validation / auth area:
  https://developer.themoviedb.org/reference/authentication-validate-key
- Wikimedia Analytics API, page views reference:
  https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html
- Wikimedia Analytics API getting started:
  https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/documentation/getting-started.html
- Wikimedia Analytics API access policy:
  https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/documentation/access-policy.html
- YouTube Data API `videos.list`:
  https://developers.google.com/youtube/v3/docs/videos/list
- `thenlper/gte-small` model card:
  https://huggingface.co/thenlper/gte-small
- `Xenova/gte-small` Transformers.js ONNX repo:
  https://huggingface.co/Xenova/gte-small
- `intfloat/multilingual-e5-small` model card:
  https://huggingface.co/intfloat/multilingual-e5-small
- `Xenova/multilingual-e5-small` Transformers.js ONNX repo:
  https://huggingface.co/Xenova/multilingual-e5-small
