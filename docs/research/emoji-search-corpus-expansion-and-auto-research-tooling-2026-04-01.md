# Emoji Search Corpus Expansion And Auto-Research Tooling

Tease: The fastest path to better emoji search here is not model fine-tuning. It
is a better corpus and a stricter offline acceptance loop.

Lede: Repo-local evidence plus Unicode CLDR, Signal's emoji search index,
retrieval research on synthetic query generation, and current sentence-transformer
guidance all point to the same recommendation for FetchMoji on 2026-04-01:
improve the embedded emoji docs first, generate candidate search phrases
offline, and only consider rerankers or embedding fine-tuning after you have a
much stronger evaluation set.

Why it matters:

- The current best local run is already driven by doc text quality, not by a
  complex scorer.
- The biggest remaining misses are still vocabulary and alias coverage misses.
- This repo already has most of the pieces needed for an automated editorial QA
  loop: corpus generation, offline experiments, and an EmbeddingGemma helper.

Go deeper:

- Treat "fine tune the emoji docs/text" as a corpus-engineering problem first,
  not a model-weights problem.
- Use CLDR + Signal-style custom tags + intent-page examples as the stable base
  corpus.
- Add a Promptagator / docTTTTTquery style offline candidate-generation pass,
  then gate candidates through the existing experiment harness before admitting
  them into the shipped corpus.

Date: 2026-04-01

## Scope

Research ideas and tooling for improving FetchMoji search beyond the current
known intents, especially by automatically improving the emoji search docs/text
that are embedded into the client-side search index.

## Short Answer

The best-fit plan for this repo is:

1. Keep the runtime retriever simple for now.
2. Improve search quality by expanding the offline emoji corpus with better
   aliases, short situational phrases, and intent-shaped examples.
3. Generate candidate phrases automatically, but do not ship them blindly.
4. Score candidates with the existing retrieval harness plus semantic drift QA.
5. Revisit rerankers or model fine-tuning only after you have a larger
   validated query -> relevant emoji dataset.

The recommended tooling split is:

- Base vocabulary: Unicode CLDR annotations plus Signal's emoji search index
  style custom tags.
- Candidate generation: an LLM-driven offline synthetic query generation pass in
  the style of Promptagator / docTTTTTquery.
- Acceptance gate: `scripts/run-emoji-experiments.ts` plus semantic-similarity
  QA, reusing `scripts/embeddinggemma_similarity.py`.
- Runtime model: keep `Xenova/gte-small` unless multilingual semantic search
  becomes a near-term product goal.

## Repo Context

Confirmed from local files on 2026-04-01:

- Search quality is currently controlled mostly by `buildEmojiSearchDocs()` in
  `src/utils/emojiSearchDocs.ts`, which builds each emoji document from
  humanized `emojilib` keywords plus seeded intent keywords.
- The SQLite build path in `scripts/build-sqlite-db.ts` embeds those generated
  `content` strings directly into the shipped browser corpus.
- The best local experiment result remains
  `humanized_plus_tokens__vector_float_raw`, not a prompted or hybrid variant.
- That best run still has weak held-out performance and mostly vocabulary-shaped
  misses.
- The repo already contains:
  - an experiment harness in `scripts/run-emoji-experiments.ts`
  - a durable experiment artifact in
    `src/artifacts/experiments/emoji-search-experiments-2026-03-28.json`
  - an EmbeddingGemma scoring helper in
    `scripts/embeddinggemma_similarity.py`

Important local implication:

- The highest-leverage insertion point is offline corpus authoring.
- The current bottleneck is not "how do we do more ANN tricks in the browser?"
- It is "how do we ship better text for each emoji without introducing noisy
  drift?"

## Source Quality Notes

High confidence:

- repo-local code and experiment artifacts
- Unicode CLDR and UTS #51 docs
- Signal's `emoji-search-index` repository
- docTTTTTquery repository and paper
- Promptagator paper
- Sentence Transformers documentation
- Hugging Face model cards for the current and plausible future embedding models

Medium confidence:

- Simon Willison's practitioner notes on hybrid SQLite FTS + vector search
- inference about product fit from the current browser-only architecture

Low confidence / low yield:

- HN and Lobsters searches were low-yield for this exact problem
- Stack Overflow was not needed because the main questions here are about
  retrieval strategy and corpus design, not an implementation bug or API edge
  case

## What The Evidence Says

### 1. The repo's own data says corpus design matters more than fancy scoring right now

Confirmed locally:

- The best run was `humanized_plus_tokens__vector_float_raw`.
- It beat the slimmer prompted corpus and the hybrid variants.
- Overall `nDCG@10` was `0.5312`, but held-out `nDCG@10` was only `0.3991`.
- The top miss list is dominated by vocabulary coverage problems such as
  `awkward yikes`, `heart exclamation`, `zany face`, `letter`, and `public`.

Implication:

- The next best dollar of effort should go into better doc text and broader eval
  coverage, not into swapping the whole retrieval stack.

### 2. CLDR is the strongest base source for emoji search text, and it is explicitly built for search

Confirmed from Unicode CLDR docs:

- CLDR collects short names and keywords for emoji characters and sequences.
- Those keywords plus short-name words are used for search and predictive typing.
- The keyword guidance is directly relevant to this repo:
  - keywords should be descriptive and searchable
  - they do not need to be literal translations
  - they should not be padded with grammatical variants
  - a small, useful set is preferred over a bloated list

Also relevant:

- CLDR 46 says WhatsApp emoji search keyword data was incorporated.
- The same release note says the keyword sets were simplified in many locales by
  breaking up multi-word phrases, with the claim that the simpler form usually
  works as well or better in practice.

Implication:

- CLDR should be treated as the primary "evergreen base layer" for emoji search
  vocabulary.
- The repo's current preference for short humanized phrases plus split tokens is
  directionally consistent with Unicode's own search guidance.

### 3. Signal validates the "CLDR plus custom editorial tags" pattern

Confirmed from `signalapp/emoji-search-index`:

- Signal describes its emoji search index as a combination of Unicode CLDR
  annotations and a custom tag set.

Implication:

- FetchMoji should not treat CLDR as sufficient by itself.
- The right architecture is a two-part corpus:
  - stable standards-derived keywords
  - product-specific custom tags for social intent, slang, and situational use

This is already where the repo is heading with `emojiIntents`, but it should be
expanded beyond the current small seeded set.

### 4. Promptagator and docTTTTTquery are the most relevant external patterns for "auto-research" here

Confirmed from retrieval research:

- Promptagator shows that few-shot synthetic query generation can build useful
  task-specific retrievers from a very small example set.
- docTTTTTquery expands documents by predicting queries they might answer, then
  appending those predicted queries at indexing time.
- Query2doc shows that LLM-generated expansions can improve retrieval without
  first fine-tuning the base retriever.

Why this fits FetchMoji:

- Your corpus is tiny.
- Index-time work is cheap relative to browser query-time work.
- The user request is specifically about improving the docs/text so search
  better matches example intents.

Inference:

- The right analogue is not query-time pseudo-document generation.
- It is index-time synthetic query generation per emoji or per emoji cluster:
  "what would a real person type to find this emoji?"

This should be treated as candidate generation, not as truth.

### 5. Fine-tuning rerankers or embedding models has a much higher data bar than corpus expansion

Confirmed from Sentence Transformers guidance:

- Cross-encoders generally perform better than bi-encoders as rerankers, but are
  slower and usually belong in a second-stage rerank stack.
- Training guidance emphasizes the need for query-answer pairs and strong hard
  negatives.

Implication:

- If you do not yet have a larger, trustworthy query -> relevant emoji dataset,
  then model fine-tuning is likely premature.
- For this repo's browser-first UX, a query-time reranker is especially hard to
  justify unless the first-stage retrieval is already strong and the eval set is
  mature enough to prove the reranker helps.

### 6. If you do swap models later, the realistic browser-friendly path is still conservative

Confirmed from current and candidate model docs:

- `Supabase/gte-small` is English-only and supports browser usage through
  Transformers.js-compatible variants.
- `Xenova/multilingual-e5-small` exists as a Transformers.js ONNX model.
- `BAAI/bge-m3` is powerful because it supports dense, sparse, and multi-vector
  retrieval, but its practical integration story is much more server/offline
  shaped than this repo's lightweight client-side setup.

Inference:

- If multilingual semantic search becomes important, `multilingual-e5-small` is
  the most realistic next browser migration.
- `bge-m3` is more interesting as an offline research/reference model or a
  future server-side system than as the next immediate browser runtime for this
  repo.

### 7. Hybrid lexical + vector retrieval is still worth keeping on the table, but only as a complement

Confirmed from practitioner guidance:

- Simon Willison's notes on hybrid SQLite search highlight Reciprocal Rank
  Fusion as the practical way to combine FTS and vector matches when the scores
  are not directly comparable.

Important local caveat:

- Your current hybrid variants did not beat pure vector on the present eval
  set.

Inference:

- That does not mean exact-match lexical signals are useless.
- It more likely means the eval set is still narrow and the lexical layer is not
  yet fed with strong enough aliases.
- If you add a richer alias store for exact names, categories, abbreviations,
  and short intent phrases, a lightweight lexical boost or exact-match override
  may still help on the class of misses that look name-shaped rather than purely
  semantic.

## Best Tooling For This Repo

### Option A: Offline corpus expansion + automated acceptance gates

This is the recommended path.

Suggested components:

- Source ingestion:
  - CLDR names and keywords
  - Signal custom tags or a similar curated custom-tag layer
  - current `emojiIntents`
  - future intent-page body copy and examples
- Candidate generator:
  - an offline script that asks an LLM for short user-like search phrases per
    emoji or per emoji cluster
  - examples:
    - "what someone types"
    - "reaction phrase"
    - "when to send this"
    - "social/slang variant"
  - keep outputs short and search-like, not paragraph-like
- Candidate QA:
  - dedupe and tokenize
  - semantic drift scoring against the canonical emoji/intents
  - experiment-runner regression checks
- Admission rule:
  - only admit candidates that preserve or improve the held-out metrics
  - reject candidates that mostly add generic high-frequency noise

Why it wins:

- Best fit with the current architecture.
- Lowest runtime risk.
- Easy to audit and roll back.
- Improves both current known intents and long-tail search coverage.

### Option B: Add an exact alias layer beside dense search

Recommended as a complement, not a replacement.

Good targets:

- literal emoji names
- category-like terms
- common abbreviations
- emoji-composition phrases like `heart exclamation`
- high-confidence custom aliases such as `zany face`

Implementation shape:

- store aliases separately with source metadata and confidence
- use a small FTS/exact-match lookup or a boost table before or alongside vector
  ranking
- combine carefully; do not let noisy aliases dominate

Why this is attractive:

- The miss list contains several queries that look better served by exact alias
  coverage than by denser semantics alone.

### Option C: Train a reranker or fine-tune the embedding model

Defer this for now.

Why:

- Higher data requirement
- higher maintenance cost
- worse fit for browser latency and bundle constraints
- harder to debug than corpus edits

This becomes sensible only after:

- you have a substantially larger labeled eval set
- corpus expansion hits diminishing returns
- you can prove the reranker helps on real failures without damaging latency

### Option D: Swap to a more advanced multilingual / hybrid model

Only do this when the product requirement is explicit.

Use cases that would justify it:

- real multilingual search demand
- a decision to support multiple locales in one runtime
- evidence that the current English-only model is now the main blocker

Near-term best candidate:

- `Xenova/multilingual-e5-small`

Deferred research candidate:

- `BAAI/bge-m3` if you later want unified dense + lexical + multi-vector
  retrieval in a different runtime architecture

## What Works

- Keep each emoji doc compact and search-oriented.
- Prefer phrase- and token-level additions over long generated prose.
- Generate multiple short candidate phrasings, then select aggressively.
- Separate evergreen aliases from fast-moving trend aliases.
- Store source metadata for every alias:
  - `source`
  - `sourceType`
  - `locale`
  - `confidence`
  - `addedAt`
  - optional `expiresAt`
- Expand the eval set before making bigger model decisions.
- Use the existing held-out split as a foundation, but add more phrase-level
  tests that reflect how users actually search for emoji.

## What To Avoid

- Treating LLM-generated search text as trustworthy by default.
- Shipping long generated descriptions because they "sound smart."
- Fine-tuning the retriever before improving the corpus and the eval set.
- Mixing evergreen intent aliases and temporary trend terms into one flat list.
- Assuming hybrid search failed in principle when the current lexical alias
  layer is still thin.

## Recommendation

Build an "auto-research" pipeline for emoji search, but keep it narrow and
auditable:

1. Ingest better base tags.
2. Generate short search candidates offline.
3. Score those candidates.
4. Rebuild the corpus.
5. Run retrieval experiments.
6. Admit only the winning candidates.

Concretely, the best next tooling for this repo is:

- a new candidate-generation script that emits structured search phrases for
  each emoji
- an alias store with provenance and confidence
- a scoring step that reuses `embeddinggemma_similarity.py`
- an expanded version of `run-emoji-experiments.ts` as the acceptance gate

If the goal is "improve all searching", this path is better than jumping
straight to model fine-tuning because it improves the actual shipped search
documents, keeps the browser runtime stable, and gives you an explainable way to
grow beyond the current hand-authored intent list.

## Missing Information

The main thing still missing is real user query data.

If you later get even a modest set of anonymized production queries, the best
upgrade would be:

- cluster them
- label successful vs. failed emoji matches
- mine high-value missing aliases
- use those to expand the held-out benchmark

That would tighten both the candidate-generation prompts and any future
fine-tuning work.

## Source Links

### Repo-local

- `README.md`
- `src/utils/emojiSearchDocs.ts`
- `src/data/emojiIntents.ts`
- `scripts/build-sqlite-db.ts`
- `scripts/run-emoji-experiments.ts`
- `scripts/embeddinggemma_similarity.py`
- `src/artifacts/experiments/emoji-search-experiments-2026-03-28.json`
- `docs/research/trending-term-sources-and-multilingual-emoji-search-2026-03-30.md`
- `docs/research/ios-emoji-keyboard-friction-and-vocabulary-gaps-2026-03-29.md`

### External

- Unicode CLDR emoji names and keywords:
  https://cldr.unicode.org/translation/characters/short-names-and-keywords
- Unicode CLDR annotations charts:
  https://www.unicode.org/cldr/charts/latest/annotations/index.html
- Unicode CLDR annotations overview:
  https://www.unicode.org/cldr/charts/40/annotations/artificial.html
- Unicode CLDR 46 release note:
  https://cldr.unicode.org/downloads/cldr-46
- UTS #51 Unicode Emoji:
  https://www.unicode.org/reports/tr51/
- Signal emoji search index:
  https://github.com/signalapp/emoji-search-index
- Promptagator paper:
  https://arxiv.org/abs/2209.11755
- docTTTTTquery repository:
  https://github.com/castorini/docTTTTTquery
- Query2doc paper:
  https://arxiv.org/abs/2303.07678
- Sentence Transformers semantic search docs:
  https://www.sbert.net/examples/sentence_transformer/applications/semantic-search/README.html
- Sentence Transformers cross-encoder usage:
  https://sbert.net/docs/cross_encoder/usage/usage.html
- Sentence Transformers training overview:
  https://www.sbert.net/docs/cross_encoder/training_overview.html
- Supabase GTE small model card:
  https://huggingface.co/Supabase/gte-small
- Xenova multilingual-e5-small model card:
  https://huggingface.co/Xenova/multilingual-e5-small
- BGE-M3 model card:
  https://huggingface.co/BAAI/bge-m3
- Simon Willison on hybrid SQLite FTS + vector search:
  https://simonwillison.net/2024/Oct/4/hybrid-full-text-search-and-vector-search-with-sqlite/
