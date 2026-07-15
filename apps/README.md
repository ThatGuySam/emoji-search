# FetchMoji apps

## SBC4

- `Tease:` Product code, extension code, and product documentation now live together.
- `Lede:` The repository root remains the FetchMoji website; `apps/ext` contains the Chrome-first extension, `apps/docs` contains the deployed docs/spec site, and four desktop folders contain one shared renderer plus three macOS host prototypes.
- `Why it matters:` Each native host keeps its own build and release boundary while all three deliberately consume the website's tested interface and behavior contract.
- `Go deeper:` Read each app's README before changing or deploying it.

## Directory map

| Path | Purpose | Package manager | Primary check |
| --- | --- | --- | --- |
| `apps/ext` | WXT + TypeScript + React browser extension | pnpm, self-contained lockfile | `pnpm check` |
| `apps/docs` | Astro Starlight product docs/spec at `fetchmoji.docs.samcarlton.com` | Bun, self-contained lockfile | `bun run build` |
| `apps/desktop-ui` | Desktop controller around the website's shared React search surface and host contract | root website dependencies + app-local pnpm lockfile | `pnpm check` |
| `apps/mac-appkit` | Native AppKit + WKWebView macOS prototype | Swift Package Manager | `swift test` |
| `apps/mac-tauri` | Tauri + Rust macOS prototype | pnpm + Cargo, self-contained lockfiles | `pnpm check` |
| `apps/mac-electron` | Sandboxed Electron macOS prototype | pnpm, self-contained lockfile | `pnpm check` |

The root `pnpm-workspace.yaml` intentionally continues to include only the
website. Because `apps/desktop-ui` imports website source files rather than a
copy, install the root website dependencies once before installing that app's
local Vite toolchain. Native hosts and the docs/extension apps retain their own
lockfiles and release boundaries.
