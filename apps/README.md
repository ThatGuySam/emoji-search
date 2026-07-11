# FetchMoji apps

## SBC4

- `Tease:` Product code, extension code, and product documentation now live together.
- `Lede:` The repository root remains the FetchMoji website; `apps/ext` contains the Chrome-first extension and `apps/docs` contains the deployed docs/spec site.
- `Why it matters:` Each surface keeps its own dependencies, lockfile, build, and release boundary without coupling changes to the website's large browser-search stack.
- `Go deeper:` Read each app's README before changing or deploying it.

## Directory map

| Path | Purpose | Package manager | Primary check |
| --- | --- | --- | --- |
| `apps/ext` | WXT + TypeScript + React browser extension | pnpm, self-contained lockfile | `pnpm check` |
| `apps/docs` | Astro Starlight product docs/spec at `fetchmoji.docs.samcarlton.com` | Bun, self-contained lockfile | `bun run build` |

The root `pnpm-workspace.yaml` intentionally continues to include only the
website. Run dependency commands inside the relevant app so native website
dependencies and the docs/extension toolchains do not modify one another.
