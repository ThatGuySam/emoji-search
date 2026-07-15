# FetchMoji Electron prototype

**Tease:** This prototype is the compatibility baseline: FetchMoji's shared renderer inside a hardened Electron window.

**Lede:** Press `Control-Command-.` from any app, search with the keyboard, and press `Return` to paste the selected emoji into the field that previously had focus.

**Why it matters:** Electron is the fastest way to prove that the existing React interface can become a global macOS palette, but it carries the largest runtime and packaging footprint of the three prototypes.

**Go deeper:** The renderer is sandboxed, Node integration is disabled, context isolation is enabled, and the preload bridge exposes only `insertEmoji` and `dismiss`. The main process accepts IPC only from the exact bundled renderer URL.

## Run it

```bash
pnpm install --ignore-workspace
pnpm dev
```

Set `FETCHMOJI_SHOW_ON_LAUNCH=1` to open the palette immediately during visual testing. Otherwise it starts hidden and waits for `Control-Command-.`.

## Check and package it

```bash
pnpm check
pnpm build
```

The package step rebuilds `../desktop-ui` and creates an unpacked `.app` in `dist/mac*/`. It does not sign or notarize the prototype.

## Permissions

Electron writes the selected emoji to the clipboard, hides the palette, and asks macOS System Events to send `Command-V`. macOS can request both Accessibility and Automation permission for that prototype path. If either is denied, the emoji remains on the clipboard.

The research page recommends replacing the AppleScript paste shim with a small native helper before treating Electron as a release candidate.
