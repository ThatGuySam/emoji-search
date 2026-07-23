---
title: Changelog
description: A dated record of FetchMoji growth-spec changes and the evidence that changed them.
---

## SBC4

- `Tease:` The spec now distinguishes the working extension scaffold from the semantic-search release target.
- `Lede:` The record covers the evidence-backed growth baseline, settled channel sequence, implemented Manifest V3 shell, and remaining release evidence.
- `Why it matters:` Later implementation changes have a dated surface to update.
- `Go deeper:` Compare future entries against the 2026-07-11 baseline.

## 2026-07-23

- Recorded the implemented `apps/ext` WXT development scaffold separately from
  the planned shared semantic-search contract.
- Documented the current low-permission boundary: packaged local keyword data,
  `clipboardWrite`, and no host permissions, page reading, background worker,
  analytics, account, or query transmission.
- Added the repeatable development, production-build, load-unpacked, and manual
  Chrome smoke-test path.
- Made the remaining evidence explicit: extension-context clipboard and shortcut
  behavior, accessibility automation, packaged-browser E2E, clean-profile
  network trace, final store assets, and trusted testing are not yet verified.

## 2026-07-15

- Published the AppKit, Tauri, and Electron comparison, shortcut audit,
  automatic-insertion permission boundary, and prototype release gates in
  Research.
- Added three runnable macOS host prototypes and one local desktop renderer in
  [`8b232fb`](https://github.com/ThatGuySam/emoji-search/commit/8b232fb8e2fd3f02ee32e82cfac137d10f5100cb).
- Replaced the prototype-only interface with the website's actual shared
  `EmojiSearchView` and root stylesheet in
  [`751be76`](https://github.com/ThatGuySam/emoji-search/commit/751be760398c7600e5abd620bd1659f313edd803).
- Preserved the website's semantic-search controller while keeping desktop
  queries on a bundled keyword controller behind the same view props.
- Verified keyboard focus retention, modifier and input-method passthrough,
  copy-before-hide insertion behavior, launch readiness, package builds, and
  local Apple Silicon bundle measurements.
- Left shell selection, real-app verification, shortcut settings, signed
  distribution, and Mac App Store acceptance explicitly open.

## 2026-07-11

- Created the FetchMoji growth docs/spec site.
- Published the live SEO, agent-search, performance, privacy, and channel audit
  into the Research section as its canonical copy.
- Defined the target contracts for local semantic search, reviewed intent pages,
  the Chrome extension, privacy-safe measurement, and agent discovery.
- Recorded the Chrome extension as the primary launch object and Product Hunt as
  a supporting event.
- Left telemetry policy, performance budgets, native-review ownership,
  second-browser priority, and API demand explicitly open.
- Published the current Chrome specification, framework comparison, rejection
  matrix, AI-assisted build safeguards, store requirements, and complete
  extension quality inventory.
- Chose WXT, TypeScript, and React for extension packaging; settled on shared
  typed search logic with surface-specific release artifacts.
- Added `CHROMEWEBSTORE.md`, clean-profile privacy evidence, production ZIP
  inspection, and packaged-browser tests as extension release requirements.
