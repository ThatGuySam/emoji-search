# Search Query To Pick Logging Setup

Date: 2026-04-01

## Original Prompt

> Create a plan file to create a log setup so that we can capture what people
> search vs end up picking starting with a online research session. We'll
> execute the plan later

## Goal

Create a privacy-aware logging setup that captures:

- what users search for
- what result set they saw or narrowed to
- which emoji they ultimately picked or copied
- enough context to measure search success, failure, and abandonment

The first execution stage must be an online research session that evaluates the
best-fit logging architecture for this repo.

## Non-Goals

- Do not implement telemetry in this plan.
- Do not quietly change the current public product claim of
  `no telemetry` without an explicit product decision.
- Do not add session replay, broad behavioral surveillance, or pageview-heavy
  analytics by default.
- Do not log raw query text into production storage until privacy, retention,
  consent, and redaction rules are decided.
- Do not block the current search-quality experiment lane on this work.

## Repo Findings

- The app currently advertises `no telemetry` in
  `src/lib/siteMeta.ts`, so any logging rollout needs an explicit copy and
  policy update.
- Search execution is centered in `src/hooks/useEmojiSearch.ts`.
- Result picks happen through `src/components/ResultGrid.tsx`,
  `src/lib/copyEmoji.ts`, and `src/lib/emojiCopySurface.ts`.
- The site already runs behind a Cloudflare Worker in `src/worker.ts` with
  `wrangler.jsonc` checked in, so a first-party ingestion path is feasible.
- There is no existing analytics SDK or event pipeline in the repo today.

## External Research Starting Point

Start with an online research memo that compares, at minimum:

1. Cloudflare Workers Analytics Engine
2. Cloudflare D1 as a bespoke event store
3. PostHog event capture
4. OpenTelemetry-style event modeling as a naming and schema reference

Primary references to review in that research session:

- Cloudflare Workers Analytics Engine docs:
  [developers.cloudflare.com/analytics/analytics-engine](https://developers.cloudflare.com/analytics/analytics-engine/)
- Cloudflare D1 docs:
  [developers.cloudflare.com/d1](https://developers.cloudflare.com/d1/)
- PostHog event capture docs:
  [posthog.com/docs/product-analytics/capture-events](https://posthog.com/docs/product-analytics/capture-events)
- OpenTelemetry event concepts:
  [opentelemetry.io/docs/concepts/signals/events](https://opentelemetry.io/docs/concepts/signals/events/)

Research questions:

- What is the lowest-friction first-party path for high-volume event capture on
  Cloudflare?
- Which tool best supports event-level analysis of `query -> results -> pick`?
- What retention, queryability, and cost tradeoffs matter at FetchMoji scale?
- What privacy controls should be standard for search-query logging?
- When should raw query text be stored versus hashed, redacted, or sampled?

## Decision

Do the work in two explicit phases:

1. Research and design
2. Implementation and rollout

The likely best-fit starting hypothesis is:

- use first-party event ingestion through the existing Cloudflare Worker
- prefer a minimal event model over a large analytics SDK
- keep the schema focused on search and copy intent, not general product
  analytics

But the research session must confirm whether the right sink is:

- Workers Analytics Engine
- D1
- a dual path such as first-party ingestion plus PostHog forwarding

## Rollout Plan

### Stage 1: Online research session

- Create a dated research memo under `docs/research/`.
- Compare Cloudflare-first and third-party options.
- Document privacy, retention, and cost tradeoffs.
- Recommend one storage/query path and one fallback.

Expected artifact:

- `docs/research/search-query-to-pick-logging-setup-YYYY-MM-DD.md`

### Stage 2: Event model and privacy contract

- Define the minimum event set:
  - `search_query_started`
  - `search_results_rendered`
  - `emoji_copied`
  - optional `search_abandoned`
  - optional `zero_results_rendered`
- Define field-level rules for each event:
  - `query_text`
  - `query_length`
  - `results_count`
  - `top_result_ids`
  - `picked_emoji`
  - `picked_name`
  - `latency_ms`
  - `surface`
  - `backend`
  - `locale`
  - `session_id`
- Decide:
  - whether raw query text is stored
  - retention window
  - sampling/redaction rules
  - whether a visible telemetry disclosure or opt-out is required

Expected artifact:

- plan update or companion schema note under `docs/plans/` or `docs/research/`

### Stage 3: Ingestion design

- Choose the ingestion path:
  - browser -> worker -> analytics sink
- Add a dedicated worker route for event ingest.
- Define authentication, abuse limits, and origin checks.
- Decide whether ingestion must be fire-and-forget only.

Implementation candidates:

- `src/worker.ts`
- `wrangler.jsonc`
- a new client logging helper under `src/lib/` or `src/utils/`

### Stage 4: Client instrumentation plan

- Instrument search lifecycle in `src/hooks/useEmojiSearch.ts`.
- Instrument result picks in:
  - `src/components/ResultGrid.tsx`
  - `src/lib/copyEmoji.ts`
  - `src/lib/emojiCopySurface.ts`
- Ensure events are deduped so rapid typing or repeated renders do not explode
  event volume.

Key design rule:

- log meaningful settled search states, not every keystroke by default

### Stage 5: Storage and query design

- Define a queryable shape for answering:
  - what people search
  - what they pick
  - where they get no useful result
  - which queries produce a pick outside the top N
  - which queries are searched often but never end in a pick
- Design lightweight derived views or scheduled rollups if needed.

Expected outputs:

- top `query -> picked emoji` pairs
- high-volume no-pick queries
- high-volume multi-pick ambiguous queries
- candidates for search-corpus expansion and benchmark additions

### Stage 6: Product and policy update

- Update user-facing copy that currently says `no telemetry`.
- Add a short explanation of what is logged and why.
- Decide whether this belongs in:
  - `src/lib/siteMeta.ts`
  - `/about/`
  - a privacy page or policy document

### Stage 7: Verification and dry-run

- Validate client event emission locally.
- Validate worker ingestion shape and origin controls.
- Confirm event dedupe under rapid repeated searches.
- Confirm copied emoji events join cleanly with search-session context.
- Write a verification note under `docs/verification/`.

## Validation Gates

- Research memo exists and recommends a storage/query path.
- Event schema is explicit before implementation starts.
- No rollout proceeds until product copy and privacy implications are reviewed.
- Client instrumentation proves:
  - one settled search emits one search event
  - one copy emits one pick event
  - search and pick can be joined by a session identifier
- A verification note exists for the implemented path before enabling it in
  production.

## Risks And Open Questions

- Logging raw queries may conflict with the current privacy positioning of the
  product.
- Query text can contain sensitive user-entered content, so redaction may be
  required.
- A naive keystroke-level event stream will be noisy, costly, and low-value.
- Third-party analytics may be faster to adopt but weaker on privacy posture.
- Workers Analytics Engine may be the easiest operational fit, but the research
  pass needs to confirm whether its query model is sufficient for
  `query -> pick` analysis.
- D1 may offer easier relational joins, but event-write volume and operational
  complexity need validation.
