---
title: Agent discovery
description: FetchMoji uses crawlable answers and semantic interaction states so search engines, answer engines, and browser agents can understand it.
sidebar:
  badge:
    text: Planned
    variant: note
---

## SBC4

- `Tease:` Agent visibility starts with a clear public web product.
- `Lede:` Server-rendered answers, crawler policy, semantic controls, and accessible states serve search engines, answer engines, and browser agents.
- `Why it matters:` Special AI files cannot rescue thin content or an ambiguous interaction tree.
- `Go deeper:` Review crawler separation and the unresolved API boundary.

Agent discovery is an outcome of a clear public web product. The site exposes
its value, answers, and interaction states through ordinary HTML and crawler
policy rather than relying on an AI-specific optimization trick.

## Behavior

1. The homepage renders a descriptive title, H1, one-sentence privacy boundary,
   and three real query/result examples in initial HTML.
2. Intent pages render the complete answer and descriptive internal links
   without requiring JavaScript.
3. `robots.txt` declares the sitemap and keeps search-crawler policy separate
   from model-training policy.
4. OAI-SearchBot, PerplexityBot, Googlebot, and Bingbot receive the same public
   content a human receives unless an independently documented policy changes.
5. Interactive elements use native inputs, buttons, links, labels, names, and
   visible states reflected in the accessibility tree.
6. ChatGPT referrals are measurable through their documented source parameter
   without capturing query content.

## Inputs & outputs

- **Inputs:** public page content, crawl policy, canonical URL, locale alternates,
  sitemap membership, and semantic interaction metadata.
- **Outputs:** indexable HTML, stable links, unambiguous crawler responses, and an
  accessibility tree browser agents can use.
- **Not an output:** a promise that any search or answer engine will rank, cite,
  or execute the site.

## States & edge cases

- **Crawler blocked by WAF:** log the verified bot failure, validate the official
  IP source, and adjust the allow rule without weakening general bot protection.
- **JavaScript unavailable:** public explanations and intent answers remain
  useful; interactive semantic ranking is unavailable.
- **Private or arbitrary query URL:** keep noindexed and out of the sitemap.
- **Training opt-out:** disallow the named training crawler independently while
  preserving search-crawler access.
- **Unsupported agent action:** expose no fake affordance; a read-only public API
  is absent until its privacy and operating model are decided.
- **`llms.txt` absent on the product site:** no error is shown and no SEO claim is
  made; the docs site has its own machine-readable spec for builders.

## Data shape

```ts
type CrawlerPolicy = {
  userAgent: string
  purpose: "search" | "user-fetch" | "training"
  allow: string[]
  disallow: string[]
  verifiedAt: string
}

type CrawlableExample = {
  query: string
  emoji: string
  toneLabel: string
  intentPageUrl: string
}
```

## Decisions

- **2026-07-11 — Foundational SEO is the agent-search baseline.** Useful,
  server-rendered content and semantic structure outrank special AI files.
- **2026-07-11 — Search access and training access are separate policies.** A
  training opt-out must not accidentally remove ChatGPT or Perplexity search
  visibility.

## Open questions

- Is there demonstrated partner or agent demand for a read-only search API?
- If an API exists, can it preserve the privacy promise, or must it be positioned
  as an explicit networked alternative to local search?
