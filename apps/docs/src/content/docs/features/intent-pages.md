---
title: Intent pages
description: Reviewed phrase pages answer a distinct emoji decision with a fast pick, tone comparison, examples, and search handoff.
sidebar:
  badge:
    text: Planned
    variant: note
---

## SBC4

- `Tease:` Every indexed phrase page must resolve a distinct decision.
- `Lede:` Intent pages lead with a fast pick, compare tone, show context, flag misreadings, and hand off to local search.
- `Why it matters:` Usefulness and review—not URL volume—protect search quality and trust.
- `Go deeper:` Publication states and the `IntentPage` shape define the editorial gate.

Intent pages are the crawlable answer layer. Each page resolves one real phrase
decision and hands the visitor into the interactive search when their exact
wording differs.

## Behavior

1. The visitor lands on a server-rendered page with a unique title, description,
   canonical URL, language declaration, and H1.
2. The page leads with one **Fast pick** that can be copied immediately.
3. A tone comparison explains two to four close alternatives.
4. Three reviewed message examples show the candidates in context.
5. An **Avoid when** note identifies a plausible misreading when one exists.
6. Related intent pages use descriptive links. Alternate language versions use
   reciprocal `hreflang` only when each version is reviewed and published.
7. A prefilled search handoff lets the visitor try their exact line without
   creating an indexable arbitrary-query URL.

## Inputs & outputs

- **Inputs:** an observed query cluster, target locale, reviewed candidate set,
  contextual examples, and evidence/provenance notes.
- **Outputs:** static HTML plus metadata, internal links, copy actions, and a
  local-search handoff.
- **Publication constraint:** a page does not publish merely because a keyword
  or translation exists. It must resolve a distinct decision and pass editorial
  review.

## States & edge cases

- **Draft:** excluded from sitemap and search; visible only in review tooling.
- **Awaiting native review:** cannot publish in the target locale.
- **Published:** canonical, indexable, linked from the relevant hub, and present
  in the sitemap.
- **Low or overlapping value:** merge into the stronger page or keep noindexed;
  do not preserve a weak URL for count alone.
- **Changed interpretation:** update examples and review date; retain the URL
  when the intent remains the same.
- **Locale without an equivalent phrase:** explain the closest natural intent or
  omit the localized page rather than force a literal translation.
- **No meaningful misreading:** omit the warning instead of inventing one.

## Data shape

```ts
type ReviewStatus = "draft" | "native-review" | "published" | "retired"

type IntentPage = {
  id: string
  slug: string
  locale: string
  queryCluster: string[]
  title: string
  description: string
  fastPick: EmojiChoice
  alternatives: EmojiChoice[]
  messageExamples: string[]
  avoidWhen?: string
  relatedIntentIds: string[]
  alternateIntentIds: Partial<Record<string, string>>
  reviewStatus: ReviewStatus
  reviewedBy?: string
  reviewedAt?: string
  sourceNotes: string[]
}

type EmojiChoice = {
  emojiId: string
  emoji: string
  toneLabel: string
  rationale: string
}
```

## Decisions

- **2026-07-11 — Search demand selects the editorial queue.** Existing
  impression-rich pages improve before new phrase variations are added.
- **2026-07-11 — Native review gates localized publication.** Translation alone
  is not evidence that tone advice is correct.

## Open questions

- Who owns native review for Japanese, Hindi, and Brazilian Portuguese?
- What minimum evidence retires or consolidates a page: no impressions, no copy
  actions, overlap with another intent, or a combination?
