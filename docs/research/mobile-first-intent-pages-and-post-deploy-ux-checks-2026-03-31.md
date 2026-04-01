# Mobile-First Intent Pages And Post-Deploy UX Checks

Tease: The right mobile fix is not “more content.” It is faster primary
actions, clearer scanning, and proof that the live page still works after
deploy.

Lede: For FetchMoji’s March 31, 2026 UI pass, Nielsen Norman Group guidance
supports moving the copyable emoji actions to the top of intent pages, using
emoji as visual scan cues in related links, keeping homepage navigation small
and subordinate to search, and treating speed as part of the UX. The repo also
needed a real browser-side post-deploy check because static HTML inspection was
not enough to catch runtime or CORS regressions.

Why it matters:

- FetchMoji is a repeat-use mobile tool, so the first screen has to make the
  primary action obvious and reachable.
- Intent pages only win if people can copy an emoji immediately, not after
  reading several paragraphs.
- Search pages and SEO pages can look “correct” in markup while still failing
  live because of browser asset loading or shortcut behavior.

Go deeper:

- Put the quick-copy emoji strip before the `h1` on intent pages.
- Keep related links recognition-heavy by leading with representative emoji.
- Add only a minimal browse layer on homepage and keep search dominant.
- Run a Playwright post-deploy check with screenshots after every deploy.

Date: 2026-03-31

## Scope

Answer these questions:

- What NN/g guidance is most relevant to FetchMoji’s home, intent, and support
  pages?
- Which changes should be implemented now for mobile speed and thumb-first use?
- What proof should exist after deploy so the team is not relying on guesswork?

## What The Repo Already Knows

Confirmed from local code and docs before this pass:

- Homepage search was already the core product action, with copy feedback on
  result buttons in `src/components/App.tsx`.
- Intent pages were still article-first, with emoji suggestions below the
  header and no shared quick-copy interaction.
- Related intent links were text-only, which weakened scanning and recognition.
- `docs/verification/seo-rollout-preview-deploy-2026-03-30.md` explicitly
  recorded that there was no screenshot proof and no real browser automation
  for the new pages.

## Short Answer

The best move is a compact four-part UI change:

1. Put large quick-copy emoji buttons at the top of intent pages.
2. Add emoji-led scanning cues to related links and hub cards.
3. Keep homepage search autofocused and dominant, with only a few small browse
   links inside the initial search view.
4. Treat post-deploy browser checks and screenshots as part of the UX work, not
   optional QA polish.

## What The Evidence Says

### 1. The primary action should be large, obvious, and near the top

NN/g’s touchscreen guidance recommends large touch targets and enough spacing
to avoid accidental taps. Their available-screen-space guidance also argues that
mobile screens should prioritize the most useful content first instead of
wasting the opening view on chrome or low-value structure.

Applied to FetchMoji:

- The first useful action on an intent page is “copy the emoji.”
- The quick-copy strip belongs above the prose, not below it.
- The buttons should be visibly tappable and comfortably larger than the
  minimum 44px baseline already used on the homepage.

### 2. Recognition beats text-only scanning for related pages

NN/g’s recognition-over-recall guidance says interfaces should reduce memory
burden by surfacing cues that help people identify the right option quickly.
Their list-differentiation guidance reinforces that repeated-looking list items
need visible indicators to help scanning.

Applied to FetchMoji:

- Text-only related links force users to re-read each phrase.
- Leading each related phrase with a representative emoji gives instant visual
  differentiation.
- This is especially useful on mobile where each card competes for a narrow
  scan lane.

### 3. Homepage navigation should stay secondary to search

NN/g’s mobile input and content-deferral guidance points in the same direction:
keep the screen focused on the essential task, avoid unnecessary fields or
content, and reserve secondary material for after the primary need is served.

Applied to FetchMoji:

- The homepage should stay search-first.
- Minimal browse links are useful, but they should live inside the same compact
  search view and not turn the page into a navigation hub.
- Inference: homepage autofocus is acceptable here because the page is a
  dedicated search tool with one dominant job. This is a product-specific
  exception, not a blanket pattern for content pages.

### 4. Speed is part of the experience, not a separate concern

NN/g’s response-time guidance is still relevant: people notice lag quickly, and
small delays break flow. For FetchMoji, the important point is perceived speed,
not only synthetic scores.

Applied to FetchMoji:

- Keep content pages light and avoid shipping more client code than the
  interaction needs.
- Preconnect to the asset CDN used by homepage search.
- Reduce nonessential first-view labels or chrome that delay or distract from
  the main action.

### 5. Screenshots alone are not enough

This is partly repo-local evidence and partly workflow inference. The March 30,
2026 verification note already showed that static output was being checked
without browser proof. For this surface, that is not sufficient:

- Search readiness depends on live browser execution and remote asset loads.
- Global shortcut behavior (`Cmd/Ctrl+K`) only exists at runtime.
- Copy feedback and quick-copy affordances need interaction proof, not just
  rendered HTML.

## What Works

- Thumb-friendly quick-copy actions above the article body.
- Emoji-led labels on related links and intent hub cards.
- A small browse layer on homepage that does not compete with the search box.
- Post-deploy Playwright checks that also capture screenshots.

## What To Avoid

- Burying the copyable emoji below explanatory text.
- Large homepage nav blocks that displace the search field.
- Text-only related-link grids that all look the same at a glance.
- Claiming UX confidence from markup inspection with no live browser proof.

## Recommendation

Implement the UI around one repeated-use question: “Can a mobile user get an
emoji and move on in seconds?”

That means:

- the emoji strip is first
- the search box is still the homepage anchor
- related links are visibly distinct
- post-deploy verification includes runtime checks and screenshots

## Source Links

- Nielsen Norman Group, “Touch Targets on Touchscreens”  
  https://www.nngroup.com/articles/touch-target-size/
- Nielsen Norman Group, “Recognition and Recall in User Interfaces”  
  https://www.nngroup.com/articles/recognition-and-recall/
- Nielsen Norman Group, “Visual Indicators to Differentiate Items in a List”  
  https://www.nngroup.com/articles/visual-indicators-differentiators/
- Nielsen Norman Group, “Utilize Available Screen Space”  
  https://www.nngroup.com/articles/utilize-available-screen-space/
- Nielsen Norman Group, “A Checklist for Designing Mobile Input Fields”  
  https://www.nngroup.com/articles/mobile-input-checklist/
- Nielsen Norman Group, “Website Response Times”  
  https://www.nngroup.com/articles/website-response-times/
- Repo-local verification note, March 30, 2026  
  `/Users/athena/Code/emoji-search/docs/verification/seo-rollout-preview-deploy-2026-03-30.md`
