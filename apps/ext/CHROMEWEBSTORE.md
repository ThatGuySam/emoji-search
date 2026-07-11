# FetchMoji Chrome Web Store handoff

## SBC4

- `Tease:` This package is development-only and must not be submitted yet.
- `Lede:` The file records the current single purpose, permissions, data behavior, reviewer path, and known gaps from the actual scaffold.
- `Why it matters:` Chrome dashboard answers must follow tested package behavior, not planned features or generated copy.
- `Go deeper:` Re-run the release evidence and update every section before a trusted-test or public upload.

## Status

**Development boilerplate — not ready for submission.**

## Single purpose

Find and copy the right emoji from a phrase the user explicitly types into the
extension popup.

## Current user flow

1. Open FetchMoji from the toolbar or configured keyboard shortcut.
2. Type a feeling, situation, or object.
3. Review local keyword matches from the bundled `emojilib` catalog.
4. Choose an emoji to copy it.

## Permissions

| Permission | Current justification | Verification status |
| --- | --- | --- |
| `clipboardWrite` | Copies the emoji selected by an explicit user click | Build verified; packaged Chrome behavior and warning still require manual verification |

No host permissions, content scripts, tab access, page reading, history,
cookies, background service worker, external messaging, or remote code are
declared.

## Data handling

- Query text remains in popup memory and is not stored or transmitted.
- Search reads the `emojilib` catalog bundled in the extension package.
- The selected emoji is written to the local clipboard after a user action.
- No analytics, account, cookies, or remote API exist in this scaffold.

These statements must be confirmed with a clean-profile network trace against
the exact production ZIP before submission.

## Remote hosted code

None intended. JavaScript and catalog data are bundled by WXT. Inspect the
production ZIP and runtime network log before declaring this in the dashboard.

## Reviewer path

1. Click the FetchMoji toolbar action.
2. Enter `rocket`.
3. Select 🚀 and confirm the copy status.
4. Paste into a local text field.
5. Disable networking and repeat a search to confirm local operation.

No account or paid credential is required.

## Blockers before trusted testing

- [ ] Replace keyword-only matching with the shared FetchMoji semantic search contract.
- [ ] Approve final FetchMoji icon and store assets.
- [ ] Run packaged Chrome copy, shortcut, keyboard, zoom, dark-mode, and offline tests.
- [ ] Add component accessibility and packaged-browser E2E coverage.
- [ ] Capture permission-to-code map, ZIP inventory, and clean-profile network trace.
- [ ] Publish and verify support and privacy-policy URLs.
- [ ] Complete the full P0 release inventory in `apps/docs`.
