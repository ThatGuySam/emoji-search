# FetchMoji Tauri prototype

**Tease:** This prototype pairs FetchMoji's shared web interface with a small Rust host and the system WebKit runtime.

**Lede:** Press `Control-Command-.` from any app, search with the keyboard, and press `Return` to paste the selected emoji into the field that previously had focus.

**Why it matters:** Tauri lets the desktop app share the exact renderer used by the Electron and AppKit prototypes while keeping the host API deliberately small.

**Go deeper:** The prototype copies the emoji first, hides itself, and then sends `Command-V` only when macOS Accessibility access is available. Without that permission the emoji remains safely on the clipboard.

## Run it

```bash
cd ../..
pnpm install

cd apps/desktop-ui
pnpm install --ignore-workspace

cd ../mac-tauri
pnpm install --ignore-workspace
pnpm dev
```

Set `FETCHMOJI_SHOW_ON_LAUNCH=1` to open the palette immediately during visual testing. Otherwise it starts hidden and waits for `Control-Command-.`.

## Check and package it

```bash
pnpm check
pnpm build:app
```

The Tauri build invokes the shared renderer in `../desktop-ui`. The packaged prototype is ad hoc and is not configured for signing, notarization, or App Store submission.

## Permissions

The first attempted paste can prompt for Accessibility access. If access is denied, FetchMoji reports that it copied the emoji instead. Grant access in **System Settings > Privacy & Security > Accessibility** to enable automatic `Command-V` delivery.
