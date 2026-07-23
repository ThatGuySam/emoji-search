---
title: Tech stack
description: FetchMoji separates crawlable static answers, local search runtime, desktop and extension packaging, and private docs into explicit delivery surfaces.
---

## SBC4

- `Tease:` Five delivery surfaces share explicit contracts without sharing one release cycle.
- `Lede:` Crawlable HTML, local search runtimes, the macOS palette, a Manifest V3 extension, and the private docs spec stay explicit and independently deployable.
- `Why it matters:` The architecture preserves privacy while fixing cold-start and distribution constraints.
- `Go deeper:` Review runtime boundaries, release constraints, and the open performance budget.

## Delivery surfaces

| Surface | Responsibility | Target implementation |
| --- | --- | --- |
| `fetchmoji.com` | Public search and intent pages | Astro static/server-rendered HTML with a client search island |
| Search runtime | Query ranking and local artifacts | Web Worker, compact initial artifact, lazy full local corpus, clipboard adapter |
| macOS desktop palette | Global keyboard workflow and cross-app insertion | Shared React renderer inside AppKit, Tauri, and Electron prototype hosts |
| Browser extension | Repeated writing workflow | WXT + TypeScript + React, Chrome Manifest V3 popup/command, production ZIP |
| Docs spec | Review and build context | Astro Starlight at `fetchmoji.docs.samcarlton.com` with `/llms-full.txt` |
| Edge | Static delivery and crawler policy | Cloudflare assets, immutable hashed files, sitemap, robots, and explicit headers |

## Runtime boundaries

The public HTML is useful before JavaScript runs. The homepage contains product
proof and intent links; phrase pages contain their complete reviewed answer.

Interactive search initializes in a worker. The UI owns input and readiness, so
hydration or artifact work cannot discard text. A compact artifact supplies the
first useful candidates; heavier local data loads only when needed and remains
cacheable across visits.

No default search endpoint receives query text. The website and extension share
typed request/result contracts and versioned artifacts so ranking behavior can
be tested across both surfaces.

The website and macOS prototypes share presentation directly. Both render
`src/components/EmojiSearchView.tsx` with the root Tailwind theme. The desktop
controller packages a bundled `emojilib` index instead of the website's
semantic model and database runtime. All three native hosts consume
`apps/desktop-ui/dist` and expose only `insertEmoji` and `dismiss`.

AppKit serves the static renderer through a private read-only
`fetchmoji://app/` scheme. Tauri uses a command allowlist and restrictive CSP.
Electron keeps Node integration disabled, enables context isolation and
renderer sandboxing, and validates IPC senders against the bundled renderer.

The search/ranking package remains independent of Astro, React, and WXT. The
website and extension can package different initial data artifacts when size or
startup evidence requires it, but both declare the same schema and ranking
compatibility. The extension bundles every executable JavaScript and WebAssembly
file; a remotely fetched model or index is inert, immutable data only.

The current `apps/ext` development scaffold deliberately precedes that shared
package. It bundles `emojilib` and deterministic keyword ranking directly in the
extension so the Manifest V3 shell, popup interaction, accessibility behavior,
copy path, and packaging boundary can be tested independently. Replacing that
interim search module with the shared semantic contract is the next architecture
step, not an optional quality improvement.

## Build and release constraints

- Every artifact is content-addressed or carries a version plus checksum.
- The website can deploy content without forcing an extension release.
- A desktop build installs the root website dependencies before the app-local
  renderer toolchain, then packages the same `desktop-ui/dist` in every shell.
- The native hosts validate selections, copy before hiding, and report
  copy-only behavior instead of claiming insertion when macOS permission is
  unavailable.
- An extension package declares compatible artifact/schema versions.
- The product repository maintains `CHROMEWEBSTORE.md` as the reviewed source
  for purpose, permission, privacy, remote-code, listing, and reviewer facts.
- WXT development permissions are never allowed to leak into the production
  manifest or ZIP.
- Intent pages build only from reviewed records.
- Production release checks cover cold search readiness, offline repeat use,
  canonical/hreflang integrity, crawler responses, and observed network privacy.
- The docs spec changes with any product contract change; docs are not a test
  substitute.

## Extension verification stack

- **Unit:** deterministic search, ranking, locale, schema, and artifact tests.
- **Component:** popup states, keyboard behavior, focus, and live-region output.
- **Browser:** production-build E2E in Chrome using Playwright or Puppeteer,
  including clean install, copy, reopen, offline repeat use, update, and removal.
- **Lifecycle:** forced service-worker termination when a worker exists.
- **Policy:** manifest-to-code permission map, network trace, remote-code scan,
  dependency and secret scan, and exact ZIP inventory.
- **Submission:** trusted-test package, human-reviewed `CHROMEWEBSTORE.md`, store
  assets, reviewer steps, rollback package, and release provenance.

The scaffold's `pnpm check` gate runs TypeScript compilation, unit tests, the
production Chrome Manifest V3 build, and ZIP creation. It does not replace
packaged-browser E2E, accessibility automation, a clean-profile network trace,
or manual verification of clipboard and shortcut behavior.

## Performance strategy

The current live audit observed a 3.95 MB SQLite request and roughly 4.76 MB of
transferred resources in one unthrottled cold mobile-browser run. The target
architecture treats startup bytes and initialization as product constraints.

The final performance budget remains an open project decision, but the system
must measure time from first input to first useful result on cold and repeat
loads, including low-end mobile and slow-network profiles.
