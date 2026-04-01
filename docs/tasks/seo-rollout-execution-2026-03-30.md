# SEO Rollout Execution Tasks

Date: 2026-03-30
Plan source:
`docs/plans/fetchmoji-seo-llm-discovery-rollout-2026-03-30.md`

## Task 01: Metadata contract and nested intent route

- Status: `completed`
- Outcome: `Layout.astro` supports per-page SEO metadata; intent routes use
  `/emoji-for/<slug>`.
- Write scope: `src/layouts/Layout.astro`, `src/data/emojiIntents.ts`,
  `src/data/emojiIntents.test.ts`, `src/lib/**`.
- Verification: `pnpm test --run src/data/emojiIntents.test.ts`, `pnpm build`.

## Task 02: Content collections schema and starter content model

- Status: `completed`
- Outcome: Astro content collections exist for intent and iOS support pages.
- Write scope: `src/content.config.ts`, `src/content/**`.
- Verification: `pnpm build`.

## Task 03: Intent hub and detail pages

- Status: `completed`
- Outcome: `/emoji-for/` and `/emoji-for/<slug>` routes render SSR answer
  content, related links, and CTA to `/`.
- Write scope: `src/pages/emoji-for/**`, `src/components/**`, `src/lib/**`.
- Verification: `pnpm build`, manual route checks.

## Task 04: iOS support cluster and about page

- Status: `completed`
- Outcome: `/ios/*` support pages and `/about/` are published from durable
  content.
- Write scope: `src/pages/ios/**`, `src/pages/about.astro`, `src/content/**`.
- Verification: `pnpm build`, manual route checks.

## Task 05: Technical discovery assets

- Status: `completed`
- Outcome: `robots.txt` and `sitemap.xml` include launch routes with canonical
  behavior.
- Write scope: `public/robots.txt`, `src/pages/sitemap.xml.ts`,
  `src/layouts/Layout.astro`.
- Verification: `pnpm build`, inspect `dist/sitemap.xml`.

## Task 06: Global launcher and keyboard behavior validation

- Status: `completed`
- Outcome: non-home fake search launcher and `CMD/Ctrl+K` route to `/` from
  content routes.
- Write scope: `src/layouts/Layout.astro`, `docs/verification/**`.
- Verification: manual browser check + verification note.

## Task 07: Preview deployment configuration

- Status: `completed`
- Outcome: Cloudflare preview environment is configured for
  `seo-preview.fetchmoji.com`.
- Write scope: `wrangler.jsonc`, `src/worker.ts`.
- Verification: `pnpm dlx wrangler deploy --env seo_preview`.

## Task 08: Final verification and handoff artifacts

- Status: `completed`
- Outcome: progress + verification docs capture what ran, what passed, and what
  remains.
- Write scope: `docs/progress/**`, `docs/verification/**`.
- Verification: artifact review.
