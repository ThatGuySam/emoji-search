# Production Deploy And CORS Verification

Date: 2026-04-02

Status: `verified`

## Commands

- `pnpm build`
  - status: `passed`
- `pnpm test --run src/utils/emojiSearchDocs.test.ts src/data/curatedEditorialAliases.test.ts src/utils/intentPageEditorialKeywords.test.ts`
  - status: `passed`
- `WRANGLER_LOG_PATH=/tmp/wrangler.log XDG_CACHE_HOME=/tmp node_modules/.bin/wrangler deploy`
  - status: `passed`
- `CHECK_BASE_URL=https://fetchmoji.com CHECK_SCREENSHOT_DIR=docs/verification/screenshots/prod-post-deploy-2026-04-02 node scripts/post-deploy-check.mjs`
  - status: `passed`
- `curl -sI https://fetchmoji.com/`
  - status: `passed`
- `curl -sI https://fetchmoji.samcarlton.workers.dev/`
  - status: `passed`
- `curl -sI -H 'Origin: https://fetchmoji.com' https://fetchmoji.com/proxy/db/src/artifacts/Xenova/gte-small-384/emoji-int8.tar`
  - status: `passed`
- `curl -sI -H 'Origin: https://fetchmoji.com' https://fetchmoji.com/proxy/models/Xenova/gte-small/resolve/main/config.json`
  - status: `passed`

## Deployment

- Worker: `fetchmoji`
- Version ID: `86f49fe9-7719-43ae-8601-3a55648ab9e5`
- Wrangler trigger output:
  - `https://fetchmoji.samcarlton.workers.dev`

## What Was Verified

- The production deploy command completed successfully.
- `fetchmoji.com` and `fetchmoji.samcarlton.workers.dev` returned the same
  `ETag` after deploy, indicating production is serving the newly deployed
  build.
- The Playwright post-deploy script passed for `https://fetchmoji.com`.
- Screenshots were saved to:
  `docs/verification/screenshots/prod-post-deploy-2026-04-02`
- Production homepage headers include:
  - `Cross-Origin-Embedder-Policy: require-corp`
  - `Cross-Origin-Opener-Policy: same-origin`
- Production proxy routes return:
  - `Access-Control-Allow-Origin: https://fetchmoji.com`
  - `Vary: Origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
  - `Cross-Origin-Opener-Policy: same-origin`

## Conclusion

Production deploy succeeded, browser-level post-deploy checks passed, and CORS
for the proxied DB/model assets is configured correctly on `fetchmoji.com`.
