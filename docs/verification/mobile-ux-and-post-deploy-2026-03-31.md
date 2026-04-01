# Mobile UX And Post-Deploy Verification

Date: 2026-03-31  
Status: `verified on preview`

## What Changed

- Intent pages now put a quick-copy emoji strip before the article header.
- Related intent links and intent hub cards now lead with representative emoji.
- Homepage now autofocuses search, keeps browse links minimal, and preconnects
  to the asset host.
- Large DB/model assets are fetched through worker-origin proxy routes so
  preview domains no longer depend on `cdn.fetchmoji.com` CORS allowlists.

## Commands Run

- `pnpm test --run src/data/emojiIntents.test.ts src/utils/emojiSearchDocs.test.ts` -> passed
- `pnpm build` -> passed
- `pnpm dlx wrangler deploy --env seo_preview` -> passed
  - Deploy version: `2a429403-937c-4168-8af6-6975d049604d`
- `CHECK_SCREENSHOT_DIR=docs/verification/screenshots/seo-preview-post-deploy-2026-03-31 pnpm check:postdeploy:preview` -> passed
- `curl -I https://seo-preview.fetchmoji.com/` -> `200`, includes `x-robots-tag: noindex, nofollow`
- `curl -I https://seo-preview.fetchmoji.com/proxy/db/src/artifacts/Xenova/gte-small-384/emoji-int8.tar` -> `200`
- `curl -I https://seo-preview.fetchmoji.com/emoji-for/awkward/` -> `200`

## UX Proof

Captured screenshots:

- `docs/verification/screenshots/seo-preview-post-deploy-2026-03-31/home-desktop.png`
- `docs/verification/screenshots/seo-preview-post-deploy-2026-03-31/home-mobile.png`
- `docs/verification/screenshots/seo-preview-post-deploy-2026-03-31/intent-mobile.png`
- `docs/verification/screenshots/seo-preview-post-deploy-2026-03-31/intent-hub-mobile.png`
- `docs/verification/screenshots/seo-preview-post-deploy-2026-03-31/ios-support-mobile.png`

What they show:

- Homepage keeps search dominant while still exposing a small browse layer.
- Intent pages place the copyable emoji actions before the explanatory copy.
- Related intent/navigation surfaces now have emoji-led scanning cues.
- iOS support pages keep support content concise and connect back to phrase
  pages with recognizable visual labels.

## Screen Review Notes

- Hierarchy: improved. The main action on intent pages is now visibly first.
- Platform fit: improved for repeated mobile use because tap targets are larger
  and the homepage remains compact.
- Repeated-use feel: improved. The same quick-copy feedback pattern now exists
  across search results and intent pages.
- Screenshots alone were not enough; the final confidence came from the
  post-deploy Playwright run covering autofocus, `Cmd/Ctrl+K` routing, proxy
  asset fetch readiness, and quick-copy interaction.

## Known Limitation

- Plain `pnpm preview` is not a high-fidelity search environment anymore
  because it does not emulate the worker proxy routes used for DB/model asset
  fetches. Use the deployed preview domain or a worker-backed environment for
  end-to-end search verification.
