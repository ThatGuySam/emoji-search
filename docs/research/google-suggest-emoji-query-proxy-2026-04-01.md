# Google Suggest Emoji Query Proxy

Tease: We still do not have real user logs, but Google autocomplete is already
showing which `emoji for ...` phrasings people are likely trying.

Lede: A small external query bundle built from Google autocomplete suggestions
for FetchMoji-style phrase intents materially changed the experiment picture on
2026-04-01. The curated short-alias corpus did not just beat the local control
on the repo's manual benchmark; it also strongly outperformed it on the
web-sourced query bundle.

Why it matters:

- This is the first outside-the-repo demand proxy in the experiment lane.
- It reduces the risk that we are optimizing only for self-authored benchmark
  language.
- It gives a better answer to the immediate product question: which alias style
  helps with public search-intent phrasing?

Go deeper:

- Use Google autocomplete as a demand proxy, not as ground truth.
- Keep curated short aliases; do not promote extracted editorial prose.
- Use this result to justify the next promotion review for the curated alias
  corpus, while continuing to plan real query logging separately.

Date: 2026-04-01

## Scope

Pull a small online query set from Google autocomplete for FetchMoji-style
intent phrases, run the existing emoji relevance matrix against it, and use the
result to reduce uncertainty around corpus decisions.

## Short Answer

The outside-demand proxy supports the same conclusion as the later local
curated-alias experiments, but more strongly:

1. Public search-style phrasings are real and easy to observe through Google
   autocomplete.
2. The baseline `humanized_plus_tokens` corpus is weak on those web-shaped
   phrasings.
3. The curated short-alias corpus is decisively better on that query set.
4. Extracted editorial prose remains too noisy and does not help enough.

This makes the production decision clearer:

- promote the curated alias source for the shipped corpus review
- do not promote the extracted editorial alias source
- keep the logging plan because autocomplete is only a proxy, not user truth

## Online Source Method

On 2026-04-01, Google autocomplete suggestions were pulled for these seed
queries:

- `emoji for awkward`
- `emoji for awkward silence`
- `emoji for secondhand embarrassment`
- `emoji for overthinking`
- `emoji for my bad`
- `emoji for delulu`
- `emoji for cringe`
- `emoji for locked in`
- `emoji for brain rot`

These suggestion pulls were normalized into a small English external query
bundle at:

- `src/artifacts/experiments/google-suggest-en-query-bundle-2026-04-01.json`

Accepted examples from the bundle:

- `emoji for feeling awkward`
- `best emoji for awkward`
- `emoji for secondhand embarrassment`
- `best emoji for overthinking`
- `emoji for my bad`
- `best emoji for delulu`
- `emoji used for cringe`
- `what emoji to use for locked in`
- `emoji for brain rot`

## Experiment Result

Artifact:

- `src/artifacts/experiments/emoji-search-experiments-2026-04-01-gte_small_en-google-suggest.json`

Key comparison on the external bundle (`localized` metrics in this run):

Baseline vector:

- `gte_small_en__humanized_plus_tokens__vector_float_raw`
  - localized `Hit@10`: `35.29%`
  - localized `nDCG@10`: `15.26%`

Curated vector:

- `gte_small_en__humanized_curated_editorial_plus_tokens__vector_float_raw`
  - localized `Hit@10`: `64.71%`
  - localized `nDCG@10`: `36.36%`

Baseline hybrid:

- `gte_small_en__humanized_plus_tokens__hybrid_rrf_equal`
  - localized `Hit@10`: `29.41%`
  - localized `nDCG@10`: `16.87%`

Curated hybrid:

- `gte_small_en__humanized_curated_editorial_plus_tokens__hybrid_rrf_equal`
  - localized `Hit@10`: `70.59%`
  - localized `nDCG@10`: `40.26%`

Extracted-editorial hybrid:

- `gte_small_en__humanized_editorial_plus_tokens__hybrid_rrf_equal`
  - localized `Hit@10`: `29.41%`
  - localized `nDCG@10`: `16.73%`

## What This Tells Us

### 1. Curated short aliases are not just benchmark overfitting

The curated corpus wins not only on the repo's manual query set, but also on an
outside query proxy drawn from live autocomplete behavior.

### 2. The baseline corpus under-captures public `emoji for ...` phrasing

The baseline control falls off hard on the Google-suggest bundle. That means
the current shipped corpus is still missing meaningful public phrasing patterns.

### 3. Extracted editorial prose is still the wrong promotion candidate

The extracted-editorial variant stays near baseline or below it on the
web-sourced bundle. This confirms that prose extraction is not the reliable path
to production improvement.

### 4. The right next decision is about shipping curated aliases, not widening extraction

The best immediate decision is now narrower and clearer:

- review the curated alias source for production promotion
- do not broaden the extraction heuristics
- keep future online-data collection focused on short query-like language

## Limits

- Google autocomplete is an external demand proxy, not real FetchMoji usage.
- Suggestions are unstable over time and can reflect SEO content, not just user
  demand.
- This bundle is small and intent-focused, not a full market sample.
- We still need a privacy-reviewed logging system to learn from real user
  searches and picks.

## Source Links

- Google autocomplete awkward:
  https://suggestqueries.google.com/complete/search?client=firefox&q=emoji%20for%20awkward
- Google autocomplete awkward silence:
  https://suggestqueries.google.com/complete/search?client=firefox&q=emoji%20for%20awkward%20silence
- Google autocomplete secondhand embarrassment:
  https://suggestqueries.google.com/complete/search?client=firefox&q=emoji%20for%20secondhand%20embarrassment
- Google autocomplete overthinking:
  https://suggestqueries.google.com/complete/search?client=firefox&q=emoji%20for%20overthinking
- Google autocomplete my bad:
  https://suggestqueries.google.com/complete/search?client=firefox&q=emoji%20for%20my%20bad
- Google autocomplete delulu:
  https://suggestqueries.google.com/complete/search?client=firefox&q=emoji%20for%20delulu
- Google autocomplete cringe:
  https://suggestqueries.google.com/complete/search?client=firefox&q=emoji%20for%20cringe
- Google autocomplete locked in:
  https://suggestqueries.google.com/complete/search?client=firefox&q=emoji%20for%20locked%20in
- Google autocomplete brain rot:
  https://suggestqueries.google.com/complete/search?client=firefox&q=emoji%20for%20brain%20rot
