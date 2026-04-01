# Multilingual E5 Auto-Research Prototype Plan

Date: 2026-04-01

## Original Prompt

> Research if there's a better embedding model for our use case. Something
> that's multilingual
>
> Put together a plan to test it out using autorearch

## Goal

Design the smallest durable prototype plan to test whether
`Xenova/multilingual-e5-small` improves FetchMoji's multilingual search quality
enough to justify its browser cost, using an offline auto-research lane to
generate multilingual aliases, candidate queries, and eval sets before any live
runtime rollout.

## Non-Goals

- Do not ship a production model swap in this plan.
- Do not fine-tune model weights.
- Do not add server-side inference or a hosted reranker.
- Do not auto-publish multilingual content or aliases without review.
- Do not treat EmbeddingGemma as the live runtime candidate for this lane.

## Repo Findings

- The live search stack still uses `Xenova/gte-small`, `384d`, and `int8` via
  `src/constants.ts`, with browser inference going through the Transformers.js
  `feature-extraction` path in `src/utils/hf.ts` and `src/utils/worker.ts`.
- The shipped SQLite and PGlite paths assume `384`-dimension embeddings in
  `src/utils/db.ts`, `src/utils/sqlite.ts`, and `src/utils/pglite.ts`.
- `src/utils/emojiSearchDocs.ts` currently builds English-only emoji docs from
  `emojilib` keywords plus the shared intent catalog.
- `scripts/run-emoji-experiments.ts` is the current offline acceptance gate,
  but it is still coupled to `getEncoder()` and the current English query set.
- `scripts/generate-multilingual-drafts.ts` already localizes the shared intent
  catalog for explicit locales and runs EmbeddingGemma QA on the generated
  drafts.
- `docs/research/emoji-search-corpus-expansion-and-auto-research-tooling-2026-04-01.md`
  already recommends a Promptagator / docTTTTTquery-style "auto-research" lane
  for generating candidate search phrases offline.
- `docs/research/multilingual-embedding-model-options-2026-04-01.md` ranks
  `Xenova/multilingual-e5-small` as the best-fit multilingual browser candidate
  and rules out EmbeddingGemma and Qwen3 for the current live iPhone-browser
  architecture.
- A browser benchmark harness now exists through `pnpm bench:transformers`,
  which is the right place to compare cold and warm model costs before any live
  branch rollout.

## External Research

Research that materially changes the plan:

- `docs/research/multilingual-embedding-model-options-2026-04-01.md`
  - `multilingual-e5-small` is the best browser-plausible multilingual
    candidate because it preserves `384d`, is retrieval-oriented, and already
    ships as a Transformers.js ONNX repo.
- `docs/research/emoji-search-corpus-expansion-and-auto-research-tooling-2026-04-01.md`
  - "auto-research" should mean offline candidate generation plus strict
    acceptance gates, not blind runtime generation.
- `docs/research/trending-term-sources-and-multilingual-emoji-search-2026-03-30.md`
  - multilingual semantic retrieval is a separate migration from locale-aware
    aliases, and it should be tested against the current WASM baseline.
- `docs/research/ios-safari-memory-debugging-2026-03-28.md`
  - large ONNX downloads and cold-load memory pressure remain the main iPhone
    risk surface, so the prototype needs a real-device gate before any rollout.

## Decision

Test `Xenova/multilingual-e5-small` in two layers, not one:

1. **Offline auto-research lane**
   - generate multilingual aliases and eval queries for target locales
   - rebuild an experiment corpus with E5-style `query:` / `passage:` shaping
   - compare retrieval quality against the current `gte-small` baseline
2. **Browser prototype lane**
   - switch the runtime model behind a flag
   - rebuild the search corpus for `384d` multilingual E5 embeddings
   - measure startup, warm-query latency, and iPhone memory behavior

This keeps the prototype falsifiable. If multilingual E5 does not clearly beat
the current model on multilingual recall without blowing the browser budget, the
work stops before a full migration.

## Rollout Plan

### Stage 1: Freeze the evaluation target

- Write down the prototype locales and query classes before touching code:
  - `pt-BR`
  - `ja-JP`
  - `hi-IN`
  - mixed-language / transliterated slang cases
- Build a seed eval set from:
  - existing `emojiIntents`
  - current editorial content in `src/content/intent-pages/*.md`
  - current iOS/support content where language-specific phrasing is useful
- Split the eval set into:
  - manual "gold" queries
  - auto-research-generated candidate queries
  - held-out queries for acceptance gating

### Stage 2: Add the auto-research artifact lane

- Create a dedicated script or extend an existing one to emit multilingual
  candidate search phrases per locale from:
  - the shared intent catalog
  - editorial page summaries
  - locale draft outputs from `scripts/generate-multilingual-drafts.ts`
  - CLDR / Signal-style keyword sources where already available locally
- Keep the output reviewable and durable under a repo-local artifact path such
  as `src/artifacts/autoresearch/` or another explicit prototype folder.
- Store provenance per candidate:
  - source intent id
  - locale
  - generation source (`draft`, `editorial`, `cldr`, `manual`)
  - acceptance status

### Stage 3: Make the experiment harness model-aware

- Extend `scripts/run-emoji-experiments.ts` so it can compare at least two model
  profiles:
  - current `gte-small`
  - `multilingual-e5-small`
- Add a model-profile abstraction that captures:
  - model id
  - embedding dimension
  - query prefix
  - document prefix
  - dtype/device assumptions for experiment runs
- Keep `384d` as a hard invariant for this prototype so downstream storage and
  result-comparison logic stay stable.
- Add a corpus variant that includes accepted multilingual auto-research
  phrases, without changing the shipped browser DB yet.

### Stage 4: Rebuild the corpus for the multilingual E5 experiment

- Add an experiment-only document builder that can emit E5-shaped document text:
  - `passage: <emoji doc text>`
- Keep the current English corpus builder intact for baseline comparison.
- Ensure user-side experiment queries are prefixed with `query: ` for E5 runs.
- Re-run the offline experiment matrix and save results to a dated artifact.

### Stage 5: Browser prototype behind a flag

- Add a temporary runtime flag for a multilingual E5 branch of the client-side
  stack.
- Rebuild the SQLite/browser corpus with multilingual E5 embeddings in an
  experiment-only artifact path.
- Keep the production DB/model paths intact and isolate the prototype via:
  - URL flag
  - explicit model/db artifact names
  - non-default search config

### Stage 6: Real-device iPhone validation and go/no-go gate

- Measure:
  - cold init
  - first-search latency
  - warm-query latency
  - model + DB load stability under `?no_cache=1`
  - repeated-query memory behavior on a real iPhone
- Compare the multilingual E5 prototype against current production behavior for:
  - multilingual recall gains
  - startup regression
  - memory headroom
- Stop if the quality gain is marginal relative to the browser cost.

## Validation Gates

Before the browser prototype:

- `pnpm vitest run --project unit`
- targeted tests for the new auto-research artifact generator
- targeted tests for model-profile and E5 prompt formatting
- `bun scripts/run-emoji-experiments.ts` with:
  - current `gte-small` baseline
  - multilingual E5 baseline
  - multilingual E5 + accepted auto-research phrases

Before any live demo branch:

- `pnpm bench:transformers` extended or parameterized to compare:
  - `Xenova/gte-small`
  - `Xenova/multilingual-e5-small`
- `pnpm build`
- a real-device iPhone verification note under `docs/verification/`

Acceptance gate:

- multilingual E5 must materially improve multilingual query recall on the new
  eval set
- startup and memory regressions must stay acceptable for the iPhone-first UX
- the prototype must not require a schema-width change beyond the current
  `384d` assumptions

## Deliverables

- this plan file
- a durable multilingual auto-research artifact set for prototype locales
- a model-aware experiment harness result artifact
- an experiment-only multilingual E5 corpus build path
- a browser flag/path for the multilingual E5 prototype
- a dated verification memo with browser and iPhone measurements

## Risks And Open Questions

- The largest risk is still browser cost, not implementation complexity.
- The current multilingual draft generator localizes editorial intents, but that
  does not automatically produce high-quality search queries; acceptance gating
  is mandatory.
- The current experiment harness is English-shaped today, so its extension work
  may be broader than the model swap itself.
- E5 prompt discipline matters. If `query:` / `passage:` formatting is applied
  inconsistently, the experiment results will be misleading.
- It is still possible that locale-aware aliases on the current English model
  solve most of the practical user need, making a model migration unnecessary.
- Open question: should the prototype DB stay SQLite-only at first to reduce
  moving parts, or should it also rebuild the PGlite path before the iPhone
  gate?

## Sources

- `docs/research/multilingual-embedding-model-options-2026-04-01.md`
- `docs/research/emoji-search-corpus-expansion-and-auto-research-tooling-2026-04-01.md`
- `docs/research/trending-term-sources-and-multilingual-emoji-search-2026-03-30.md`
- `docs/research/ios-safari-memory-debugging-2026-03-28.md`
- `docs/plans/fetchmoji-seo-llm-discovery-rollout-2026-03-30.md`
- `scripts/run-emoji-experiments.ts`
- `scripts/generate-multilingual-drafts.ts`
- `src/utils/emojiSearchDocs.ts`
- `src/utils/hf.ts`
- `src/utils/worker.ts`
- `src/utils/db.ts`
- `src/utils/sqlite.ts`
