# FetchMoji desktop UI

## SBC4

- `Tease:` One local, keyboard-first renderer keeps the AppKit, Tauri, and Electron prototypes directly comparable.
- `Lede:` The palette searches the bundled `emojilib` keyword index, keeps focus in the query field, supports two-dimensional arrow navigation, and sends only `insertEmoji` or `dismiss` across a narrow desktop-host bridge.
- `Why it matters:` The shell experiment measures native integration and packaging instead of accidentally comparing three different interfaces.
- `Go deeper:` Run `pnpm install && pnpm check`; shell-specific run commands live in the sibling `mac-*` app READMEs.

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

## Commands

```bash
pnpm install
pnpm dev
pnpm check
```

The production build is written to `dist/`. Each native shell packages or
loads that same directory.
