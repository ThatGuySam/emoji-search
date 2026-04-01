# Global Search URL, Locale Wave, And Editorial QC Tooling

Tease: Keep global search navigation simple, but make the content and QA system
rigorous.

Lede: For this rollout, the cleanest execution is to launch a site-wide fake
search launcher that always routes to `/`, keep indexable pages slash-based,
reserve query-parameter URLs for non-indexable internal search behavior, pick a
first locale wave of `pt-BR`, `ja-JP`, and `hi-IN`, and run a multi-tool
editorial lint pass to reduce AI-style writing artifacts before human review.

Why it matters:

- It matches the product constraint: one high-quality home search experience.
- It aligns with Google guidance for parameterized/faceted URLs.
- It gives enough multilingual surface area without overextending review
  quality.
- It creates a repeatable “draft -> lint -> human sign-off” path for `/ios/`
  and localized content.

Go deeper:

- Use homepage routing for `CMD+K` and fake search launchers on all non-home
  pages.
- Keep indexable routes as slash paths and avoid indexing raw query-result URLs.
- Run Vale + textlint + proselint + alex + grammar checks, then do required
  human review for all `/ios/` and locale pages.

Date: 2026-03-30

## Scope

Research and lock decisions for:

- global search URL behavior
- first multilingual territory/language wave
- editorial and grammar tooling to reduce “AI smell”
- public download paths and setup constraints for EmbeddingGemma

## Repo Context

Local state on 2026-03-30:

- `src/layouts/Layout.astro` is the site-wide insertion point for
  cross-route launcher behavior.
- `scripts/generate-multilingual-drafts.ts` already uses Claude Opus 4.6 and
  EmbeddingGemma QA.
- `scripts/embeddinggemma_similarity.py` already expects `HF_TOKEN` and
  `sentence-transformers`.

## Findings

### 1. Search URL and launcher policy

Decision:

- Global launcher behavior: clicking the fake search box or pressing
  `CMD/Ctrl+K` on non-home pages should navigate to `/` without prefilled query.
- Slash-first indexable routes stay as canonical content URLs:
  `/emoji-for/`, `/emoji-for/<slug>`, `/ios/...`.
- If a query URL is introduced later for diagnostics/sharing, use Google-like
  query syntax (`/search?q=<term>` or equivalent `?q=` contract), but do not
  make arbitrary query URLs indexable by default.

Evidence:

- Google faceted-navigation guidance warns parameterized combinations can create
  crawl waste and recommends preventing crawl/index when those URLs are not
  useful as landing pages.
- Google URL guidance recommends readable words, audience language, and hyphen
  separators for durable routes.
- Google’s own Custom Search API uses `q` as the query parameter, making `q`
  the least surprising convention if query URLs are needed.

Inference:

- A homepage-only search UX with route-level launcher entry points is simpler
  and lower risk than maintaining query-prefill state across route transitions.
- `q` is a pragmatic interoperability convention, not a ranking lever.

### 2. Locale wave recommendation (3 territories/languages)

Recommended first wave:

1. `pt-BR` (Brazil)
2. `ja-JP` (Japan)
3. `hi-IN` (India) with `en-IN` fallback copy where needed

Why these three:

- Emojipedia’s 2025 Emojitracker relaunch includes country filters for India,
  Brazil, and Japan and calls out distinct emoji behavior in each.
- This gives strong language diversity (Latin script + kana/kanji + Devanagari)
  and broad market surface area for multilingual QA.
- It keeps the review surface manageable compared with shipping many locales at
  once.

Important caveat:

- Emojitracker’s country list is an initial filter set (not a complete global
  rank table), so this is a pragmatic rollout choice, not a claim of absolute
  top-3 usage worldwide.

Fallback candidate:

- `fil-PH` / `en-PH` (Philippines) is a strong next locale based on the same
  Emojitracker observations.

### 3. Editorial and grammar tooling to reduce AI-style artifacts

Recommended stack for draft review:

- `vale`: house style and product terminology consistency across Markdown.
- `textlint`: rule/preset ecosystem for prose conventions and fixable patterns.
- `proselint`: diction and readability warnings.
- `alex`: insensitive or exclusionary wording checks.
- `LanguageTool` (self-hosted or enterprise endpoint): additional grammar pass.

Why multi-tool:

- No single linter catches style drift, tone drift, inclusivity, and grammar
  quality at once.
- Tool overlap is useful when reviewing LLM drafts where repetition and vague
  phrasing can bypass single-rule systems.

Operational notes:

- The public LanguageTool endpoint explicitly warns against automated bulk
  requests and has strict limits; use local/self-hosted or paid access for CI.
- GitLab’s docs style guide is a practical unofficial reference: concise,
  direct, localization-friendly writing, tested with Markdown lint + Vale.
- Google’s style guide and Google Search AI-content guidance both reinforce
  clarity, factual accuracy, and consistency over generic filler.

### 4. EmbeddingGemma download and setup paths

Confirmed public sources:

- Google Developers Blog lists EmbeddingGemma availability on Hugging Face,
  Kaggle, and Vertex AI.
- Hugging Face model page is public but requires accepting Google’s usage
  license to access files.

Practical setup constraints for this repo:

- `HF_TOKEN` must be present with accepted model terms.
- `sentence-transformers` must be installed in the Python environment.
- Scripted QA path remains build-time/offline, which is appropriate for this
  rollout stage.

## Recommendation

- Keep launcher behavior simple: route to `/` for all global search entrypoints.
- Keep canonical content routes slash-based and indexable.
- Keep raw query-result URLs non-indexable unless explicitly promoted as
  intentional landing pages.
- Run locale wave 1 as `pt-BR`, `ja-JP`, `hi-IN` with mandatory human review.
- Add lint gates for AI-drafted content before human sign-off, then publish.

## Source Links

- Emojipedia, “Emojitracker Is Back” (2025)  
  https://blog.emojipedia.org/emojitracker-is-back-2025/
- Google, “Managing crawling of faceted navigation URLs”  
  https://developers.google.com/search/docs/crawling-indexing/crawling-managing-faceted-navigation
- Google, “URL Structure Best Practices for Google Search”  
  https://developers.google.com/search/docs/crawling-indexing/url-structure
- Google Custom Search JSON API `cse.list` (`q` parameter)  
  https://developers.google.com/custom-search/v1/reference/rest/v1/cse/list
- Google, “Guidance on generative AI content on your website”  
  https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- Google Developer Documentation Style Guide  
  https://developers.google.com/style
- GitLab Documentation Style Guide (unofficial but high-signal practitioner
  reference)  
  https://docs.gitlab.com/development/documentation/styleguide/
- Vale CLI docs  
  https://vale.sh/docs/
- textlint docs  
  https://textlint.org/docs/
- LanguageTool Public HTTP API notes  
  https://dev.languagetool.org/public-http-api.html
- proselint repository  
  https://github.com/amperser/proselint
- alex repository  
  https://github.com/get-alex/alex
- Google Developers Blog, “Introducing EmbeddingGemma”  
  https://developers.googleblog.com/introducing-embeddinggemma/
- Hugging Face model page, `google/embeddinggemma-300m`  
  https://huggingface.co/google/embeddinggemma-300m
