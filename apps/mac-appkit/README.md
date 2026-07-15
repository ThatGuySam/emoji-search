# FetchMoji AppKit prototype

## SBC4

- `Tease:` This is the native reliability reference for the shared FetchMoji desktop palette.
- `Lede:` A dependency-free Swift shell registers `⌃⌘.`, presents the shared renderer in a non-activating `NSPanel`/`WKWebView`, and uses AppKit/Core Graphics to copy then paste the selected emoji into the prior app.
- `Why it matters:` AppKit provides the clearest baseline for focus behavior, Accessibility permission, native packaging, and a future Mac App Store submission.
- `Go deeper:` Build `../desktop-ui` first, run the Swift tests, then launch with `FETCHMOJI_SHOW_ON_LAUNCH=1 swift run` while iterating.

## Run from source

```bash
cd ../desktop-ui
pnpm install --ignore-workspace
pnpm build

cd ../mac-appkit
swift test
FETCHMOJI_SHOW_ON_LAUNCH=1 swift run
```

The environment flag opens the palette immediately for development. Without
it, the process waits for the global `⌃⌘.` shortcut.

## Build an app bundle

```bash
./scripts/build-app.sh
open ".build/app/FetchMoji AppKit.app"
```

The script builds the shared renderer, compiles the release executable,
assembles an ad-hoc-signed `.app`, and copies the renderer into the bundle.

## Permission behavior

The first attempted automatic insertion requests macOS Accessibility access.
When access is unavailable, the emoji remains on the pasteboard and the host
reports copy-only behavior. The app does not inspect the current text field or
read existing clipboard contents.

The prototype is not a signed/notarized or Mac App Store build. Store sandbox,
entitlements, shortcut settings, login-item behavior, and review proof remain
release work.
