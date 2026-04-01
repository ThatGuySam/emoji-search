# FetchMoji SEO And LLM Discovery Strategy

Tease: The Apple-keyboard idea is directionally right, but it is too narrow and
slightly framed the wrong way.

Lede: The stronger SEO wedge for FetchMoji is not "emojis that don't work on
the Apple keyboard." It is a curated set of server-rendered, answer-first pages
for phrase-level intent gaps like `emoji for awkward silence`, `emoji for proud
of you`, and `emoji for overthinking`, with a smaller secondary cluster for
iPhone emoji-search troubleshooting.

Why it matters:

- The repo already has evidence that Apple's keyboard and default emoji labels
  miss common social-intent phrasing.
- Google explicitly warns against scaled, low-value content, so this cannot be
  a giant pSEO spray of thin synonym pages.
- LLM discovery mostly rewards the same fundamentals as good SEO, with one
  extra constraint: many AI crawlers still need important content to be visible
  in server-rendered HTML.

Go deeper:

- Start with 20-40 manually curated intent pages from the existing vocabulary
  backlog instead of hundreds of auto-generated pages.
- Treat Apple/iPhone pages as a secondary acquisition cluster, not the core
  content architecture.
- Prioritize crawlable HTML, internal linking, canonical URLs, `robots.txt`,
  sitemap coverage, and clear source/about pages before experimenting with
  things like `llms.txt`.

Date: 2026-03-30

## Scope

Evaluate whether FetchMoji can grow through technical SEO and content SEO built
around emoji-search gaps, especially where Apple's keyboard search fails, and
determine how LLM search changes the strategy.

## Short Answer

This is viable, but only in a narrower and more editorial form than the
original idea implies.

Best version of the strategy:

1. Use Apple keyboard friction as research input, not as the main content
   framing.
2. Build a small set of high-intent pages around real phrase queries users type
   when they cannot find the right emoji.
3. Make those pages genuinely useful: best-match emoji, alternatives,
   explanation, copy action, and related intents.
4. Keep the content server-rendered and text-rich so Google and AI crawlers can
   both consume it.
5. Avoid mass-generated long-tail pages, because Google's current spam policy
   is explicit about scaled low-value content, including AI-generated pages.

## What The Repo Already Knows

Confirmed from local files:

- `README.md` positions FetchMoji as "Find the perfect emoji using your own
  words."
- The roadmap already mentions `SEO/LLM discovery routes (e.g.,
  /emoji-for-attachment)`.
- `docs/research/ios-emoji-keyboard-friction-and-vocabulary-gaps-2026-03-29.md`
  already established that Apple's keyboard has vocabulary and retrieval gaps
  around terms like `awkward`, `yikes`, `cringe`, and phrase-level social
  intent.
- That earlier memo also produced a useful backlog of phrase candidates such as
  `awkward silence`, `secondhand embarrassment`, `proud of you`,
  `overthinking`, `delulu`, and `respectfully`.

Confirmed from the current build and route structure:

- The homepage HTML is server-rendered today, which is good for crawlability.
- The SEO surface is still tiny: one main route, basic title/description/OG
  tags, and no obvious `robots.txt`, sitemap, canonical tag, author/about
  pages, or discovery hub pages.
- That means the current site can be crawled, but it does not yet expose much
  long-tail content for Google or LLMs to discover.

Important reframing:

- The product opportunity is not literally "emojis that do not work on Apple."
- The real gap is "intent phrases Apple's picker does not retrieve well enough"
  plus "support/troubleshooting when native emoji search fails."

## Source Quality Notes

High confidence:

- Repo-local research and local build output
- Google Search Central documentation
- OpenAI crawler documentation
- Google autocomplete endpoint snapshots gathered on 2026-03-30
- Cloudflare's crawler/referral analysis

Medium confidence:

- Vercel + MERJ crawler-behavior analysis
- Aleyda Solis' May 18, 2025 synthesis of AI search traffic trends

Low confidence / mostly discarded:

- HN and Lobsters produced little actionable signal for this question
- Generic SEO blogs were deliberately avoided unless they were backed by
  primary docs or concrete datasets

## What The Evidence Says

### 1. The Apple-keyboard thesis is directionally right, but too support-heavy as a primary SEO bet

Confirmed:

- The prior repo memo already showed that Apple's emoji search experience is
  unreliable enough, language-sensitive enough, and vocabulary-limited enough
  to create a product opportunity.
- Google autocomplete still shows an active support-intent cluster:
  `iphone emoji search not working`, `ios emoji search not working`, and
  `apple emoji search not working`.

Why this matters:

- There is search demand around the failure mode.
- But those searches are support-oriented, and likely skew toward "fix my
  iPhone" rather than "help me choose the right emoji."

Inference:

- Apple/iPhone troubleshooting pages can bring acquisition traffic, but they
  are less aligned with FetchMoji's core value than phrase-intent pages.
- They should be a secondary cluster, not the whole strategy.

### 2. Phrase-level "emoji for X" pages are the better wedge

Confirmed from autocomplete snapshots taken on 2026-03-30:

- `emoji for awkward` suggests `emoji for awkward silence`
- `emoji for awkward silence` appears as its own suggestion
- `emoji for secondhand embarrassment` appears as its own suggestion
- `emoji for delulu` appears as its own suggestion
- `emoji for proud of you` appears as its own suggestion and expands into
  variants like `emoji for proud of yourself` and `emoji for showing support`
- `emoji for overthinking` appears as its own suggestion

Why this matters:

- These are closer to FetchMoji's actual job to be done: users describe a
  social state or message intent, not a Unicode label.
- They map directly onto the product's semantic-search advantage.
- They are also more portable than Apple-specific troubleshooting because they
  apply across iPhone, WhatsApp, desktop, and web behavior.

Inference:

- The best content architecture is a set of intent pages like:
  - `/emoji-for/awkward-silence`
  - `/emoji-for/proud-of-you`
  - `/emoji-for/overthinking`
  - `/emoji-for/delulu`
- Each page should solve the query directly instead of only embedding the app.

### 3. Google will tolerate AI assistance, but not scaled thin content

Confirmed from Google Search Central:

- Google says using generative AI is acceptable, but generating many pages
  without adding value may violate scaled content abuse policy.
- Google's spam policy explicitly calls out generating many pages with AI,
  scraping feeds or search results, or stitching pages together without adding
  value.
- Google's helpful-content guidance emphasizes original information,
  substantial added value, first-hand expertise, clear purpose, and content
  that leaves the reader satisfied without needing to search again.

Why this matters:

- A naive pSEO plan like "make 1,500 pages of `emoji for <phrase>` from a CSV"
  is risky.
- A curated set of pages with actual editorial judgment is viable.

Practical implication:

- Do not index raw on-site search result URLs for arbitrary query strings.
- Prefer discrete, curated static routes with unique copy and clear user value.
- Use `noindex` on low-value experimental or internal-search URLs if they
  appear.

### 4. LLM search matters, but it is still a supplement to Google, not a replacement

Confirmed:

- Aleyda Solis cites current AI referral traffic as only 1-2% for most sites
  and shows that ChatGPT and Perplexity audiences still overlap heavily with
  Google users.
- Cloudflare reported on July 1, 2025 that Google's crawl-to-referral ratio was
  about 14:1, while OpenAI's was 1,700:1 and Anthropic's was 73,000:1.
- Google says AI Overviews and AI Mode are part of normal Search reporting, do
  not require special optimization, and can send higher-quality clicks.

Why this matters:

- LLM discovery is worth designing for, but it should not replace Google-first
  thinking for a site at this stage.
- If a piece of content also works well for Google, it is much more likely to
  be worth the investment.

### 5. LLM-friendly implementation mostly overlaps with good technical SEO

Confirmed:

- Google says existing SEO best practices remain relevant for AI Overviews and
  AI Mode, and that there are no extra requirements or special schema required.
- Google explicitly says important content should be available in textual form.
- Google also says server-side or pre-rendering is still a great idea because
  not all bots can run JavaScript.
- Vercel's December 17, 2024 crawler study says ChatGPT and Claude do not
  execute JavaScript, and recommends server-rendering critical content.
- OpenAI's crawler docs say sites should allow `OAI-SearchBot` in `robots.txt`
  to appear in ChatGPT search results.

Why this matters for FetchMoji:

- Content pages should render the answer in HTML before hydration.
- Important explanatory text cannot live only inside a client-side search
  interaction.
- Current Astro SSR is a good starting point, but dedicated content routes are
  still needed.

### 6. `llms.txt` is low priority relative to crawlability, text, and robots controls

Confirmed:

- Google explicitly says you do not need new machine-readable AI text files or
  special schema to appear in AI features.
- OpenAI's official crawler guidance discusses `robots.txt`,
  `OAI-SearchBot`, `GPTBot`, and published IP ranges, but not `llms.txt`.

Inference:

- `llms.txt` may be harmless as an experiment, but it is not a primary lever.
- The higher-confidence work is:
  - render useful HTML
  - make pages crawlable
  - allow the right bots
  - build clean internal links
  - publish original, attributable content

## Better Versions Of The Strategy

### Priority 1: Intent Pages

Best fit for the product and the strongest SEO wedge.

Suggested page pattern:

- Direct answer: 3-7 best emoji for the phrase
- Short explanation of nuance between options
- Copy buttons
- "Best for text", "best for dramatic tone", "best for supportive tone" style
  guidance where relevant
- Related phrases and internal links
- Light Apple/WhatsApp/iPhone note only when it helps the user

Good seed topics from repo-local research plus autocomplete:

- `awkward silence`
- `secondhand embarrassment`
- `proud of you`
- `overthinking`
- `delulu`
- `awkward`
- `yikes`
- `cringe`
- `my bad`
- `thinking of you`

### Priority 2: Apple / iPhone Troubleshooting Pages

Useful, but should stay tightly scoped.

Suggested topics:

- `iphone emoji search not working`
- `apple emoji search not working`
- `ios emoji search not working`
- `emoji search only shows genmoji`

Best use:

- Answer the support question briefly
- Explain the likely native-keyboard issue
- Offer FetchMoji as an immediate workaround
- Link into relevant intent pages and the app

### Priority 3: Reverse Lookup / Meaning / Copy Pages

These are probably larger but more competitive and easier to commoditize.

Autocomplete evidence suggests demand around:

- `what emoji is this`
- `emoji meaning iphone`
- `copy this emoji`

Recommendation:

- Treat these as second-wave expansions after intent pages prove useful
- Do not lead with them, because incumbents already cover a lot of that terrain

## Recommended Content Architecture

### Core route types

- `/emoji-for/`
  - hub page for intent phrases
- `/emoji-for/<intent-slug>`
  - curated answer pages
- `/ios/emoji-search-not-working`
  - support page
- `/emoji-meaning/<slug>`
  - optional later expansion

### What each indexed page needs

- Unique title and meta description
- Canonical URL
- Server-rendered answer content
- Descriptive H1
- Clear text explaining why the suggested emoji fit
- Internal links to adjacent intents
- Updated date only when meaningfully revised
- Clear about/editorial/source context for site trust

### What should not be indexed

- Arbitrary internal search result URLs
- Thin pages that just repeat the keyword and dump emoji
- Huge batches of nearly identical phrase variants

## Technical SEO Requirements For This To Work

Minimum viable upgrades:

1. Add `robots.txt`
2. Add sitemap generation
3. Add canonical tags on all content routes
4. Add an About / methodology page
5. Add internal-link hubs for phrase clusters
6. Verify the site in Search Console
7. Track bot access in Cloudflare logs or equivalent

Nice-to-have upgrades:

- Breadcrumbs
- Standard article schema on editorial pages, if it matches visible content
- Simple editorial notes explaining how emoji recommendations are chosen
- Explicit crawler controls if you want to allow discovery while limiting
  training use

## Recommendation

Recommended direction:

1. Do not build this as a giant "common emojis Apple keyboard misses" content
   list.
2. Build a small, high-quality intent-content layer around phrase-level emoji
   search gaps.
3. Use the Apple/iPhone angle as a supporting acquisition cluster and a framing
   device for some pages, not as the main taxonomy.
4. Optimize for both Google and LLMs by keeping critical content in static HTML
   and publishing genuinely useful editorial explanation.
5. Ignore `llms.txt` until the basics are done.

If I were prioritizing execution, I would do it in this order:

1. Launch 20 curated `/emoji-for/<intent>` pages from the existing backlog
2. Add a hub page and internal linking
3. Add `robots.txt`, sitemap, canonicals, and an About/methodology page
4. Launch 3-5 iPhone troubleshooting pages
5. Review Search Console and server logs after 4-8 weeks before expanding

## Missing Information

- Real search volume by query is still unknown; autocomplete confirms demand
  shape, not exact volume.
- A 20-keyword manual SERP audit would still be useful before building the full
  first batch.
- Search Console data does not exist yet for these routes, so the recommendation
  is based on query shape, policy fit, and product alignment rather than actual
  performance data.

## Source Links

Local repo context:

- `README.md`
- `docs/research/ios-emoji-keyboard-friction-and-vocabulary-gaps-2026-03-29.md`
- `dist/index.html` generated locally on 2026-03-30

Primary docs:

- Google Search Central, AI features and your website
  https://developers.google.com/search/docs/appearance/ai-features
- Google Search Central, helpful content guidance
  https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google Search Central, guidance on generative AI content
  https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- Google Search Central, JavaScript SEO basics
  https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Google Search Central, spam policies
  https://developers.google.com/search/docs/essentials/spam-policies
- OpenAI crawler docs
  https://developers.openai.com/api/docs/bots

Engineering / practitioner sources:

- Vercel, The rise of the AI crawler, 2024-12-17
  https://vercel.com/blog/the-rise-of-the-ai-crawler
- Cloudflare, Control content use for AI training..., 2025-07-01
  https://blog.cloudflare.com/control-content-use-for-ai-training/
- Aleyda Solis, AI Search: Where Are We & What Can We Do About It?, 2025-05-18
  https://www.aleydasolis.com/en/search-engine-optimization/ai-search-trends/

Demand-shape snapshots queried on 2026-03-30:

- https://suggestqueries.google.com/complete/search?client=firefox&q=emoji%20for%20awkward
- https://suggestqueries.google.com/complete/search?client=firefox&q=emoji%20for%20awkward%20silence
- https://suggestqueries.google.com/complete/search?client=firefox&q=emoji%20for%20secondhand%20embarrassment
- https://suggestqueries.google.com/complete/search?client=firefox&q=emoji%20for%20delulu
- https://suggestqueries.google.com/complete/search?client=firefox&q=emoji%20for%20proud%20of%20you
- https://suggestqueries.google.com/complete/search?client=firefox&q=emoji%20for%20overthinking
- https://suggestqueries.google.com/complete/search?client=firefox&q=iphone%20emoji%20search%20not%20working
- https://suggestqueries.google.com/complete/search?client=firefox&q=what%20emoji%20is%20this
- https://suggestqueries.google.com/complete/search?client=firefox&q=copy%20this%20emoji
- https://suggestqueries.google.com/complete/search?client=firefox&q=emoji%20meaning%20iphone
