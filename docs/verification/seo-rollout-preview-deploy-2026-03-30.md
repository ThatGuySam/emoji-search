# SEO Rollout + Preview Deploy Verification

Date: 2026-03-30  
Status: `partially verified`

## Screen Review Findings

- No blocking hierarchy or affordance issues found in static HTML output for the
  new hub/detail/support/about routes.
- Residual risk: interaction quality for live keyboard flow (`CMD/Ctrl+K` route
  to `/` and focus behavior) was verified by emitted script and markup, not by a
  full browser automation run.

## Commands Run

- `pnpm test --run src/data/emojiIntents.test.ts` -> passed
- `pnpm test --run src/utils/emojiSearchDocs.test.ts` -> passed
- `pnpm build` -> passed (new routes emitted, sitemap emitted)
- `pnpm dlx wrangler deploy --env seo_preview` -> passed
  - Deploy version:
    `f6a63031-0653-42cb-b1da-ce92a97167f5`
- `curl -I https://seo-preview.fetchmoji.com/` -> `200`, includes
  `x-robots-tag: noindex, nofollow`
- `curl -I https://seo-preview.fetchmoji.com/emoji-for/awkward/` -> `200`
- `curl -I https://seo-preview.fetchmoji.com/sitemap.xml` -> `200`

## Deployment Smoke Test Notes

- First deploy attempt returned Worker `1101`; root cause was missing
  `assets.binding` in Wrangler config.
- Added `assets.binding = "ASSETS"` and redeployed successfully.
- Final deploy includes trailing-slash canonical output for intent/support pages.

## Remaining Gaps

- `pnpm test --run` (full suite) reports an unhandled Playwright launch error
  because local browser binaries are not installed in this environment.
- No screenshot/video UX proof was captured in this pass.
