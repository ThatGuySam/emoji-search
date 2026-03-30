# FetchMoji Competitor Audit And Site Health Tooling

Tease: The top emoji sites are stronger on brand and breadth than they are on
technical execution.

Lede: FetchMoji does not need to beat incumbents by becoming a bigger emoji
directory. The cleaner opening is to beat them on fast, accessible,
server-rendered intent pages while keeping a small audit stack in CI so the
site does not drift into the same technical debt.

Why it matters:

- The current SERP leaders are leaving obvious gaps in performance,
  accessibility, metadata quality, and page freshness.
- Those gaps are especially visible on long-tail "emoji for X" pages, which is
  the exact surface FetchMoji should own.
- The tooling that catches these failures is good enough to automate locally
  and in GitHub without adding a heavyweight crawler to every commit.

Go deeper:

- Treat `Lighthouse + pa11y + linkinator` as the default blocking health stack.
- Keep `advertools` for periodic competitive crawls and metadata research, not
  per-commit CI.
- Leave `webhint` out of the blocking path for now; it was informative to
  test, but its browser setup was more brittle than the value it added here.

Date: 2026-03-30

## Scope

Audit the strongest existing sites adjacent to FetchMoji, identify where they
are weak, and decide which open-source tooling is worth putting into the repo's
automated health checks.

## Short Answer

The incumbents are beatable on implementation quality.

The pattern from this audit was consistent:

1. Big emoji brands have authority and inventory, but their pages are heavy and
   technically messy.
2. Small utility sites are faster, but often thin, structurally weak, or
   missing basic SEO elements.
3. Long-tail intent pages are the weakest layer in the market: stale URLs,
   broken links, poor accessibility, weak metadata, and low editorial trust.
4. FetchMoji's best move is to ship a smaller set of strong intent pages and
   keep them technically clean with automated checks.

## What The Repo Already Knows

Confirmed from repo-local research and the current build:

- The earlier memo at `docs/research/fetchmoji-seo-llm-discovery-2026-03-30.md`
  already established that phrase-level intent pages are the right SEO wedge.
- The site is still small enough that technical quality is a strategic
  advantage, not just hygiene.
- After adding the local health checks in this pass, the current homepage
  baseline is strong on Lighthouse category scores and passes pa11y with zero
  issues, but it still shows a non-blocking CLS warning that should remain
  visible in CI.

## Competitor Set

SERP sampling on 2026-03-30 focused on these query classes:

- `emoji search`
- `emoji meanings`
- `copy emoji`
- `what emoji is this`
- `emoji for awkward silence`
- `iphone emoji search not working`

Repeated domains from those queries:

- `emojipedia.org`
- `getemoji.com`
- `emojifinder.com`
- `emojidb.org`
- `emojiterra.com`
- `emojilar.com`

## What The Evidence Says

### 1. The big brands are technically weaker than they look

Audit snapshots:

| Site / page | Lighthouse perf | Accessibility | Best practices | SEO | Pa11y issues | Notable weaknesses |
| --- | --- | --- | --- | --- | --- | --- |
| Emojipedia homepage | 0.31 | 0.87 | 0.54 | 0.85 | 15 | No meta description in static fetch, 62 scripts, 404 Apple touch icon, very slow LCP |
| GetEmoji homepage | 0.46 | 0.86 | 0.77 | 0.92 | 134 | Missing meta description, heavy page, repeated unnamed-button issues |
| Emojifinder homepage | 0.85 | 0.40 | 0.77 | 1.00 | 13 | Fast but structurally thin, no canonical, no `h1`, weak internal linking |
| Emojidb "awkward silence" page | 0.28 | 0.86 | 0.54 | 0.82 | 821 | Broken links, repeated unnamed-button issues, weak long-tail page quality |

Interpretation:

- Emojipedia and GetEmoji win because of brand familiarity and breadth, not
  because their implementations are hard to match.
- Emojifinder shows the other extreme: better speed, but almost no content
  depth or structural polish.
- This is good news for FetchMoji. There is room in the market for a site that
  feels smaller but cleaner.

### 2. Long-tail intent pages are where the market is sloppiest

Confirmed examples:

- An `emojilar.com` result surfaced for `emoji for awkward silence`, but a
  direct header fetch returned `404`.
- `emojidb.org`'s intent-style page was the weakest audited page in the set:
  broken links, poor accessibility, and low-quality page structure.
- `emojiterra.com` served a Cloudflare challenge page on static fetches, which
  is itself a crawlability and discovery risk.

Opportunity:

- FetchMoji should assume that the "emoji for X" SERP layer is operationally
  weak and beatable.
- Reliability is part of the product here. A page that keeps ranking, loads
  cleanly, and answers the query directly is already differentiated.

### 3. Metadata discipline is a real gap across competitors

Findings from static extraction and crawl snapshots:

- Emojipedia had no meta description in the fetched HTML.
- GetEmoji also had no meta description in the fetched HTML.
- Emojifinder had neither a canonical URL nor an `h1`.
- The thin utility sites tended to have very little internal-link structure.

Opportunity:

- FetchMoji can outperform by being boringly correct:
  - unique titles
  - useful meta descriptions
  - canonical tags
  - one clear `h1`
  - related-intent internal links
  - pages that stay live once indexed

### 4. Accessibility is a broader weakness than SEO blogs usually admit

Pa11y results were one of the strongest signals in this pass.

- Emojipedia: 15 issues
- GetEmoji: 134 issues
- Emojifinder: 13 issues
- Emojilar awkward page: 18 issues
- Emojidb awkward page: 821 issues

The repeated failures were not exotic. They were things like:

- unnamed buttons
- invalid ARIA usage
- color contrast failures

Opportunity:

- Accessibility is not just compliance polish here. It is a competitive
  weakness across the category.
- Keeping intent pages accessible will improve UX, reduce obvious Lighthouse
  regressions, and make the product feel more trustworthy than the average
  competitor.

### 5. The best open-source stack is smaller than the full research stack

Tooling tested in this pass:

| Tool | What it was good for | CI fit | Decision |
| --- | --- | --- | --- |
| Lighthouse / Lighthouse CI | Score-based health, performance, SEO, best-practices regression checks | High | Put in CI |
| pa11y | Fast accessibility failures with machine-readable output | High | Put in CI |
| linkinator | Broken-link and fragment integrity on the built site | High | Put in CI |
| advertools | Metadata and crawl snapshots across competitor sets | Medium | Research-only |
| webhint | Useful in theory, but browser setup was brittle in this environment | Low | Leave out for now |

Why `advertools` stays out of CI:

- It is excellent for one-off research sweeps.
- It adds Python + Scrapy complexity and does not produce a simple, durable
  per-commit "health score."
- It is more valuable as a monthly or quarterly competitive crawl than as a
  blocker on every branch.

Why `webhint` stays out for now:

- It failed in this environment with `No installation found for: "Any supported
  browsers"`.
- Even if fixed, its overlap with Lighthouse and pa11y is high enough that it
  would add more maintenance than leverage right now.

## Recommendation

Use the competitor gap like this:

1. Build a small set of durable phrase-intent pages that answer the query
   directly.
2. Make technical cleanliness part of the product strategy, not just QA:
   speed, accessibility, metadata, and page durability should all be visibly
   better than the category average.
3. Keep the blocking CI stack to `build + linkinator + Lighthouse CI + pa11y`.
4. Run deeper crawler-style research with `advertools` only when doing new
   market sweeps or auditing a batch of planned landing pages.

## Local Baseline After CI Setup

Current FetchMoji homepage baseline on `http://127.0.0.1:4173/`:

- Lighthouse performance: `0.87`
- Lighthouse accessibility: `1.00`
- Lighthouse best practices: `0.96`
- Lighthouse SEO: `1.00`
- Largest Contentful Paint: `2408.80 ms`
- Total Blocking Time: `17.5 ms`
- Cumulative Layout Shift: `0.2146` (warning only, not blocking)
- Pa11y issues: `0`

This is already a stronger technical starting point than much of the category.

## Source Links

Competitors and audited pages:

- [Emojipedia](https://emojipedia.org/)
- [GetEmoji](https://getemoji.com/)
- [Emojifinder](https://emojifinder.com/)
- [Emojidb awkward silence page](https://emojidb.org/awkward-silence-emojis)
- [EmojiTerra](https://emojiterra.com/)

Tooling and docs:

- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Pa11y](https://github.com/pa11y/pa11y)
- [Linkinator](https://github.com/JustinBeckwith/linkinator)
- [advertools crawl docs](https://advertools.readthedocs.io/en/master/advertools.spider.html)
- [Playwright browser installation docs](https://playwright.dev/docs/browsers)
- [webhint user guide](https://webhint.io/docs/user-guide/)
