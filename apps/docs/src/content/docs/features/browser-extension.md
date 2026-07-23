---
title: Browser extension
description: A low-permission Chrome extension opens local emoji search from the toolbar or a shortcut and copies the selected result.
sidebar:
  badge:
    text: Planned
    variant: note
---

## SBC4

- `Tease:` The extension turns a destination into a repeated writing tool.
- `Lede:` A Chrome toolbar action or shortcut opens the same local search with minimal permissions and one-click copy.
- `Why it matters:` Marketplace discovery and reuse are stronger ignition than a launch leaderboard alone.
- `Go deeper:` Review the permission boundary, update states, and packaging questions.

The browser extension turns FetchMoji from a destination into a reusable writing
tool. It provides private search in a compact surface without reading the
current page. WXT, TypeScript, and React produce one Chrome Manifest V3 package.

## Current implementation

The repository contains a working development scaffold at `apps/ext`. It opens
from the toolbar or the `_execute_action` command, focuses a labeled search
field, ranks the bundled `emojilib` catalog with deterministic keyword matching,
supports arrow-key navigation, and copies a selected emoji with a manual-copy
fallback.

This scaffold is not the finished semantic-search feature and is not ready for
Chrome Web Store submission. It makes no network requests and declares only
`clipboardWrite`; it has no host permissions, content script, background
service worker, page reading, analytics, account, or remote code.

## Behavior

1. The user installs the Manifest V3 extension from the Chrome Web Store.
2. A toolbar action or configurable keyboard shortcut opens a compact search
   panel and focuses its labeled input.
3. Search uses the packaged or checksum-verified data artifact and the same typed
   ranking package as the website.
4. The user selects a result to copy it. The panel confirms success and can
   close without modifying the active page.
5. A link opens the full FetchMoji site for intent explanations and methodology.
6. Data updates replace immutable, checksum-verified artifacts without
   collecting the user's queries or browsing context. Executable JavaScript and
   WebAssembly update only through a reviewed extension release.

## Inputs & outputs

- **Inputs:** explicit user text in the extension field, optional locale, result
  limit, and the configured command shortcut.
- **Outputs:** ranked emoji results and a clipboard write after selection.
- **Permissions:** the development scaffold declares `clipboardWrite` for an
  explicit copy action. Keep it only if packaged Chrome testing proves it is
  required and the permission warning matches the store disclosure. Add
  `storage` only when shipped code calls `chrome.storage`. No host permissions,
  `activeTab`, tab content, history, cookies, scripting, or page-reading
  permission.

## States & edge cases

- **First run:** show one sentence on local search and the minimal permission
  boundary; do not require an account.
- **Index initializing:** retain input and expose progress just as the website
  does.
- **Shortcut conflict:** explain how to assign a different command in Chrome.
- **Clipboard failure:** keep the emoji selected and provide a manual-copy path.
- **Offline:** search works after required artifacts are installed or cached.
- **Artifact update failure:** keep the last verified artifact and retry later.
- **Unsupported browser:** link to the website; do not claim cross-browser
  support until a package is tested and published.
- **Extension removed:** no remote profile or query history remains to delete.
- **Service worker suspended:** no user-visible state is lost. Prefer no worker;
  if one is required, persist durable state outside its globals and test forced
  termination.
- **Corrupt artifact:** reject the update, retain the last verified artifact,
  and keep search usable.

## Package and review contract

- WXT generates the Manifest V3 build and production ZIP; React renders the
  popup, while the search package remains UI-independent TypeScript.
- All executable JavaScript and WebAssembly are bundled in the submitted ZIP.
  Remote model or index files are data only and cannot select or modify logic.
- The production manifest contains no development-only permissions added for
  hot reload.
- The product repository maintains a human-reviewed `CHROMEWEBSTORE.md` with the
  single purpose, permission justifications, data use, remote-code declaration,
  test steps, listing copy, URLs, and release evidence.
- Release CI covers typecheck, lint, ranking parity, component states,
  accessibility, packaged Chrome E2E, service-worker termination when relevant,
  network privacy, permissions, remote-code scanning, secrets, dependencies,
  ZIP contents, and size budgets.
- Public submission requires a trusted-tester pass, complete factual store
  assets, a clean-profile network trace, update/offline/uninstall evidence, and
  an owned support and rollback path.

## Test the development scaffold

Install and start WXT from the extension app:

```bash
cd apps/ext
pnpm install --ignore-workspace
pnpm dev
```

For a production-like package, run:

```bash
pnpm check
```

Then open `chrome://extensions`, enable **Developer mode**, choose **Load
unpacked**, and select `apps/ext/.output/chrome-mv3`.

The manual smoke test:

1. Pin FetchMoji and open the popup.
2. Search for `rocket`; verify that 🚀 appears.
3. Use Arrow Down and Arrow Up to move between the input and results.
4. Select 🚀, paste into a local text field, and verify the copy status.
5. Open the popup with `Ctrl+Shift+E` or `Command+Shift+E`.
6. Repeat with networking disabled.
7. Check dark mode, browser zoom, the empty state, a no-match query, and the
   manual-copy fallback.

The HTTP-served popup has been visually smoke-tested, but that does not prove
extension-context clipboard behavior, the permission warning, or the configured
shortcut. Those checks require the unpacked production build in Chrome.

## Data shape

```ts
type ExtensionSettings = {
  locale: string
  resultLimit: number
  artifactVersion: string
  hasSeenPrivacyNote: boolean
}

type ExtensionArtifact = {
  version: string
  sha256: string
  createdAt: string
  byteLength: number
  localeCoverage: string[]
}
```

## Decisions

- **2026-07-11 — Chrome is the first extension surface.** It provides a relevant
  discovery marketplace and constrains the first package to one tested runtime.
- **2026-07-11 — No page-reading permissions.** FetchMoji searches only text the
  user explicitly enters into its own interface.
- **2026-07-11 — The extension is the primary launch object.** Product Hunt and
  technical communities support the extension release rather than substitute
  for it.
- **2026-07-11 — WXT, TypeScript, and React are the extension scaffold.** WXT is
  active, supports Chrome-first MV3 packaging and later browser targets, and is
  already used by another extension in this workspace.
- **2026-07-11 — Search logic is shared; packaging is surface-specific.** The
  website and extension import the same typed search/ranking package, while the
  extension owns its manifest, ZIP, compatibility declaration, and artifact
  delivery choice.
- **2026-07-11 — Store evidence is a first-class artifact.** The product
  repository maintains `CHROMEWEBSTORE.md` and derives disclosures from tested
  behavior instead of generated intent.
- **2026-07-11 — Keyword matching is an interim scaffold, not the search
  contract.** It makes the popup testable while the website's typed semantic
  search and artifact adapter are extracted into a shared package.

## Open question

- Is Firefox the second supported store, or does evidence point to Edge first?

## Research

- [Chrome extension specs, boilerplates, rejection risks, and quality inventory](/research/chrome-extension-specs-boilerplates-rejections-quality-inventory-2026-07-11/)
