# SQLite Experiment Rollout

Date: 2026-03-29

Status: `partially verified`

## Commands

- `pnpm seed:sqlite`
  - status: `passed`
  - note: generated `public/db/emoji-search.sqlite` at `3.77 MiB`
- `pnpm test --run src/utils/searchConfig.test.ts src/utils/sqlite.test.ts`
  - status: `passed`
- `pnpm build`
  - status: `passed`
- `git push -u origin codex/sqlite-experiment-flag`
  - status: `passed`
- `pnpm fast-deploy`
  - status: `passed`
  - url: `https://fetchmoji.samcarlton.workers.dev`
- `curl -I https://fetchmoji.samcarlton.workers.dev/`
  - status: `passed`
- `curl -I https://fetchmoji.samcarlton.workers.dev/db/emoji-search.sqlite`
  - status: `passed`
- `curl -I https://fetchmoji.com/`
  - status: `passed`
- `curl -I https://fetchmoji.com/db/emoji-search.sqlite`
  - status: `passed`
- browser smoke against:
  - `https://fetchmoji.samcarlton.workers.dev/`
  - `https://fetchmoji.samcarlton.workers.dev/?search_backend=sqlite&strict_backend=1`
  - status: `passed`
  - note: backend badge showed `PGLITE` on default and `SQLITE` on the query-string route
- browser smoke against:
  - `https://fetchmoji.com/`
  - `https://fetchmoji.com/?search_backend=sqlite&strict_backend=1`
  - status: `passed`
  - note: backend badge showed `PGLITE` on default and `SQLITE` on the query-string route with no fallback detected

## What Was Verified

- The SQLite experiment is wired behind the `search_backend=sqlite` query
  parameter.
- The generated SQLite DB is deployed and directly fetchable in production.
- The live app loads and renders with the SQLite backend selected via query
  string.
- The default route still resolves to the existing `pglite` backend.
- The same query-string routing works on the production hostname
  `https://fetchmoji.com`.

## What Remains Unverified

- Live result-quality parity between `pglite` and `sqlite` for a broader set of
  production queries.
- Runtime performance comparisons in production.
- A stronger browser assertion on a known query/result pair; the quick live
  smoke used the backend badge as the primary proof that the route selected the
  SQLite path.

## Notes

- `pnpm exec tsc --noEmit` still reports several pre-existing repository type
  errors outside the new SQLite feature work, so typecheck is not a green gate
  for this repo today.
