# Emoji Search Editorial Corpus Experiment

Date: 2026-04-01

## Original Prompt

> Let's setup and start the expirement.
>
> Use the omx tooling/skills

## Goal

Start a durable, experiment-first lane for improving emoji search by testing
whether intent-page editorial phrasing improves retrieval quality when added to
the offline corpus.

## Non-Goals

- Do not ship new runtime ranking behavior yet.
- Do not swap the embedding model yet.
- Do not introduce live LLM generation into the browser or build.
- Do not treat the current intent pages as the final long-tail alias source.

## Decision

The experiment now has two phases:

1. Phase 1 established the lane:
   - extract editorial phrases from existing intent pages
   - add an experiment-only corpus variant
   - measure it against the current baseline
2. Phase 2 will tighten alias admission and rerun the same gate until the
   editorial variant beats the baseline on the metrics that matter.

Phase 1 result:

- the experiment infrastructure worked
- the first editorial corpus variant regressed against the baseline
- the next step is stricter filtering, not rollout

The current working decision is:

1. Keep the experiment lane active and offline-only.
2. Treat intent-page copy as a candidate source, not a trusted source.
3. Prefer short query-like aliases over editorial framing labels.
4. Promote nothing into the shipped SQLite/browser corpus until the variant
   clearly beats `humanized_plus_tokens`.

This preserves the acceptance gate in the existing experiment harness while
using repo-owned content as a safe first source of candidates.

## Rollout Plan

### Stage 1: Durable setup and baseline capture

- Record the experiment plan under `docs/plans/`.
- Keep the project OMX setup in `user` scope and use OMX-native workflow
  surfaces where they work.
- Record the baseline metrics from the current best control corpus.

### Stage 2: First editorial extraction pass

- Add a helper that reads intent-page markdown and builds an
  `emoji -> editorial aliases[]` map.
- Add an experiment-only corpus variant and run the full relevance harness.
- Save verification notes and compare the result to the current best baseline.

### Stage 3: Tighten alias admission

- Remove generic framing labels such as `default pick`, `balanced pick`,
  `softer pick`, and similar editorial scaffolding.
- Keep only aliases that look like search input:
  - short situational phrases
  - direct tone descriptors
  - compact query-like summaries
- Consider separate confidence buckets for:
  - exact aliases
  - tone descriptors
  - explanatory phrases

### Stage 4: Rerun and compare

- Rerun the same experiment matrix without changing the evaluation task.
- Compare the revised editorial variant against:
  - `humanized_plus_tokens__vector_float_raw`
  - `humanized_plus_tokens__vector_int8_raw`
  - the current top hybrid variants

### Stage 5: Expand candidate sources only if filters work

- If the stricter editorial pass helps, expand candidate sources to:
  - more intent-page copy
  - curated custom alias files
  - later, model-generated candidate phrases with acceptance gates
- If the stricter editorial pass still regresses, pause source expansion and
  revisit the extraction model.

## Validation Gates

- `pnpm test --run src/data/emojiIntents.test.ts src/utils/emojiSearchDocs.test.ts src/utils/intentPageEditorialKeywords.test.ts`
- `bun scripts/run-emoji-experiments.ts`
- Compare the editorial corpus variant against
  `humanized_plus_tokens__vector_float_raw`
- Do not promote an editorial variant that only improves manual queries while
  regressing on overall relevance

## Risks And Open Questions

- Markdown heuristics may over-extract generic phrases from editorial copy.
- Current intent pages cover only a narrow slice of the search space, so the
  first experiment may help known-intent neighborhoods more than the long tail.
- Editorial phrasing may be useful for search-page UX without being useful for
  retrieval docs, so those two uses should stay decoupled.
- If stricter filtering still fails, the next move may be a curated alias file
  rather than looser extraction or immediate LLM generation.
