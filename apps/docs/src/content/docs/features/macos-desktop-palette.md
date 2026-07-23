---
title: macOS desktop palette
description: A global macOS shortcut opens FetchMoji's shared search interface and inserts the selected emoji into the previously focused app.
sidebar:
  badge:
    text: Prototype
    variant: tip
---

## SBC4

- `Tease:` FetchMoji opens wherever the user is already typing.
- `Lede:` Three runnable macOS prototypes share the website's real search interface, search a bundled emoji index locally, and paste through a two-method native host boundary.
- `Why it matters:` AppKit, Tauri, and Electron can be compared on focus, permissions, packaging, and distribution without comparing different interfaces.
- `Go deeper:` The prototypes work locally; shell selection, shortcut settings, signed distribution, and Mac App Store evidence remain release gates.

The macOS palette is a repository prototype, not a signed public release. It
uses the same `EmojiSearchView` component and global stylesheet as the website.
The desktop controller and native hosts remain separate so the renderer never
receives general desktop privileges.

## Behavior

1. The app starts as a background utility and registers `⌃⌘.` as its global
   shortcut.
2. The shortcut opens a centered palette and focuses the shared FetchMoji
   search field.
3. Typing searches the bundled `emojilib` keyword index without sending the
   query or selected emoji over the network.
4. Left and Right move one result; Up and Down move one rendered row; Home and
   End select the first and last result. Modified text-editing keys and input
   method composition remain owned by the search field.
5. Return chooses the active result. Clicking a result performs the same
   action.
6. The host writes the emoji to the pasteboard, hides the palette, and posts
   Command-V after the previous app regains focus.
7. Escape dismisses the palette without changing the pasteboard.

## Inputs & outputs

- **Input:** text entered explicitly in the palette, an optional pointer
  selection, and the global shortcut.
- **Search output:** locally ranked emoji glyphs with accessible names from the
  bundled keyword source.
- **Host request:** one validated emoji sequence through `insertEmoji`.
- **Host outcome:** `pasted` when the native paste event succeeds or `copied`
  when automatic insertion is unavailable.
- **Other host action:** `dismiss`, with no filesystem, process, shell, or
  arbitrary IPC access exposed to the renderer.

## States & edge cases

- **Hidden:** the normal startup state; the global shortcut remains registered.
- **Development show-on-launch:** `FETCHMOJI_SHOW_ON_LAUNCH=1` reveals the
  palette after the renderer finishes loading.
- **Renderer loading:** AppKit, Tauri, and Electron defer the development reveal
  until their respective page-finished event so the user never receives an
  empty interactive shell.
- **No query:** the shared centered search field and reviewed prompt chips are
  visible; there is no misleading results heading.
- **No match:** the results grid is empty and focus stays in the query field.
- **Shortcut collision:** registration fails visibly. A release build needs a
  reassignment and recovery surface.
- **Accessibility denied:** the emoji remains on the pasteboard and the outcome
  is copy-only.
- **Electron Automation denied:** the emoji remains copied; the app does not
  claim insertion succeeded.
- **Input method active or editing modifier held:** the palette does not consume
  composition, Command, Option, Control, or Shift key combinations.
- **Browser-only renderer:** selection falls back to the browser Clipboard API.

## Data shape

```ts
interface DesktopHost {
  insertEmoji(emoji: string): Promise<{
    mode: "pasted" | "copied"
    message: string
  }>
  dismiss(): Promise<void>
}

type DesktopSearchResult = {
  emoji: string
  label: string
  keywords: string[]
}
```

## Shared implementation

The website and desktop renderer import the same
[`EmojiSearchView`](https://github.com/ThatGuySam/emoji-search/blob/main/src/components/EmojiSearchView.tsx)
and
[`global.css`](https://github.com/ThatGuySam/emoji-search/blob/main/src/styles/global.css).
The desktop-specific controller lives in
[`apps/desktop-ui`](https://github.com/ThatGuySam/emoji-search/tree/main/apps/desktop-ui),
and all three hosts package that one static renderer:

- [AppKit host](https://github.com/ThatGuySam/emoji-search/tree/main/apps/mac-appkit)
- [Tauri host](https://github.com/ThatGuySam/emoji-search/tree/main/apps/mac-tauri)
- [Electron host](https://github.com/ThatGuySam/emoji-search/tree/main/apps/mac-electron)

The website retains its semantic-search database and model controller. The
desktop prototype intentionally uses a smaller local keyword controller; UI
sharing does not make the privileged webview load production assets or remote
code.

## Run the prototypes

Install the website dependencies and shared renderer toolchain once from the
repository root:

```bash
pnpm install
cd apps/desktop-ui
pnpm install --ignore-workspace
pnpm build
```

Each source command below assumes the repository root. Omit
`FETCHMOJI_SHOW_ON_LAUNCH=1` to exercise the normal hidden startup and open the
palette with `⌃⌘.`.

### AppKit

```bash
cd apps/mac-appkit
swift test
FETCHMOJI_SHOW_ON_LAUNCH=1 swift run
```

```bash
./scripts/build-app.sh
open ".build/app/FetchMoji AppKit.app"
```

### Tauri

```bash
cd apps/mac-tauri
pnpm install --ignore-workspace
FETCHMOJI_SHOW_ON_LAUNCH=1 pnpm dev
```

```bash
pnpm check
pnpm build:app
open "src-tauri/target/release/bundle/macos/FetchMoji Tauri.app"
```

### Electron

```bash
cd apps/mac-electron
pnpm install --ignore-workspace
FETCHMOJI_SHOW_ON_LAUNCH=1 pnpm dev
```

```bash
pnpm check
pnpm build
open "dist/mac-arm64/FetchMoji Electron.app"
```

## Decisions

- **2026-07-15 — The website and desktop shells share presentation, not a
  copied interface.** UI refinements flow through one component tree.
- **2026-07-15 — Desktop search stays local and separate from the website
  runtime.** The prototype uses bundled keyword data rather than loading the
  production semantic-search controller into a privileged webview.
- **2026-07-15 — `⌃⌘.` is the prototype default.** It avoids the reviewed macOS,
  launcher, password-manager, editor, and VoiceOver defaults while retaining a
  visible collision failure.
- **2026-07-15 — AppKit is the reliability reference, Tauri the small
  distribution candidate, and Electron the compatibility baseline.** Real-app
  testing, not framework preference, chooses a release shell.

## Open questions

- Which shell passes the real-app focus and insertion matrix well enough to
  become the release candidate?
- Does the release use posted Command-V events, a different native insertion
  mechanism, or an input-method architecture?
- What settings and menu-bar recovery surface owns shortcut reassignment,
  collision recovery, and launch-at-login?
- Where does a desktop release rank against the Chrome extension in the product
  roadmap?

## Research

- [macOS emoji palette: desktop app patterns, shortcut audit, and prototype plan](/research/macos-emoji-palette-desktop-app-prototypes-2026-07-15/)
