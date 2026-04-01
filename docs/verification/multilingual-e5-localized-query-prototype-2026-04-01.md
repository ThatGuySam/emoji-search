# Multilingual E5 Localized Query Prototype Verification

Date: 2026-04-01

Status: `verified`

## Commands

- `bun scripts/build-multilingual-drafts-from-pages.ts`
  - status: `passed`
- `bun scripts/build-multilingual-autoresearch-seed.ts`
  - status: `passed`
- `bun scripts/build-multilingual-eval-targets.ts`
  - status: `passed`
- `bun scripts/build-multilingual-experiment-queries.ts`
  - status: `passed`
- `bun scripts/run-emoji-experiments.ts --model-profile gte_small_en --query-bundle src/artifacts/autoresearch/multilingual-e5/experiment-queries.json`
  - status: `passed`
- `bun scripts/run-emoji-experiments.ts --model-profile multilingual_e5_small --query-bundle src/artifacts/autoresearch/multilingual-e5/experiment-queries.json`
  - status: `passed`
- `pnpm bench:transformers`
  - status: `passed`
- `VITE_BENCH_PROFILE_ID=multilingual_e5_small VITE_BENCH_DTYPE=q8 pnpm bench:transformers`
  - status: `passed`

## Artifacts

- published-page draft exports:
  - `docs/generated/multilingual/pt-BR/emoji-intents.generated.json`
  - `docs/generated/multilingual/ja-JP/emoji-intents.generated.json`
  - `docs/generated/multilingual/hi-IN/emoji-intents.generated.json`
- auto-research artifacts:
  - `src/artifacts/autoresearch/multilingual-e5/seed.json`
  - `src/artifacts/autoresearch/multilingual-e5/eval-targets.json`
  - `src/artifacts/autoresearch/multilingual-e5/experiment-queries.json`
- experiment results:
  - `src/artifacts/experiments/emoji-search-experiments-2026-04-01-gte_small_en.json`
  - `src/artifacts/experiments/emoji-search-experiments-2026-04-01-multilingual_e5_small.json`

## What Was Verified

- The published localized intent pages can be converted into draft artifacts
  without depending on Claude or EmbeddingGemma.
- The multilingual seed, eval-target, and experiment-query pipeline now has
  real locale input instead of an empty bundle.
- The query bundle includes `30` accepted localized queries:
  - `10` for `pt-BR`
  - `10` for `ja-JP`
  - `10` for `hi-IN`
- The experiment harness can compare `gte_small_en` and
  `multilingual_e5_small` on the same localized query bundle.
- The browser benchmark can compare the two embedding profiles in the same
  WebKit path.

## Key Results

### Localized query quality

Best `gte_small_en` run:

- experiment:
  `gte_small_en__humanized_curated_editorial_plus_tokens__hybrid_rrf_equal`
- localized `Hit@10`: `3.33%`
- localized `nDCG@10`: `3.33%`

Best `multilingual_e5_small` run:

- experiment:
  `multilingual_e5_small__humanized_curated_editorial_plus_tokens__hybrid_rrf_vector_heavy`
- localized `Hit@10`: `23.33%`
- localized `nDCG@10`: not the top nDCG run, but best localized hit rate in the
  top set

Best `multilingual_e5_small` overall summary entry:

- experiment:
  `multilingual_e5_small__humanized_curated_editorial_plus_tokens__hybrid_rrf_equal`
- localized `Hit@10`: `20.00%`
- localized `nDCG@10`: `8.39%`

Interpretation:

- `multilingual_e5_small` is materially better than `gte_small_en` on localized
  query retrieval.
- The gain is real, but the absolute quality is still modest. `20-23%` localized
  `Hit@10` is enough to justify more prototyping, not a production swap.

### Browser cost in WebKit

`gte_small_en` (`Xenova/gte-small`, `int8`):

- cold init: `5624ms`
- warm init: `89ms`
- cold encode: `26ms`
- warm encode average: `10.3ms`

`multilingual_e5_small` (`Xenova/multilingual-e5-small`, `q8`):

- cold init: `16695ms`
- warm init: `452ms`
- cold encode: `32ms`
- warm encode average: `14ms`

Interpretation:

- cold init is roughly `3x` slower with multilingual E5
- warm init is roughly `5x` slower
- steady-state encode is only modestly slower

## Recommendation

- Keep `gte-small` in production for the current live browser path.
- Keep `multilingual-e5-small` as the leading multilingual prototype candidate.
- Do not promote it to production yet.

What should happen next if this prototype continues:

1. Expand the localized query bundle beyond the first `10` intent pages per
   locale.
2. Add locale-aware aliases and localized corpus text, not only localized query
   inputs.
3. Measure the multilingual E5 browser path on a real iPhone before any live
   rollout.

## Remaining Gaps

- The localized query bundle is derived from published pages, not real user
  logs.
- The current prototype tests localized queries against mostly English corpus
  text.
- No real-device iPhone measurement has been collected for the multilingual E5
  runtime yet.
