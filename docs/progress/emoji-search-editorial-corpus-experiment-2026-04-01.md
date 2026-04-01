# Emoji Search Editorial Corpus Experiment

Date: 2026-04-01

Status: `in progress`

- Executed the next `agent-workflow` loop after planning and task slicing.
- Tightened the intent-page editorial extractor so it now keeps only
  high-confidence query-like aliases by default.
- Added confidence buckets to the extractor for future experiment control.
- Fixed a Bun/Node cache-environment bug in `src/utils/hf.ts` so
  `bun scripts/run-emoji-experiments.ts` runs reliably outside the browser.
- Reran the relevance matrix and saved the refreshed artifact to
  `src/artifacts/experiments/emoji-search-experiments-2026-04-01.json`.
- Editorial alias coverage shrank from `21` emoji docs in the first pass to `8`
  high-confidence emoji docs in the second pass.
- The second pass improved the editorial variant compared with the first pass,
  especially for hybrid retrieval, but it still trails the
  `humanized_plus_tokens` control.
- Added a curated alias source and saved a profile-scoped experiment artifact to
  `src/artifacts/experiments/emoji-search-experiments-2026-04-01-gte_small_en.json`.
- The curated alias variant is the first experiment in this lane to beat the
  `humanized_plus_tokens` control on both vector-only and hybrid retrieval.
- No editorial aliases have been promoted into the shipped browser corpus yet.

## Current Read

- The tighter filter was directionally correct.
- The extracted editorial corpus is still weaker than the control.
- The curated alias corpus is strong enough to open the promotion gate.
- The next useful move is to review whether the curated alias winner should be
  merged into the shipped corpus builder.
