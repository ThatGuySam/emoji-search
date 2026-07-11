# FetchMoji browser extension

## SBC4

- `Tease:` A working Chrome-first popup, not a store-ready release.
- `Lede:` This WXT + TypeScript + React scaffold provides local keyword search, keyboard navigation, and one-click copy while the shared semantic search package is extracted from the website.
- `Why it matters:`
  - The package already follows the intended low-permission Manifest V3 boundary.
  - Search uses the real `emojilib` catalog and makes no network requests.
- `Go deeper:`
  - Read `CHROMEWEBSTORE.md` before changing permissions or preparing a submission.
  - Replace `lib/search.ts` with the shared FetchMoji search contract before calling the extension feature-complete.

## Status

Development boilerplate. It is intentionally not ready for Chrome Web Store
submission. The popup is functional, but it currently uses deterministic local
keyword matching rather than FetchMoji's semantic runtime.

## Commands

```bash
pnpm install
pnpm dev
pnpm compile
pnpm test
pnpm build
pnpm zip
pnpm check
```

WXT emits Chrome Manifest V3 builds under `.output/chrome-mv3/` and packaged
ZIPs under `.output/`.

## Current boundary

- Popup and configurable `_execute_action` shortcut.
- No content script, background service worker, host permission, page reading,
  history, tabs, cookies, analytics, or query transmission.
- `clipboardWrite` is the only declared permission because copying is a core
  user action. Confirm its behavior and warning in packaged Chrome before the
  first trusted-test release.
- Executable code is bundled in the extension package.

## Next implementation slice

1. Extract the website's typed search/ranking contract into a shared package.
2. Add a Chrome-safe artifact adapter with bundled executable JS/WASM and
   checksum-verified data.
3. Add component accessibility tests and packaged Chrome E2E tests.
4. Approve final FetchMoji branding and store assets before submission.
5. Complete every P0 gate in the extension research memo under `apps/docs`.
