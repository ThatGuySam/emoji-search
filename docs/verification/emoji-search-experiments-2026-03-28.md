# Emoji Search Experiments Verification

Date: 2026-03-28

Status: `partially verified`

## Commands

- `pnpm install`
  - status: `passed`
- `bun scripts/run-emoji-experiments.ts`
  - status: `passed`
- `pnpm exec tsc --noEmit`
  - status: `failed`
  - note: workspace type resolution fails on missing
    `testing-library__jest-dom` type definitions

## Artifacts

- runner: `scripts/run-emoji-experiments.ts`
- results JSON:
  `src/artifacts/experiments/emoji-search-experiments-2026-03-28.json`

## What Was Verified

- The experiment runner executed end-to-end over 40 retrieval variants.
- The run covered 5 corpus variants x 8 scorer variants.
- The run used the real embedding model path from `src/utils/hf.ts`.
- Results were written to a durable JSON artifact in the repo.

## Key Observations

- Best overall:
  `humanized_plus_tokens__vector_float_raw`
- Best overall metrics:
  - `Hit@1`: `50.0%`
  - `Hit@3`: `66.7%`
  - `Hit@10`: `78.3%`
  - `MRR@10`: `0.5993`
  - `nDCG@10`: `0.5312`
- Manual intent queries for the best run:
  - `Hit@1`: `63.9%`
  - `Hit@3`: `83.3%`
  - `Hit@10`: `97.2%`
- `int8` stayed very close to float:
  `humanized_plus_tokens__vector_int8_raw` reached `nDCG@10 0.5227`
- Hybrid `BM25 + vector` variants did not beat exact vector search on this
  dataset.
- Query prompting did not beat raw-query vector search.
- Glyph-only docs were effectively non-functional.

## Remaining Gaps

- No SQLite or HTTP-VFS runtime verification yet.
- No browser-level measurement of range requests, bytes, OPFS persistence, or
  SharedArrayBuffer behavior yet.
- Held-out alias sampling is still somewhat noisy because emoji metadata contains
  generic terms and flag aliases.
