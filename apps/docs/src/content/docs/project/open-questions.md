---
title: Open questions & decisions
description: The unresolved forks a build agent must ask about, followed by the settled decisions that define the FetchMoji growth spec.
---

## SBC4

- `Tease:` Eight material forks remain open; twelve strategy decisions are settled.
- `Lede:` The page tells a build agent exactly where to ask rather than silently choosing a privacy, performance, localization, or platform policy.
- `Why it matters:` The anti-hallucination surface is only useful when resolved items move out of Open.
- `Go deeper:` Resolve product success and telemetry boundaries before implementation reaches them.

## Open

### Product and success

- What is the primary activation event: first copied emoji, search followed by
  copy, or repeat copy use?
- What cold-load and repeat-load performance budgets define an acceptable search
  experience on the supported low-end device baseline?

### Privacy and measurement

- Is “no telemetry of any kind” a hard requirement, or is disclosed anonymous
  performance RUM acceptable when it cannot contain query or result data?
- Which privacy-safe event transport, if any, is justified beyond aggregate CDN,
  Search Console, Bing, and extension-store reporting?

### Content and localization

- Who owns native review for Japanese, Hindi, and Brazilian Portuguese?
- What evidence threshold retires or consolidates a page?

### Extension and integrations

- Which browser follows Chrome: Firefox or Edge?
- Is there demonstrated demand for a networked read-only API, and how would its
  explicit privacy boundary differ from local search?

## Decided

- **2026-07-11 — The live product remains the baseline; this site specifies its
  next growth iteration.** Planned badges do not claim the current site already
  implements the new behavior.
- **2026-07-11 — Search queries and ranking remain local.** Performance work must
  preserve that boundary.
- **2026-07-11 — Demand-led SEO precedes URL expansion.** Improve pages already
  earning impressions before creating additional phrase variants.
- **2026-07-11 — Native review gates localized advice.** Machine translation
  alone cannot publish tone guidance.
- **2026-07-11 — A Chrome extension is the primary launch object.** It combines
  marketplace discovery with repeat utility.
- **2026-07-11 — Product Hunt is a supporting launch spike.** It follows the
  extension, short demonstrations, and technical story.
- **2026-07-11 — Ordinary semantic web foundations are the agent strategy.**
  Special AI files do not replace useful server-rendered pages and crawler access.
- **2026-07-11 — The deployed Research page is the growth memo's source of
  truth.** The workspace path is a pointer stub, not a second editable copy.
- **2026-07-11 — WXT, TypeScript, and React package the Chrome extension.** The
  choice matches current framework evidence and an existing workspace precedent.
- **2026-07-11 — Website and extension share typed search logic, not a release
  artifact.** Each surface may optimize data packaging while declaring schema
  and ranking compatibility.
- **2026-07-11 — `CHROMEWEBSTORE.md` is required release evidence.** Permission,
  privacy, remote-code, listing, and reviewer facts must follow tested behavior.
- **2026-07-11 — The first extension milestone uses deterministic local keyword
  matching.** This makes the Manifest V3 shell testable without pretending it
  has semantic parity; the shared search contract remains a Phase 2 gate.
