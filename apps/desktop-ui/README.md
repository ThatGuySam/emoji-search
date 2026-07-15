# FetchMoji desktop UI

## SBC4

- `Tease:` The website's real search surface now runs unchanged inside all three desktop hosts.
- `Lede:` This app imports the root `EmojiSearchView` component and `global.css`, adds a bundled `emojilib` search controller, keeps focus in the query field, and sends only `insertEmoji` or `dismiss` across a narrow desktop-host bridge.
- `Why it matters:` Website UI refinements flow into AppKit, Tauri, and Electron from one component tree instead of drifting into a fourth interface.
- `Go deeper:` Install the root website dependencies, then this app's local toolchain and run `pnpm check`; shell-specific commands live in the sibling `mac-*` app READMEs.

## Host contract

The renderer looks for `window.fetchmojiHost` first, uses Tauri's invoke bridge
when it detects a Tauri runtime, and otherwise falls back to the browser
Clipboard API.

```ts
interface DesktopHost {
  insertEmoji(emoji: string): Promise<{
    mode: "pasted" | "copied"
    message: string
  }>
  dismiss(): Promise<void>
}
```

The renderer never receives filesystem, process, shell, or arbitrary IPC
access. Search queries and the bundled emoji index stay local.

## Shared website boundary

The desktop renderer does not carry a forked palette stylesheet or a copied
version of the website markup. It imports these root sources directly:

- `src/components/EmojiSearchView.tsx`
- the website primitives used by that view, including `Input`, `Button`,
  `ResultGrid`, and `EmojiButton`
- `src/styles/global.css`

`src/components/App.tsx` also renders `EmojiSearchView`, so the website and
desktop builds have the same search field, clear button, result heading,
responsive emoji grid, dark theme, focus treatment, and accessibility labels.
The controllers intentionally differ: the website retains its semantic search
pipeline, while this prototype uses a small bundled keyword index so the native
shell comparison stays local. The renderer intentionally has a monorepo source
dependency on the website; it is not a standalone UI fork.

## Commands

```bash
cd ../..
pnpm install

cd apps/desktop-ui
pnpm install --ignore-workspace
pnpm dev
pnpm check
```

The production build is written to `dist/`. Each native shell packages or
loads that same directory.
