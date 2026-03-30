# SQLite UI Browser + iOS Verification

Date: 2026-03-29

Status: `verified with targeted fix`

## What I Checked

- `agent-browser` desktop against:
  - `https://fetchmoji.com/?search_backend=sqlite&strict_backend=1`
- `agent-browser` iOS simulator against:
  - `https://fetchmoji.com/?search_backend=sqlite&strict_backend=1`
- local preview after the fix via:
  - `http://127.0.0.1:4321/?search_backend=sqlite&strict_backend=1`

## What I Found

- The sqlite route loaded on desktop and in the iPhone simulator.
- Search results were usable, but every result tile exposed the same generic
  accessibility label: `Copy emoji emoji`.
- The result tiles also lost their native button semantics because the button
  element itself was assigned `role="listitem"`.

## Fix

- Added emoji-name resolution for emoji-only result rows using `emojilib`.
- Changed the result grid markup to a real list with buttons inside each list
  item.
- Added targeted tests for:
  - emoji name resolution
  - result-tile accessible names
  - copy handler metadata

## Verification Run

- `pnpm test --run src/components/ResultGrid.test.tsx src/utils/emojiResult.test.ts src/utils/searchConfig.test.ts src/utils/sqlite.test.ts`
  - status: `passed`
- `pnpm build`
  - status: `passed`

## Notes

- A local headless preview stayed on the loading state during the short
  `agent-browser` wait window, so the post-fix proof comes from the targeted
  component and utility tests rather than a full local inference run.
- I did not re-deploy this follow-up accessibility fix in this pass.
