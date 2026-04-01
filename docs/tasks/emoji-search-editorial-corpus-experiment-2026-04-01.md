# Emoji Search Editorial Corpus Experiment Tasks

Date: 2026-04-01
Plan source:
`docs/plans/emoji-search-editorial-corpus-experiment-2026-04-01.md`

## Task 01: Durable experiment lane and baseline artifact

- Status: `completed`
- Outcome: the repo has a research memo, experiment plan, and verification note
  for the editorial corpus lane.
- Write scope: `docs/research/**`, `docs/plans/**`, `docs/verification/**`.
- Verification: artifact review.

## Task 02: First editorial alias extraction pass

- Status: `completed`
- Outcome: intent-page markdown is parsed into an experiment-only editorial
  alias map and a new corpus variant exists in the relevance harness.
- Write scope: `scripts/lib/intentPageEditorialKeywords.ts`,
  `scripts/run-emoji-experiments.ts`,
  `src/utils/intentPageEditorialKeywords.test.ts`.
- Verification: `pnpm test --run src/utils/intentPageEditorialKeywords.test.ts`,
  `bun scripts/run-emoji-experiments.ts`.

## Task 03: Baseline vs. editorial variant comparison

- Status: `completed`
- Outcome: the first editorial variant has been measured against the current
  control corpus and documented as a regression, not a rollout candidate.
- Write scope: `src/artifacts/experiments/**`, `docs/verification/**`.
- Verification: inspect
  `src/artifacts/experiments/emoji-search-experiments-2026-04-01.json` and the
  verification note.

## Task 04: Tighten editorial alias admission

- Status: `completed`
- Outcome: the extractor keeps short query-like aliases and rejects generic
  editorial framing labels.
- Write scope: `scripts/lib/intentPageEditorialKeywords.ts`,
  `src/utils/intentPageEditorialKeywords.test.ts`.
- Verification: `pnpm test --run src/utils/intentPageEditorialKeywords.test.ts`.

## Task 05: Add alias buckets or confidence levels

- Status: `completed`
- Outcome: extracted aliases are categorized so experiment corpora can include
  only high-signal buckets.
- Write scope: `scripts/lib/intentPageEditorialKeywords.ts`,
  `scripts/run-emoji-experiments.ts`, optional `docs/plans/**`.
- Verification: targeted unit test plus `bun scripts/run-emoji-experiments.ts`.

## Task 06: Rerun the editorial corpus experiment

- Status: `completed`
- Outcome: the revised editorial variant is re-measured against the same
  baseline and remains an iteration candidate, not a rollout candidate.
- Write scope: `src/artifacts/experiments/**`, `docs/verification/**`.
- Verification: `bun scripts/run-emoji-experiments.ts`.

## Task 07: Promotion gate for shipped corpus

- Status: `pending`
- Outcome: a clear go/no-go decision exists for whether any editorial aliases
  should be added to the shipped browser corpus.
- Write scope: `src/utils/emojiSearchDocs.ts`,
  `src/utils/emojiSearchDocs.test.ts`, `scripts/build-sqlite-db.ts`,
  `docs/verification/**`.
- Verification: `pnpm test --run src/utils/emojiSearchDocs.test.ts`,
  `bun scripts/run-emoji-experiments.ts`, optional `pnpm seed:sqlite` if the
  experiment wins.

## Task 08: Candidate-source expansion after a win

- Status: `completed`
- Outcome: additional sources such as curated alias files or model-generated
  candidate phrases are only explored after the stricter editorial pass proves
  beneficial.
- Write scope: `src/data/curatedEditorialAliases.ts`,
  `src/data/curatedEditorialAliases.test.ts`,
  `scripts/run-emoji-experiments.ts`,
  `docs/progress/**`, `docs/verification/**`.
- Verification: `pnpm test --run src/data/curatedEditorialAliases.test.ts`,
  `bun scripts/run-emoji-experiments.ts`.
