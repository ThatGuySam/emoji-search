---
title: Chrome extension specs, boilerplates, rejection risks, and quality inventory
description: A primary-source comparison of extension scaffolds, Chrome Web Store rejection risks, AI-assisted build safeguards, and the complete FetchMoji quality checklist.
---

## SBC4

- `Tease:` Use WXT, ship a real local-search tool, and make the review evidence as deliberate as the code.
- `Lede:` FetchMoji should be a Chrome-first Manifest V3 action popup built with WXT, TypeScript, and the smallest justified permission set. Chrome does not publish a separate rejection policy for AI-written code; AI-assisted extensions fail the same policy checks when generated code is remote, over-permissioned, misleading, broken, or difficult to review.
- `Why it matters:`
  - The current product's JavaScript and WebAssembly search runtime cannot be loaded remotely inside an extension.
  - A maintained `CHROMEWEBSTORE.md`, permission audit, network trace, and browser tests prevent the most common AI-assisted submission mistakes.
  - Store quality affects approval, trust, discovery, retention, and whether later updates receive extra scrutiny.
- `Go deeper:`
  - Start with [The recommendation](#the-recommendation), then use [The rejection matrix](#chrome-web-store-rejection-matrix) and [The quality inventory](#fetchmoji-extension-quality-inventory) as release gates.

## Research question and method

This memo asks three questions:

1. Which current specification and scaffold should FetchMoji build on?
2. Why do Chrome extensions get rejected, including extensions written with AI coding agents?
3. What must be designed, built, tested, documented, and operated for the extension to be excellent?

Research was completed on **2026-07-11**. Technical and policy conclusions use
primary sources: current Chrome documentation and policy pages, official
framework documentation, and maintainers' repositories. Local precedent comes
from the WXT-based `apps/nature` extension in this workspace. Community lists
and generic “best boilerplate” articles were not used to decide the stack or
rejection risks.

## The recommendation

Build FetchMoji as a **Chrome-first Manifest V3 action popup using WXT,
TypeScript, and React**, with the search engine behind a typed, UI-independent
package. Package every executable JavaScript and WebAssembly file in the
extension ZIP. Keep the popup free of content scripts and host permissions.

Use the official [Chrome extension documentation](https://developer.chrome.com/docs/extensions/),
[Chrome Web Store policies](https://developer.chrome.com/docs/webstore/program-policies/policies),
and [official samples](https://github.com/GoogleChrome/chrome-extensions-samples)
as the normative specification. WXT is a build scaffold, not a policy source.

### Why WXT wins here

- It supports Manifest V3, TypeScript, React, file-based entry points, browser
  targeting, HMR, production ZIPs, and automated store submission from one
  toolchain. The official repository's latest displayed release was
  **v0.20.27 on 2026-06-23**, which is recent at the research date.
- It already works in this workspace for `apps/nature`, reducing operational
  novelty and giving FetchMoji a known Chrome/Firefox packaging precedent.
- It allows the search and ranking code to remain ordinary typed modules. The
  extension framework does not have to own the product's search architecture.
- Its generated manifest still requires explicit permission decisions; WXT
  documents that production permissions are generally added manually even
  though development mode adds permissions for hot reload.
- `wxt zip` and browser-targeted builds provide a direct release path without
  making automated submission a day-one requirement.

[WXT repository](https://github.com/wxt-dev/wxt) ·
[manifest configuration](https://wxt.dev/guide/essentials/config/manifest) ·
[publishing](https://wxt.dev/guide/essentials/publishing)

### Scaffold comparison

| Option | Current evidence | Fit for FetchMoji | Decision |
| --- | --- | --- | --- |
| **WXT** | MV2/MV3, TypeScript, multiple UI frameworks, cross-browser targets, HMR, ZIP and submission tooling; v0.20.27 displayed 2026-06-23 | Strong product/release fit and already used locally | **Use** |
| **Extension.js** | Zero-config MV3, TypeScript/React templates, isolated browser profiles, Chrome/Edge/Firefox outputs, production ZIP; v4.0.6 displayed 2026-07-07 | Excellent runner-up, especially for direct manifest projects and managed browser binaries | Re-evaluate only if WXT blocks the search runtime |
| **CRXJS** | Vite plugin with MV3, HMR, static-asset and manifest handling; v2.7.0 displayed 2026-06-19 | Good when direct Vite control matters more than a complete extension lifecycle | Do not choose unless a thinner plugin is a measured advantage |
| **Plasmo** | React/TypeScript-first extension SDK with cross-browser builds and deployment; repository still labels it alpha and displayed v0.90.5 from 2025-05-17 | Capable, but adds framework conventions without a FetchMoji-specific benefit | Do not choose for this build |
| **Google Chrome samples** | First-party API and functional examples | Best source for isolated API patterns, not a production app scaffold | Reference, do not fork wholesale |

[Extension.js](https://github.com/extension-js/extension.js) ·
[CRXJS](https://github.com/crxjs/chrome-extension-tools) ·
[Plasmo](https://github.com/PlasmoHQ/plasmo) ·
[Chrome samples](https://github.com/GoogleChrome/chrome-extensions-samples)

Framework activity is a dated signal, not a guarantee. Pin the chosen versions,
review their release notes, and upgrade deliberately.

## Proposed FetchMoji package contract

The first Chrome build should expose exactly one purpose:

> Find and copy the right emoji from a phrase the user explicitly types.

The package should contain:

- one WXT popup entry point;
- a shared TypeScript search contract and deterministic ranking tests;
- bundled JavaScript and WebAssembly search runtime;
- a versioned, checksum-verified emoji artifact that is either packaged or
  downloaded strictly as data;
- icons at 16, 32, 48, and 128 pixels, with the Web Store's required 128-pixel
  PNG included in the ZIP;
- a command that opens the extension action;
- no content script, `activeTab`, `tabs`, history, cookies, scripting, or host
  permission;
- `storage` only if the shipped build calls `chrome.storage`;
- `clipboardWrite` only if the tested implementation requires it, with its
  install warning explicitly justified;
- no background service worker unless a demonstrated update or lifecycle job
  cannot live in the popup.

The [Chrome permissions reference](https://developer.chrome.com/docs/extensions/reference/permissions-list)
states that `clipboardWrite` enables Web Clipboard API writes and produces a
“Modify data you copy and paste” warning. This makes a real browser proof—not a
guess—the gate for declaring it.

## Chrome Web Store rejection matrix

Chrome's [troubleshooting guide](https://developer.chrome.com/docs/webstore/troubleshooting/)
names excessive permissions and minimum functionality among common rejection
causes. The broader policy set adds the following review risks.

| Rejection risk | What triggers it | FetchMoji prevention |
| --- | --- | --- |
| **Remote hosted code** | CDN scripts, remote JavaScript or WebAssembly, `eval`/`new Function`, fetched strings executed as code, or a remote command interpreter | Bundle every JS/WASM runtime; treat a hosted index/model as inert data; scan the production ZIP and network log |
| **Excessive permissions** | Requested but unused permissions, broad hosts, or “future-proof” access | Produce permission-to-code evidence; ship no host access; remove dev-only WXT permissions from the production manifest |
| **Minimum functionality** | A manifest-only package, a link to a website, clickbait metadata, broken features, or no discernible utility | Search and copy must work inside the popup, including after a repeat offline load |
| **Unclear single purpose** | Unrelated features or permissions that make the extension's role difficult to explain | Keep the purpose to phrase-to-emoji search and copy; link to methodology without adding unrelated browser behavior |
| **Privacy mismatch** | Dashboard fields, privacy policy, listing, permissions, network behavior, and actual data use disagree | Derive disclosures from a fresh-profile network trace and data inventory; disclose local handling where required |
| **Incomplete or misleading listing** | Missing icon/screenshot/description; stale or false claims; excessive keywords; anonymous testimonials | Use actual current UI, plain factual copy, complete assets, and reviewed screenshots |
| **Unreadable or concealed code** | Obfuscation or a bundle whose full behavior cannot be determined | Minify only as normal build output; preserve source maps/reproducible build notes internally; include a readable reviewer explanation |
| **Broken lifecycle** | Service-worker assumptions, lost global state, installation/update faults, or features that fail on reviewer setup | Avoid a worker unless needed; test termination, restart, update, install, disable/enable, and uninstall paths |
| **Duplicate or repetitive content** | Multiple near-identical extensions or locale-only variants | Publish one localized FetchMoji extension; use trusted-test visibility for test builds |
| **Security or deceptive behavior** | Leaked keys, insecure transport, hidden behavior, misleading install flows, impersonation, or unsafe message handling | No embedded secrets; HTTPS; explicit UI; restrictive CSP; dependency and secret scans; correct brand ownership |
| **Account readiness** | Publisher lacks required two-step verification or current contact/support details | Use a dedicated publisher account with 2FA, monitored email, verified website, and support URL before submission |

The [Manifest V3 remote-code rules](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)
allow remote data but require extension logic to be self-contained. Chrome's
[AI extension guidance](https://developer.chrome.com/docs/extensions/ai)
separately says model files are not considered remote hosted code. The safe
FetchMoji interpretation is: a model or emoji index may be fetched as data, but
the code that loads, interprets, searches, and ranks it must be packaged and
reviewable. A server response must never instruct the extension which code path
or operation to execute.

## What is different about AI-built extensions?

**No special AI-written-code rejection category was found in the current
official policy set.** This is an inference from Chrome's policies and its
first-party guide for building extensions with coding agents—not a promise
about an individual review.

AI assistance raises ordinary policy risks in repeatable ways:

- models may generate obsolete Manifest V2 APIs or background-page assumptions;
- generated templates may retain unused permissions, sample hosts, placeholder
  icons, claims, or dead features;
- a package may import an SDK from a CDN or download executable logic even when
  local development appeared to work;
- an invented privacy policy may describe intended behavior instead of observed
  network and storage behavior;
- credentials or analytics IDs may be embedded in client code;
- broad abstractions and dead generated code can make the package difficult for
  a reviewer to understand;
- happy-path tests may miss the approximately 30-second idle termination of an
  MV3 service worker;
- AI-written store copy may become keyword spam, make unsupported superlative
  claims, or describe features that are not actually in the submitted ZIP.

Chrome now recommends that coding-agent projects maintain a
`CHROMEWEBSTORE.md` file with permission justifications and submission facts,
and use agent-enabled Chrome DevTools for real extension testing. FetchMoji
should make that file a required release artifact and install Chrome's current
Modern Web Guidance `chrome-extensions` skill in the product repository during
implementation. See [Build extensions with coding agents](https://developer.chrome.com/docs/extensions/ai/build_with_ai).

## FetchMoji extension quality inventory

This is the implementation and release inventory. Unchecked items are work, not
assumed facts.

### P0 — Product and single purpose

- [ ] One-sentence single purpose is used consistently in the manifest,
  listing, privacy fields, onboarding, support page, and reviewer notes.
- [ ] Search and copy work inside the popup; the extension is not a launcher for
  `fetchmoji.com`.
- [ ] The popup opens from the toolbar and a documented configurable shortcut.
- [ ] Input receives focus, arrow keys move results, Enter copies, Escape
  closes, and every control works without a mouse.
- [ ] Copy success, clipboard failure, empty query, no result, initialization,
  update failure, and offline states are designed and tested.
- [ ] The website link is subordinate and accurately labeled.

### P0 — Manifest and permissions

- [ ] Manifest V3 validates and contains only current APIs and shipped features.
- [ ] Production `permissions`, `optional_permissions`, and `host_permissions`
  are compared against actual API calls.
- [ ] No content scripts, host access, `activeTab`, `tabs`, history, cookies, or
  scripting permissions ship.
- [ ] `storage` is present only if `chrome.storage` is used; IndexedDB and web
  storage alone do not justify it.
- [ ] `clipboardWrite` is decided by a packaged Chrome test and its warning is
  documented.
- [ ] `web_accessible_resources` and `externally_connectable` are absent unless
  a specific reviewed feature requires them.
- [ ] Any CSP expansion is minimal; bundled WASM uses only the required
  `wasm-unsafe-eval` directive.
- [ ] WXT development-only permissions are absent from the production ZIP.

### P0 — Search runtime and data

- [ ] Website and extension share typed request, result, locale, schema, and
  artifact-version contracts.
- [ ] All executable JavaScript and WASM are inside the submitted ZIP.
- [ ] No code path uses remote script tags, dynamic code download, `eval`,
  `new Function`, or execution of fetched strings.
- [ ] Remote artifacts, if any, contain data only, use HTTPS, carry an immutable
  version and checksum, and fail closed to the last verified copy.
- [ ] A packaged fallback makes the first useful search work without a remote
  dependency, or the store listing plainly discloses the initial download.
- [ ] Ranking parity tests cover the website and extension against one reviewed
  query corpus.
- [ ] Artifact size, initialization time, first-result time, and copy time have
  measured budgets for cold and repeat use.

### P0 — Privacy and security

- [ ] A data-flow inventory covers query text, selected emoji, locale, settings,
  artifact metadata, errors, analytics, support messages, and update traffic.
- [ ] A clean-profile network trace proves whether query text or results leave
  the device.
- [ ] The privacy policy, prominent disclosures, Store privacy fields, listing,
  and observed behavior agree—including data processed only locally.
- [ ] No credentials, API keys, publishing tokens, or source-map secrets exist
  in source, build output, ZIP, or logs.
- [ ] Dependencies are pinned, licensed, vulnerability-scanned, and reviewed for
  remote-code behavior.
- [ ] The build runs secret scanning and rejects remote executable imports.
- [ ] External URLs use HTTPS and a strict allowlist.
- [ ] DOM output uses safe text rendering; no untrusted input reaches
  `innerHTML`, URL execution, or privileged message handlers.
- [ ] Publisher account has 2FA, least-privilege team roles, a monitored contact
  address, and recovery ownership.

### P0 — Reliability and browser verification

- [ ] Unit tests cover normalization, ranking, tie-breaking, locale fallback,
  artifact validation, and clipboard fallback.
- [ ] Component tests cover all popup states and keyboard interactions.
- [ ] End-to-end tests load the production build in Chrome and exercise action
  open, typing, result navigation, copy, close, and reopen.
- [ ] Fresh install, update from the previous release, disable/enable, browser
  restart, offline repeat use, corrupted artifact, and uninstall are tested.
- [ ] If a service worker exists, tests terminate it and prove state survives;
  globals are never treated as durable state.
- [ ] Tests cover standard and high-DPI displays, zoom, light/dark contrast, and
  the supported minimum Chrome version.
- [ ] A human performs the final packaged-build smoke test from a clean profile.

Chrome documents official end-to-end approaches with Puppeteer, Playwright,
Selenium, and WebdriverIO, and specifically recommends testing service-worker
termination. See [End-to-end testing](https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing)
and [the service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).

### P1 — Accessibility and interaction quality

- [ ] The popup has one visible H1, a programmatic label, useful instructions,
  logical tab order, and a visible focus indicator.
- [ ] Results expose emoji, name, meaning, and selection state to assistive
  technology without announcing excessive detail.
- [ ] Status changes use an appropriate live region and do not steal focus.
- [ ] Color is not the only signal; contrast meets WCAG AA.
- [ ] Reduced motion is respected and the interface remains usable at 200% zoom.
- [ ] The popup size is stable, fast, and does not truncate localized strings.
- [ ] Shortcut conflicts have a direct, accurate recovery instruction.

### P1 — Store submission package

- [ ] `CHROMEWEBSTORE.md` is generated from the actual release and human
  reviewed; it contains purpose, permissions, data use, remote-code statement,
  test steps, listing copy, support URLs, and release evidence.
- [ ] Store summary and description are concise, current, and free of keyword
  stuffing, competitor claims, fake badges, anonymous testimonials, or
  unsupported superlatives.
- [ ] Required 128×128 PNG icon is packaged and works on light and dark
  backgrounds.
- [ ] Required 440×280 promotional image is supplied.
- [ ] One to five full-bleed screenshots are 1280×800 or 640×400 and show the
  actual current UI; five are prepared for a complete listing.
- [ ] Optional 1400×560 marquee asset is ready if featuring becomes a goal.
- [ ] Website, support, privacy-policy, and contact fields resolve publicly.
- [ ] Privacy dashboard declarations and every permission justification are
  copied from reviewed evidence, not re-authored from memory.
- [ ] Reviewer instructions are supplied even if no account is required: open
  popup, enter a sample phrase, choose a result, confirm clipboard output, and
  test offline repeat use.
- [ ] The publisher's two-step verification and registration are complete.
- [ ] Trusted-test release precedes public submission; test variants remain
  non-public or clearly linked to the production item.

Chrome requires at least an icon, small promotional image, and screenshot. The
exact image dimensions above come from [Supplying Images](https://developer.chrome.com/docs/webstore/images);
listing-copy guidance comes from [Creating a great listing page](https://developer.chrome.com/docs/webstore/best-listing).

### P1 — Release engineering and operations

- [ ] One command produces a deterministic production build and store ZIP.
- [ ] CI runs typecheck, lint, unit, component, E2E, accessibility, dependency,
  secret, manifest, permission, remote-code, ZIP-content, and size checks.
- [ ] Release notes identify purpose, permission, data-practice, dependency, and
  artifact changes.
- [ ] Version is bumped exactly once and matches the submitted package.
- [ ] ZIP checksum, build provenance, dependency lockfile, test results, and
  approval are retained for each release.
- [ ] Store publishing is staged/manual until rollback, credentials, and review
  behavior are understood; automation follows a successful manual release.
- [ ] A rollback package and response owner exist before public launch.
- [ ] Support intake distinguishes product bugs, search-quality misses, privacy
  questions, and policy notices.
- [ ] Chrome Web Store emails are monitored and policy changes are reviewed on a
  recurring schedule.

Chrome reported extended review times during an April 2026 submission surge and
notes that new developers, new items, dangerous permissions, significant code
changes, broad hosts, large codebases, and hard-to-review code can receive more
scrutiny. Plan the launch around review uncertainty rather than a fixed approval
date. See [Chrome Web Store review process](https://developer.chrome.com/docs/webstore/review-process).

### P2 — Discovery, retention, and cross-browser quality

- [ ] Store listing uses the same high-intent language that real users use,
  without keyword spam.
- [ ] Acquisition is source-attributed at the store/channel level without
  collecting query content.
- [ ] Track installs, uninstalls, active users, ratings, support themes, and
  voluntary qualitative feedback; define the privacy-safe activation metric
  before adding in-product telemetry.
- [ ] Onboarding reaches first copy in seconds and never requires an account.
- [ ] Updates preserve settings and the last verified artifact.
- [ ] Localization ships inside one extension and receives native review.
- [ ] Edge reuses the Chrome ZIP only after a smoke test; Firefox receives a
  dedicated WXT build and its source-review package.
- [ ] Store descriptions, privacy facts, screenshots, support docs, and
  `CHROMEWEBSTORE.md` are updated in the same release as behavior changes.

## Release gates

Do not submit FetchMoji publicly until all P0 items pass and the following
evidence exists:

1. production manifest and permission-to-code map;
2. production ZIP inventory with no remote executable code;
3. clean-profile network trace and matching privacy declarations;
4. deterministic ranking, popup, accessibility, and packaged Chrome E2E results;
5. install/update/offline/uninstall evidence;
6. complete, factual Store listing assets;
7. human-reviewed `CHROMEWEBSTORE.md`;
8. trusted-tester feedback with blocking failures resolved;
9. support, rollback, and publisher-account ownership.

## Sources

### Chrome platform and review policy

- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [Troubleshooting Chrome Web Store violations](https://developer.chrome.com/docs/webstore/troubleshooting/)
- [Manifest V3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
- [Deal with remote hosted code violations](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)
- [Chrome Web Store review process](https://developer.chrome.com/docs/webstore/review-process)
- [User data policy FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/)
- [Chrome Web Store privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Stay secure](https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure)
- [Extension quality guidelines FAQ](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines-faq/)
- [Spam policy FAQ](https://developer.chrome.com/docs/webstore/spam-faq/)
- [Manifest reference](https://developer.chrome.com/docs/extensions/reference/manifest)
- [Permissions reference](https://developer.chrome.com/docs/extensions/reference/permissions-list)
- [Service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [End-to-end testing](https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing)
- [Supplying Images](https://developer.chrome.com/docs/webstore/images)
- [Creating a great listing page](https://developer.chrome.com/docs/webstore/best-listing)
- [Provide test instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions)

### AI-assisted extension development

- [Build extensions with coding agents](https://developer.chrome.com/docs/extensions/ai/build_with_ai)
- [Extensions and AI](https://developer.chrome.com/docs/extensions/ai)

### Scaffolds and examples

- [WXT repository](https://github.com/wxt-dev/wxt)
- [WXT manifest configuration](https://wxt.dev/guide/essentials/config/manifest)
- [WXT publishing](https://wxt.dev/guide/essentials/publishing)
- [Extension.js repository](https://github.com/extension-js/extension.js)
- [CRXJS repository](https://github.com/crxjs/chrome-extension-tools)
- [Plasmo repository](https://github.com/PlasmoHQ/plasmo)
- [Official Chrome extension samples](https://github.com/GoogleChrome/chrome-extensions-samples)
