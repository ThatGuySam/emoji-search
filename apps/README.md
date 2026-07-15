# FetchMoji apps

## SBC4

- `Tease:` Product code, extension code, and product documentation now live together.
- `Lede:` The repository root remains the FetchMoji website; `apps/ext` contains the Chrome-first extension, `apps/docs` contains the deployed docs/spec site, and four desktop folders contain one shared renderer plus three macOS host prototypes.
- `Why it matters:` Each product surface keeps its own dependencies, lockfile, build, and release boundary while the desktop hosts reuse one tested interface and behavior contract.
- `Go deeper:` Read each app's README before changing or deploying it.

## Directory map

| Path | Purpose | Package manager | Primary check |
| --- | --- | --- | --- |
| `apps/ext` | WXT + TypeScript + React browser extension | pnpm, self-contained lockfile | `pnpm check` |
| `apps/docs` | Astro Starlight product docs/spec at `fetchmoji.docs.samcarlton.com` | Bun, self-contained lockfile | `bun run build` |
| `apps/desktop-ui` | Shared React emoji-palette renderer and host contract | pnpm, self-contained lockfile | `pnpm check` |
| `apps/mac-appkit` | Native AppKit + WKWebView macOS prototype | Swift Package Manager | `swift test` |
| `apps/mac-tauri` | Tauri + Rust macOS prototype | pnpm + Cargo, self-contained lockfiles | `pnpm check` |
| `apps/mac-electron` | Sandboxed Electron macOS prototype | pnpm, self-contained lockfile | `pnpm check` |

The root `pnpm-workspace.yaml` intentionally continues to include only the
website. Run dependency commands inside the relevant app so native website
dependencies and the docs/extension toolchains do not modify one another.
