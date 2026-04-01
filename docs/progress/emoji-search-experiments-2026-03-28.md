# Emoji Search Experiments

Date: 2026-03-28

Status: `verified`

- Added a repeatable experiment runner at `scripts/run-emoji-experiments.ts`.
- Ran 40 experiments across 5 corpus variants and 8 scorer variants.
- Saved machine-readable results to
  `src/artifacts/experiments/emoji-search-experiments-2026-03-28.json`.
- Current best configuration:
  `humanized_plus_tokens__vector_float_raw`
- Main takeaways:
  - richer humanized keyword docs beat glyph-only and raw-glyph baselines
  - exact vector search beat hybrid and prompted-query variants
  - `int8` stayed close enough to float to remain a strong SQLite candidate
  - browser/runtime verification for SQLite + HTTP-VFS is still pending
