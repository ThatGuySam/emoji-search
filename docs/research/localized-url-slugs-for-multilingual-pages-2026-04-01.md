# Localized URL Slugs For Multilingual Pages

Tease: English slugs on translated pages are not an SEO disaster, but they are
not what Google or users prefer when the page is genuinely localized.

Lede: For FetchMoji's new multilingual intent pages, the best long-term setup is
to localize the slugs per language version instead of keeping the English source
slug everywhere. Google explicitly recommends using words in the audience's
language in URLs, but also says keywords in the URL path have only a very small
ranking effect. That means the main win is user clarity and local trust, not a
magic ranking boost. For non-Latin scripts, Google supports native-character
slugs, but transliterated slugs are a valid tradeoff when copy/paste and
shareability matter more than native-script readability.

Why it matters:

- FetchMoji now publishes real localized pages under locale folders, but the
  slug segment is still the English source slug.
- If the page is translated, keeping the URL half-English weakens the "this page
  is for me" signal for users.
- Changing slug strategy later is possible, but it becomes more expensive once
  more pages, links, and search impressions accumulate.

Go deeper:

- Localize slugs for `pt-BR`.
- For `ja-JP` and `hi-IN`, use either native-language or carefully chosen
  transliterated slugs; do not keep English by default.
- Treat this as a URL migration with redirects, canonicals, and hreflang
  updates, not as a cosmetic string swap.

Date: 2026-04-01

## Scope

Research whether multilingual FetchMoji pages should keep English slugs such as:

- `/emoji-for/pt-br/awkward-silence/`
- `/emoji-for/ja-jp/awkward-silence/`
- `/emoji-for/hi-in/awkward-silence/`

or whether the slug segment should be localized into the target language.

## Repo Context First

Confirmed from local files on 2026-04-01:

- `src/lib/intentPageLocales.ts` currently builds localized routes as
  `/emoji-for/<locale>/<english-source-slug>/`.
- `src/pages/emoji-for/[locale]/[slug].astro` renders translated pages under
  locale subfolders, but keeps the English `sourceSlug` as the route param.
- `src/layouts/Layout.astro` and `src/pages/sitemap.xml.ts` already support
  canonical and alternate/hreflang relationships, so the repo can support a
  slug migration cleanly.
- Existing multilingual research in this repo already requires:
  - separate locale URLs
  - real translated main content
  - `hreflang`

What is missing today is only the per-locale slug decision.

## Short Answer

For FetchMoji, localized slugs are the better end state.

More specifically:

1. `pt-BR`: localize the slug into Portuguese.
2. `ja-JP`: use Japanese words in the slug if user readability is the priority;
   use a transliterated form only if encoded URLs are a real sharing problem.
3. `hi-IN`: do not keep English by default; choose between Devanagari and a
   deliberate transliterated/Hinglish form based on how your users actually
   share and search.

Important nuance:

- This is mostly a UX / trust / localization-quality decision.
- It is not a high-impact ranking lever by itself.
- If you are not ready to maintain localized slug mappings and redirects, the
  current English-slug setup is acceptable for now.

## What The Evidence Says

### 1. Google explicitly recommends audience-language URLs

Confirmed from Google Search Central's URL structure guidance:

- Google recommends simple, descriptive URLs.
- Google explicitly says: use words in your audience's language in the URL,
  and, if applicable, transliterated words.
- Google gives both German and Japanese examples as recommended URL forms.
- Google also documents percent encoding for non-ASCII characters and treats it
  as normal URL handling.

Implication:

- A localized page with a localized slug is aligned with Google's documented
  preference.
- English slugs on non-English pages are not Google's preferred pattern when the
  audience actually searches in another language.

### 2. Google says URL words matter mostly for users, not rankings

Confirmed from the Google SEO Starter Guide:

- Parts of the URL can appear in search results as breadcrumbs.
- Google says users can use the URL to understand whether a result is useful.
- Google recommends words in the URL that may be useful for users.
- Google also says keywords in the domain or URL path have hardly any effect
  from a ranking perspective beyond appearing in breadcrumbs.

Implication:

- The main benefit of localized slugs is better human comprehension in the SERP,
  better trust when links are shared, and cleaner localization.
- You should not do a risky slug migration expecting a large direct ranking gain.

### 3. Google's multilingual guidance supports real locale variants, not thin wrappers

Confirmed from Google Search Central's localized-versions documentation:

- Fully translated pages should be treated as localized variants.
- Each language version should explicitly connect to all alternates with
  `hreflang`.
- Localized pages are only treated as duplicates if the main content remains
  untranslated.
- Alternate URLs must be fully qualified.

Implication:

- Once the page is genuinely localized, a localized slug is consistent with the
  overall Google model: each locale page is its own real URL variant.
- Keeping English slugs does not violate this, but it weakens the intuitive
  "this whole page is localized" package.

### 4. Non-Latin scripts introduce a real shareability tradeoff

Confirmed from Google docs plus practitioner evidence:

- Google supports Japanese and other non-ASCII words in URLs.
- Google also notes that links should percent-encode non-ASCII characters in the
  `href`.
- Practitioner guidance from Search Laboratory and Blu Mint highlights the real
  operational downside: when copied into email, Slack, docs, or CRM systems,
  native-script URLs may appear as long percent-encoded strings.

What is confirmed vs inferred here:

- Confirmed: Google supports native-language URLs and percent encoding.
- Confirmed: transliterated words are acceptable per Google's own guidance.
- Inference: for user segments that copy links a lot across tooling, the uglier
  encoded form can hurt perceived cleanliness and shareability.

### 5. The right answer depends on product distribution, not only SEO

The strongest practical tradeoff from practitioner sources is:

- native-language slugs improve local fit and user expectation
- English or transliterated slugs improve operational simplicity and cross-tool
  readability

For FetchMoji, this suggests:

- `pt-BR`: the case for localized slugs is strongest because Portuguese can be
  written cleanly in Latin script with simple hyphenated forms
- `ja-JP` and `hi-IN`: the case is still good, but the implementation needs an
  editorial policy rather than a blanket "just use the native script" rule

## Benefits Of Localized Slugs

### Strong benefits

- Better user trust in the search result because the URL matches the page
  language.
- Better consistency between title, snippet, body, and URL.
- Better breadcrumb readability when Google surfaces URL words.
- Stronger localization signal for shared links, screenshots, and copied URLs.

### Moderate benefits

- Slightly better keyword relevance in the target language, especially when the
  local phrasing is not a literal translation of English.
- Better internal governance if each locale version has its own reviewed phrase
  instead of inheriting English forever.

### Weak / overstated benefits

- Large direct ranking improvement.
- Automatic multilingual query gains on their own.

Those are not supported strongly by Google. URL wording helps, but it is a
small signal compared with page content quality and correct localization.

## Costs And Risks

- You need a stable per-locale slug field, not just a translated page title.
- If you change existing localized URLs, you need 301 redirects from the current
  English-slug locale URLs.
- All `hreflang`, canonicals, sitemap entries, and internal links must be
  updated together.
- Literal slug translation can be bad if it ignores local search phrasing.
- Non-Latin slugs can become ugly when copied outside the browser.

## Recommendation

Recommended FetchMoji policy:

1. Keep locale folders:
   - `/emoji-for/pt-br/`
   - `/emoji-for/ja-jp/`
   - `/emoji-for/hi-in/`
2. Add a per-locale slug field for localized intent pages.
3. Migrate away from English slugs for localized pages.
4. Use this slug strategy by locale:
   - `pt-BR`: localized Portuguese slug, ASCII-friendly where sensible
   - `ja-JP`: prefer a Japanese slug if product UX is the priority; allow
     transliterated slugs if sharing/encoded URLs prove too awkward
   - `hi-IN`: do not keep English by default; choose between Devanagari and a
     reviewed transliterated form after checking actual user/search phrasing

Pragmatic implementation recommendation:

- Do not block the current localized launch on an immediate slug migration.
- Do treat localized slugs as the next cleanup pass before the multilingual
  surface grows much larger.

## Concrete Suggested Direction For FetchMoji

If you want the smallest good next move:

- `pt-BR`
  - `/emoji-for/pt-br/silencio-constrangedor/`
  - `/emoji-for/pt-br/vergonha-alheia/`
- `ja-JP`
  - either `/emoji-for/ja-jp/気まずい沈黙/`
  - or a reviewed transliterated form if you want cleaner copied links
- `hi-IN`
  - either `/emoji-for/hi-in/अजीब-चुप्पी/`
  - or a reviewed Latin transliteration if sharing/tooling concerns win

The important point is not the exact strings above; it is that the slug should
be a reviewed local phrase, not inherited English.

## Sources

Primary docs:

- Google Search Central, URL structure best practices  
  https://developers.google.com/search/docs/crawling-indexing/url-structure
- Google Search Central, localized versions of your page  
  https://developers.google.com/search/docs/specialty/international/localized-versions
- Google Search Central, SEO Starter Guide  
  https://developers.google.com/search/docs/fundamentals/seo-starter-guide

Practitioner validation:

- Search Laboratory, "Localising URLs for new language sites"  
  https://www.searchlaboratory.com/2018/10/localising-urls-for-new-language-sites/
- Blu Mint, "Multilingual SEO: How to build, structure & scale global websites"
  https://blumint.co/blog/multilingual-seo-websites

Repo-local context:

- `src/lib/intentPageLocales.ts`
- `src/pages/emoji-for/[locale]/[slug].astro`
- `src/layouts/Layout.astro`
- `src/pages/sitemap.xml.ts`
- `docs/research/llm-assisted-editorial-content-and-multilingual-guardrails-2026-03-30.md`
- `docs/research/global-search-url-locales-and-editorial-qc-tooling-2026-03-30.md`
