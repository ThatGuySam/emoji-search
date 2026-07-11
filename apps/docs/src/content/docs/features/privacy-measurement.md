---
title: Privacy & measurement
description: FetchMoji measures acquisition and activation without transmitting queries, messages, page content, or a behavioral profile.
sidebar:
  badge:
    text: Planned
    variant: note
---

## SBC4

- `Tease:` Measure whether FetchMoji works without learning what the user is saying.
- `Lede:` Lifecycle events are allowlisted and exclude queries, messages, page content, emoji identity, and behavioral profiles.
- `Why it matters:` Growth measurement cannot contradict the product's strongest privacy distinction.
- `Go deeper:` The prohibited inputs and telemetry-policy question are the critical review points.

Privacy and measurement share one contract: the product can learn whether the
experience works without learning what the person is trying to say.

## Behavior

1. Public copy states: **Search text and ranking stay on your device.**
2. The privacy page lists every networked service and the fields it receives.
3. Allowed product events describe lifecycle milestones only: landing, search
   ready, results shown, copy action, and return use.
4. Events contain no query, message text, surrounding webpage content, emoji
   identity, or stable cross-site identifier.
5. Search Console, Bing Webmaster Tools, extension-store reporting, and aggregate
   CDN logs provide acquisition evidence without changing the query boundary.
6. If optional browser performance analytics remain enabled, the site discloses
   them and the copy does not claim “no telemetry.”

## Inputs & outputs

- **Inputs:** allowlisted lifecycle event name, coarse surface, coarse locale,
  artifact version, and duration bucket when needed for performance.
- **Outputs:** aggregate counts and funnels by day and acquisition surface.
- **Prohibited inputs:** query text, result content, copied emoji, URL of the page
  where an extension opens, message content, or user-generated identifiers.

## States & edge cases

- **Analytics unavailable or blocked:** search and copy work normally.
- **Do Not Track or equivalent preference:** optional first-party lifecycle
  events remain disabled when the selected measurement implementation supports
  the signal.
- **Offline:** no event queue stores sensitive interaction detail for later
  upload; aggregate counters may be discarded.
- **Accidental prohibited field:** schema validation rejects the event before
  transport and records a local development error.
- **Privacy-copy drift:** deployment checks compare the declared services with
  observed production requests before release.
- **Child or shared device:** no account, profile, or query history is created.

## Data shape

```ts
type ProductEventName =
  | "landing_view"
  | "search_ready"
  | "results_shown"
  | "emoji_copied"
  | "return_visit"

type ProductEvent = {
  name: ProductEventName
  occurredAtDay: string
  surface: "web" | "extension" | "intent-page"
  localeGroup?: string
  artifactVersion?: string
  durationBucket?: "under-1s" | "1-3s" | "3-10s" | "over-10s"
}
```

## Decisions

- **2026-07-11 — Query text is never an analytics field.** Measurement cannot
  weaken the architectural privacy promise.
- **2026-07-11 — Absolute “no telemetry” wording is retired unless all browser
  telemetry is actually disabled.** Public language must match observed traffic.

## Open questions

- Is “no telemetry of any kind” a hard product principle, requiring Cloudflare
  Browser Insights to be disabled, or is disclosed anonymous performance RUM
  acceptable?
- Which activation metric is primary: first copied emoji, repeated copy use, or
  successful search followed by copy?
