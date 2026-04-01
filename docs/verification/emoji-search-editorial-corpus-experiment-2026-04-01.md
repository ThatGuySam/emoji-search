# Emoji Search Editorial Corpus Experiment Verification

Date: 2026-04-01

Status: `verified`

## Commands

- `pnpm test --run src/data/emojiIntents.test.ts src/utils/emojiSearchDocs.test.ts src/utils/intentPageEditorialKeywords.test.ts`
  - status: `passed`
- `pnpm test --run src/data/emojiIntents.test.ts src/data/curatedEditorialAliases.test.ts src/utils/emojiSearchDocs.test.ts src/utils/intentPageEditorialKeywords.test.ts`
  - status: `passed`
- `bun scripts/run-emoji-experiments.ts`
  - status: `passed`

## Artifacts

- plan:
  `docs/plans/emoji-search-editorial-corpus-experiment-2026-04-01.md`
- verification:
  `docs/verification/emoji-search-editorial-corpus-experiment-2026-04-01.md`
- experiment results:
  `src/artifacts/experiments/emoji-search-experiments-2026-04-01.json`
  `src/artifacts/experiments/emoji-search-experiments-2026-04-01-gte_small_en.json`
  `src/artifacts/experiments/emoji-search-experiments-2026-04-01-gte_small_en-google-suggest.json`

## What Was Verified

- The repo now has a durable plan for the editorial corpus experiment.
- Intent-page markdown can be parsed into an editorial alias map.
- The extractor currently adds editorial aliases for `21` emoji docs.
- The experiment harness now includes an editorial corpus variant:
  `humanized_editorial_plus_tokens`.
- The experiment harness executed end-to-end and wrote a fresh artifact for
  `2026-04-01`.

## Result Summary

### First pass: broad editorial extraction

Baseline control:

- `humanized_plus_tokens__vector_float_raw`
  - rank: `10`
  - all `nDCG@10`: `55.07%`
  - all `Hit@3`: `68.48%`
  - manual `nDCG@10`: `60.61%`
  - heldout `nDCG@10`: `39.37%`

New editorial variant:

- `humanized_editorial_plus_tokens__vector_float_raw`
  - rank: `19`
  - all `nDCG@10`: `52.81%`
  - all `Hit@3`: `67.39%`
  - manual `nDCG@10`: `57.55%`
  - heldout `nDCG@10`: `39.37%`

Hybrid comparison:

- `humanized_plus_tokens__hybrid_rrf_equal`
  - rank: `3`
  - all `nDCG@10`: `55.87%`
- `humanized_editorial_plus_tokens__hybrid_rrf_equal`
  - rank: `15`
  - all `nDCG@10`: `54.47%`

## Key Observation

The experiment infrastructure is working, but this first editorial alias pass is
not a winning corpus. It hurts the baseline on overall and manual relevance
while leaving held-out performance effectively unchanged.

### Second pass: high-confidence editorial aliases only

Second pass control:

- `humanized_plus_tokens__vector_float_raw`
  - rank: `12`
  - all `nDCG@10`: `55.07%`
  - manual `nDCG@10`: `60.61%`

Second pass editorial variant:

- `humanized_editorial_plus_tokens__vector_float_raw`
  - rank: `18`
  - all `nDCG@10`: `54.10%`
  - manual `nDCG@10`: `59.29%`

Second pass hybrid comparison:

- `humanized_plus_tokens__hybrid_rrf_equal`
  - rank: `3`
  - all `nDCG@10`: `55.87%`
- `humanized_editorial_plus_tokens__hybrid_rrf_equal`
  - rank: `7`
  - all `nDCG@10`: `55.24%`

### Comparison

- The second pass materially improved the editorial variant over the first pass.
- It reduced the gap to the baseline, especially on the hybrid variants.
- It still did **not** beat the control corpus on overall relevance.

## Interpretation

The original extraction heuristics were too broad. Labels such as
`default pick` and long editorial tone phrases added noise faster than signal.

The stricter second pass is directionally correct:

- it kept only `8` high-confidence editorial alias docs
- it improved the editorial corpus metrics
- it preserved the experiment lane without touching the shipped search corpus

But the current editorial variant is still not strong enough to justify
promotion into production search docs.

This means the next iteration should be a stricter filter, not a rollout:

- prefer expanding only the high-confidence bucket
- add more short query-like phrases from curated sources
- keep confidence buckets so broader editorial text stays available for later
  experiments without polluting the default experiment corpus

### Third pass: curated short aliases

Curated control:

- `gte_small_en__humanized_plus_tokens__vector_float_raw`
  - rank: `16`
  - all `nDCG@10`: `55.07%`
  - manual `nDCG@10`: `60.61%`

Curated variant:

- `gte_small_en__humanized_curated_editorial_plus_tokens__vector_float_raw`
  - rank: `4`
  - all `nDCG@10`: `57.05%`
  - manual `nDCG@10`: `63.29%`

Curated hybrid comparison:

- `gte_small_en__humanized_plus_tokens__hybrid_rrf_equal`
  - rank: `5`
  - all `nDCG@10`: `55.87%`
- `gte_small_en__humanized_curated_editorial_plus_tokens__hybrid_rrf_equal`
  - rank: `1`
  - all `nDCG@10`: `58.91%`

### Comparison

- The curated alias source clearly beats both the control corpus and the
  extracted-editorial corpus.
- The gain is visible in both vector-only and hybrid retrieval.
- Held-out performance stayed flat, which means the lift came from better
  manual and intent coverage, not broader generalization.

## Updated Interpretation

This is the first result in this lane that justifies opening the promotion
gate.

The useful distinction is now clear:

- extracted editorial prose is still too noisy
- curated, short, query-like aliases can materially help retrieval

### Fourth pass: online query proxy from Google autocomplete

External query bundle:

- `src/artifacts/experiments/google-suggest-en-query-bundle-2026-04-01.json`
- `17` English web-sourced `emoji for ...` queries

Control on external bundle:

- `gte_small_en__humanized_plus_tokens__vector_float_raw`
  - localized `Hit@10`: `35.29%`
  - localized `nDCG@10`: `15.26%`

Curated variant on external bundle:

- `gte_small_en__humanized_curated_editorial_plus_tokens__vector_float_raw`
  - localized `Hit@10`: `64.71%`
  - localized `nDCG@10`: `36.36%`

Control hybrid on external bundle:

- `gte_small_en__humanized_plus_tokens__hybrid_rrf_equal`
  - localized `Hit@10`: `29.41%`
  - localized `nDCG@10`: `16.87%`

Curated hybrid on external bundle:

- `gte_small_en__humanized_curated_editorial_plus_tokens__hybrid_rrf_equal`
  - localized `Hit@10`: `70.59%`
  - localized `nDCG@10`: `40.26%`

Interpretation:

- The curated alias source does not just beat the local benchmark.
- It also strongly beats the control corpus on an outside web-demand proxy.
- This makes the promotion review for curated aliases materially easier to
  justify.

## Conclusion

The experiment is set up, running, and now has a cleaner second-pass filter.

The extracted editorial corpus variant should **not** be promoted into the
shipped SQLite/browser corpus yet.

The curated alias corpus variant is now strong enough to justify a separate
promotion review into the shipped search corpus.
