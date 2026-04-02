# SEO Preview Deploy And CORS Verification

Date: 2026-04-02

Status: `verified`

## Commands

- `pnpm build`
  - status: `passed`
- `pnpm test --run src/utils/emojiSearchDocs.test.ts src/data/curatedEditorialAliases.test.ts src/utils/intentPageEditorialKeywords.test.ts`
  - status: `passed`
- `pnpm seed:sqlite`
  - status: `passed`
- `WRANGLER_LOG_PATH=/tmp/wrangler.log XDG_CACHE_HOME=/tmp node_modules/.bin/wrangler deploy --env seo_preview`
  - status: `passed`
  - note: deploy completed via interactive Wrangler OAuth in a browser session.
- `CHECK_BASE_URL=https://seo-preview.fetchmoji.com CHECK_SCREENSHOT_DIR=docs/verification/screenshots/seo-preview-post-deploy-2026-04-02 node scripts/post-deploy-check.mjs`
  - status: `passed`
- `curl -sI https://seo-preview.fetchmoji.com/`
  - status: `passed`
- `curl -sI -H 'Origin: https://fetchmoji.com' https://seo-preview.fetchmoji.com/proxy/db/src/artifacts/Xenova/gte-small-384/emoji-int8.tar`
  - status: `passed`
- `curl -sI -H 'Origin: https://fetchmoji.com' https://seo-preview.fetchmoji.com/proxy/models/Xenova/gte-small/resolve/main/config.json`
  - status: `passed`

## What Was Verified

- The repo builds locally with the current promoted curated-alias corpus.
- Targeted corpus tests passed.
- The shipped SQLite artifact was rebuilt successfully.
- The preview deployment succeeded to `https://seo-preview.fetchmoji.com`.
- Current deployed version:
  `221eebc2-b63c-4287-a63c-b2acf1d4925c`
- The Playwright post-deploy script passed against the preview deployment.
- Screenshots were saved under:
  `docs/verification/screenshots/seo-preview-post-deploy-2026-04-02`
- The preview homepage returns:
  - `Cross-Origin-Embedder-Policy: require-corp`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `X-Robots-Tag: noindex, nofollow`
- The preview proxy routes return, when sent an allowed origin header:
  - `Access-Control-Allow-Origin: https://fetchmoji.com`
  - `Cross-Origin-Embedder-Policy: require-corp`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Vary: Origin`

## Conclusion

The preview deployment succeeded and the Playwright post-deploy checks passed.

The preview domain's CORS and cross-origin-isolation headers are configured
correctly for the proxied DB and model assets.
