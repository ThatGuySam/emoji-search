---
title: Roadmap
description: FetchMoji fixes trust and readiness first, improves proven pages second, then launches the extension and supporting distribution.
---

## SBC4

- `Tease:` Fix trust and readiness before expanding discovery.
- `Lede:` The sequence moves from homepage and privacy integrity through proven intent pages, extension reuse, authority assets, launch, and evidence-led expansion.
- `Why it matters:` Dependent work has explicit exit conditions, so launch activity cannot outrun the product.
- `Go deeper:` Start at Phase 0 and do not skip unresolved gates.

## Phase 0 — Trust and readiness

- Add crawlable homepage positioning, H1, proof examples, intent links, and a
  social preview image.
- Preserve pre-hydration input and expose initialization, error, and copy states.
- Decide the telemetry boundary; disable or disclose Cloudflare RUM.
- Establish cold and repeat search diagnostics on mobile and desktop.

**Exit:** the homepage explains the product without JavaScript, no first query is
lost, and public privacy copy matches observed network behavior.

## Phase 1 — Demand-led intent pages

- Export Search Console page × query × country data for 28- and 90-day windows.
- Upgrade the five highest-opportunity pages with the required intent-page
  modules.
- Run native review on localized pages before changing or expanding them.
- Test title and description changes in controlled batches.

**Exit:** the first page cohort is reviewed, distinguishable, measurable, and no
new URL exists solely for wording variation.

## Phase 2 — Browser extension

- Keep the working `apps/ext` WXT scaffold green: local keyword search, keyboard
  navigation, copy fallback, the low-permission manifest, unit tests, production
  build, and ZIP packaging are in place.
- Extract or formalize the shared search contract and versioned artifact format.
- Build the WXT + TypeScript + React Chrome Manifest V3 package with all
  executable JavaScript and WebAssembly bundled.
- Maintain `CHROMEWEBSTORE.md`; prove each permission, privacy statement, and
  remote-code declaration against the production ZIP and a clean-profile trace.
- Test initialization, ranking parity, keyboard and screen-reader behavior,
  offline repeat use, clipboard behavior, lifecycle suspension, updates, and
  uninstall cleanup.
- Recruit 20–30 real testers from relevant communities and resolve qualitative
  failures before public launch.

**Exit:** every P0 release gate in the extension research memo passes; the
extension survives trusted testing and store policy review without page-reading
permissions, remote executable code, or query transmission.

**Current status:** the development scaffold passes its local compile, unit,
build, and ZIP gate. Semantic parity, packaged Chrome verification,
accessibility automation, network evidence, approved store assets, and trusted
testing remain before the phase can exit.

## Phase 3 — Authority assets

- Publish the methodology and review policy.
- Create the contextual emoji tone atlas and a reproducible retrieval benchmark.
- Publish a technical case study on private browser-based semantic search.

**Exit:** the product has at least one original, citeable asset for language and
one for developers.

## Phase 4 — Launch sequence

- Publish the Chrome Web Store listing and a concise product demonstration.
- Release search-led short videos based on real query demand.
- Publish the GitHub/Show HN technical story.
- Use Product Hunt as a supporting event after the extension exists.

**Exit:** each launch surface has source-tagged acquisition and activation
evidence without query-level tracking.

## Phase 5 — Evidence-led expansion

- Review impressions, clicks, copy activation, repeat use, store retention, and
  qualitative feedback.
- Consolidate weak or overlapping pages.
- Add locales, browser stores, integrations, or an API only when evidence clears
  the corresponding open question.
