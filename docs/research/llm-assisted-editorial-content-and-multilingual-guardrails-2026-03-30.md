# LLM-Assisted Editorial Content And Multilingual Guardrails

Tease: LLMs can speed up content production here, but Google has made the
failure modes much more explicit.

Lede: For FetchMoji's future `/ios/` and multilingual pages, LLMs are best used
as research, drafting, translation, and QA assistants. They should not be
treated as an auto-publish path. Google's current docs and quality-rater
guidance are permissive about AI assistance, but they are hostile to scaled,
paraphrased, translated, or templated pages that add little value.

Why it matters:

- The rollout plan already includes iPhone troubleshooting pages and locale
  expansion.
- The repo's current search and intent catalog are English-first, so any
  multilingual build-out needs its own generation and QA path.
- The requested tooling split is sensible if used correctly:
  - Claude Code with Opus 4.6 can draft and localize
  - EmbeddingGemma can score semantic alignment and cluster duplicates

Go deeper:

- Use Claude Code with a pinned model name such as `claude-opus-4-6` for
  repeatable draft generation.
- Use EmbeddingGemma for multilingual similarity checks, not for text
  generation.
- Require human review, separate locale URLs, and `hreflang` before publishing
  translated pages.

Date: 2026-03-30

## Scope

Research the official and unofficial dos and don'ts for using LLMs to create
or translate FetchMoji content, especially:

- `/ios/` support pages
- future intent-page editorial copy
- multilingual page and metadata generation
- how EmbeddingGemma and Claude Code with Opus 4.6 should fit into that
  workflow

## Short Answer

This is the safe operating model:

1. Use LLMs for draft generation, structure, localization candidates, and QA.
2. Do not auto-publish raw LLM output, especially for support content and
   translated pages.
3. Require human review for every `/ios/` page and every localized page before
   indexing.
4. Make each localized page a real localized page:
   - separate URL
   - translated main content
   - `hreflang`
   - no locale-adaptive single-URL shortcuts for important editorial content
5. Use EmbeddingGemma as an offline QA layer for semantic similarity, duplicate
   detection, and low-confidence flags.
6. Keep live production search model decisions separate from the editorial
   localization pipeline.

## Repo Context

Confirmed from local files on 2026-03-30:

- The rollout plan at
  `docs/plans/fetchmoji-seo-llm-discovery-rollout-2026-03-30.md` already calls
  for a small `/ios/` support cluster and later locale-aware aliases.
- The current shared catalog in `src/data/emojiIntents.ts` is English-only:
  it has `query` and optional `altQueries`, but no locale fields.
- The current UI mounts the instant-search app only on `src/pages/index.astro`;
  future content routes do not yet share that search surface.
- Local `claude` CLI is installed on this machine, but a config check on
  2026-03-30 returned an expired-auth error. That means scripted generation is
  feasible in principle, but live generation currently depends on refreshing
  Claude auth first.

## Source Quality Notes

High confidence:

- Google Search Central docs
- Google Search Quality Rater Guidelines PDF
- Google international and multilingual site docs
- Google EmbeddingGemma docs and model card
- Anthropic's Opus 4.6 and Claude Code docs

Medium confidence:

- Patrick Stox's July 17, 2025 Ahrefs experiment on publishing raw AI-mode
  content
- Marie Haynes' January 2025 QRG analysis

Low confidence / low yield:

- HN and Lobsters searches were low-yield for this specific editorial question
- generic SEO blogs were intentionally filtered out

## What The Evidence Says

### 1. Google's official position is permissive about AI assistance, but strict about value

Confirmed:

- Google says generative AI can be useful for research and structure.
- Google also says using it to generate many pages without adding value may
  violate scaled-content-abuse policy.
- Google explicitly says to focus on accuracy, quality, and relevance even for
  automatically generated text and metadata.
- Google recommends sharing information about how content was created when that
  context is useful for readers.

Important implication:

- "AI-generated" is not the problem by itself.
- "Low-value, lightly edited, mass-produced, or metadata-sloppy" is the
  problem.

### 2. The quality-rater guidance is much more explicit about the failure cases

Confirmed from the 2025 QRG:

- Scaled content abuse includes using automated tools to produce many pages that
  add little value.
- It also includes transformations such as synonymizing or translating content
  without meaningful added value.
- Google now explicitly warns about content that is copied, paraphrased, or
  AI-generated with little effort, originality, or added value.
- Pages with missing key facts, generic templating, or obvious low-effort AI
  artifacts are called out as Lowest-quality examples.

Implication for FetchMoji:

- A multilingual rollout that simply translates English pages into many locales
  without review is exactly the sort of pattern the QRG is trying to catch.
- `/ios/` pages are especially sensitive because wrong settings names, wrong OS
  behavior, or vague troubleshooting steps are easy to spot and easy to distrust.

### 3. Google's people-first guidance maps directly onto the editorial workflow

Confirmed:

- Google asks whether content provides original information, substantial value,
  and insight beyond the obvious.
- It also asks whether the content is sloppy, hastily produced, or mass
  produced.
- Trust signals matter:
  - sourcing
  - evidence of expertise
  - author/site background
  - factual accuracy
- Google explicitly asks whether a reader would leave feeling they learned
  enough to achieve their goal.

Implication:

- FetchMoji's support pages should solve the problem quickly and concretely,
  not just rephrase Apple or forum advice.
- Good content here should incorporate product-specific judgment:
  - how FetchMoji differs from native keyboard search
  - why a recommended emoji set makes sense
  - what exact failure mode the page is addressing

### 4. Multilingual SEO requires real localization mechanics

Confirmed:

- Google recommends separate locale URLs instead of relying on locale-adaptive
  responses for important content.
- Localized pages are worth marking up with `hreflang` when the main content is
  translated or regionally adapted.
- Each version should reference itself and all alternates.
- Fully qualified URLs are required.
- Google treats pages as duplicates only when the main content remains
  untranslated, which is effectively a warning against shallow template-only
  localization.

Implication:

- If FetchMoji ships translated pages, those should be real page variants, not
  just an English page wrapped in translated nav/footer chrome.
- Locale rollout should start with a small reviewed set and a clean URL +
  `hreflang` structure, not a broad locale-adaptive shortcut.

### 5. Practitioner evidence suggests raw AI summaries are not enough

Patrick Stox's July 17, 2025 test is the most useful practitioner signal here:

- He published AI-mode-derived pages directly on the Ahrefs blog, a very strong
  domain.
- The generated pages still did not rank meaningfully.
- His inference was that Google likely expects something beyond a decent
  machine summary, and he notes he had better results in a separate test after
  adding human content.

Marie Haynes' January 2025 QRG analysis adds a second practical warning:

- She highlights how much more heavily the new QRG focuses on paraphrased
  content and scaled AI patterns.
- Her read is that generic rewording and machine-friendly Q&A templating can
  look good to systems while still being unhelpful to humans.

Inference:

- Even if LLM-written support or intent pages seem "good enough" in isolation,
  that is not strong evidence they are rank-worthy or citation-worthy.
- The safer bet is to use models for acceleration, then add human judgment,
  product-specific specificity, and review.

### 6. EmbeddingGemma and Claude Code fit the workflow, but in different roles

Confirmed:

- EmbeddingGemma is a multilingual embedding model trained on 100+ languages
  and positioned for retrieval, classification, clustering, and semantic
  similarity.
- The official model card shows usage through Sentence Transformers, not as a
  text generator.
- Claude Code supports non-interactive print mode, JSON schema output, and
  pinned full model names.
- Anthropic's February 5, 2026 announcement says `claude-opus-4-6` is the API
  model name for Opus 4.6.

Implication:

- Claude Code with Opus 4.6 is a reasonable draft generator for translations,
  alt queries, titles, and support-page first drafts.
- EmbeddingGemma is a reasonable QA model for:
  - cross-lingual similarity checks
  - duplicate clustering
  - confidence heuristics
- EmbeddingGemma should not be treated as the translation engine.
- Also, because official published usage emphasizes Python / Sentence
  Transformers today, EmbeddingGemma is a stronger fit for offline build-time QA
  than for an immediate browser runtime swap in this repo.

## What Works

- Use English source content as the canonical editorial record.
- Let Claude generate:
  - localized query phrasing
  - alt queries
  - page titles
  - meta descriptions
  - first-draft body copy
- Add review flags in the generation output when locale-specific slang or Apple
  terminology is uncertain.
- Run EmbeddingGemma similarity checks to flag drafts whose meaning appears to
  drift too far from the source.
- Keep a visible About / methodology page so trust signals are not hidden.
- For `/ios/` pages, verify final copy against current Apple terminology and
  actual device behavior before publish.
- Pin the Claude model name for production generation runs instead of using a
  floating alias.

## What To Avoid

- Auto-publishing translated or paraphrased pages directly from model output.
- Creating many thin locale pages just because the generator can produce them.
- Publishing generic Q&A or support filler built from autocomplete, PAA, or
  forum summaries without added value.
- Translating only templates while leaving main explanatory content in English.
- Using a single locale-adaptive URL as the canonical editorial strategy for
  important content.
- Treating EmbeddingGemma similarity as proof that content is factually correct.
- Letting model output invent Apple settings labels, OS behaviors, or support
  steps for `/ios/` pages.

## Recommendation

Use this workflow for FetchMoji:

1. Keep English editorial content as the reviewed source of truth.
2. Generate locale drafts offline with Claude Code using a pinned Opus 4.6
   model name and structured JSON output.
3. Run EmbeddingGemma checks to score cross-lingual similarity and catch obvious
   drift or duplicate locale phrasing.
4. Store outputs as drafts with provenance and review flags.
5. Require human review before anything becomes indexable.
6. For localized pages that do ship:
   - give them separate URLs
   - add `hreflang`
   - keep an `x-default` fallback where appropriate
   - make sure the main content is actually localized

For `/ios/` specifically:

- LLM drafting is acceptable.
- Final publish should be human-reviewed only.
- The reviewer should confirm:
  - exact Apple UI terms
  - exact failure-mode framing
  - no unsupported OS-version claims
  - the page still routes users toward FetchMoji's differentiated value

## Source Links

Local repo context:

- `docs/plans/fetchmoji-seo-llm-discovery-rollout-2026-03-30.md`
- `src/data/emojiIntents.ts`
- `src/pages/index.astro`
- `src/components/App.tsx`

Primary docs:

- Google Search Central, guidance on using generative AI
  https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- Google Search Central, creating helpful, reliable, people-first content
  https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google Search Central, AI features and your website
  https://developers.google.com/search/docs/appearance/ai-features
- Google Search Quality Rater Guidelines (2025)
  https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf
- Google Search Central, localized versions of your pages
  https://developers.google.com/search/docs/specialty/international/localized-versions
- Google Search Central, how Google crawls locale-adaptive pages
  https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages
- Google AI for Developers, EmbeddingGemma model overview
  https://ai.google.dev/gemma/docs/embeddinggemma
- Hugging Face model card, `google/embeddinggemma-300m`
  https://huggingface.co/google/embeddinggemma-300m
- Anthropic, Introducing Claude Opus 4.6
  https://www.anthropic.com/news/claude-opus-4-6
- Claude Code CLI reference
  https://code.claude.com/docs/en/cli-reference
- Claude Code model configuration
  https://code.claude.com/docs/en/model-config

Practitioner sources:

- Patrick Stox, "Google Thinks AI Mode Is Good for Users, but the Content Isn't
  Good Enough to Rank in Google"
  https://ahrefs.com/blog/ai-mode-content-isnt-good-enough-to-rank-in-google/
- Marie Haynes, "New in the QRG - filler content, scaled content abuse and AI
  generated content"
  https://www.mariehaynes.com/qrg-jan-2025-update/
