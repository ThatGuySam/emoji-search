# FetchMoji — documentation (spec)

## SBC4

- `Tease:` These docs specify FetchMoji's next growth iteration.
- `Lede:` FetchMoji is already live; this site describes the reviewed target state for search readiness, intent pages, privacy, agent discovery, and extension distribution so a coding agent can implement the next iteration without inventing product decisions.
- `Why it matters:`
  - The growth work spans product, content, distribution, and privacy; one explicit contract keeps those surfaces aligned.
  - The site is the durable, machine-readable spec — `/llms-full.txt` is what a build agent reads.
- `Go deeper:`
  - Read [`AGENTS.md`](AGENTS.md) for the build handoff once the docs are reviewed.
  - Built with the `docs-spec` skill.

## Stack

Astro + Starlight, self-hosted Geist fonts, a re-themable Emil/Linear theme, `starlight-llms-txt`. Static output, deployable to Cloudflare Workers (or any static host).

## Develop

```bash
bun install        # npm / pnpm / yarn also work — vanilla Astro project
bun run dev        # http://localhost:4321
```

## Build & deploy

```bash
bun run build      # emits dist/ including llms.txt, llms-full.txt, llms-small.txt
```

Deploy to Cloudflare Workers (static assets). With Wrangler authenticated
(`wrangler login`, or an ambient `CLOUDFLARE_API_TOKEN`):

```bash
bunx wrangler deploy
```

The house scaffold already sets the canonical custom domain. Live at
`https://fetchmoji.docs.samcarlton.com`.

## Layout

- `src/content/docs/overview/` + `design/` — human tier (the *why*, for review).
- `src/content/docs/features/` + `architecture/` — machine tier (the *what*, the spec).
- `src/content/docs/project/` — roadmap, open questions, changelog.
- `src/content/docs/research/` — the source-backed evidence behind the spec.
