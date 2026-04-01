# Astro + HuggingFace + Cloudflare + Web Workers

This repo runs semantic emoji search fully in the browser:

- Astro serves the UI (React island).
- A browser Web Worker runs Transformers.js for embeddings.
- PGlite + pgvector runs vector search client-side.
- Cloudflare (R2 + CDN + Worker) serves artifacts and required headers.

The result is no runtime API for inference or ranking.

## End-to-end flow

1. User types text in the React app (`src/components/App.tsx`).
2. `EmojiSearchCore` debounces and sends text to a Web Worker (`src/hooks/useEmojiSearch.ts`).
3. Worker loads/uses HuggingFace model via Transformers.js and returns an embedding (`src/utils/worker.ts`).
4. Main thread queries local PGlite vector DB with that embedding (`src/utils/db.ts`).
5. UI renders best matching emojis.

## 1) Astro + React island + worker bundling

Astro entry page mounts React on the client:

- `src/pages/index.astro` -> `<Root client:load />`

Inside React, the worker is imported using Vite worker syntax:

```ts
import OptimusWorker from "@/utils/worker.ts?worker";
```

That gives a real browser worker constructor at runtime:

```ts
const worker = new OptimusWorker();
worker.postMessage({ type: "preload" });
```

Why this matters:

- Model inference does not block the UI thread.
- Worker lifecycle is explicit and can be terminated on cleanup to free memory (`destroy()` in `src/hooks/useEmojiSearch.ts`).

## 2) HuggingFace models from Cloudflare-hosted artifacts

Transformers.js is configured to fetch models from Cloudflare CDN, not directly from HuggingFace:

- `src/constants.ts`
  - `MODELS_HOST = "https://cdn.fetchmoji.com"`
  - `MODELS_PATH_TEMPLATE = "{model}/resolve/{revision}/"`
- `src/utils/worker.ts`
  - `env.allowRemoteModels = true`
  - `env.remoteHost = MODELS_HOST`
  - `env.remotePathTemplate = MODELS_PATH_TEMPLATE`

The worker builds a `feature-extraction` pipeline with `DEFAULT_MODEL` and returns normalized embeddings.

### Model mirror/upload path

To mirror model files (including LFS blobs) into R2 in HuggingFace-compatible layout:

- `scripts/mirror-hf-repo.ts`
- Target key pattern:
  - `<model>/resolve/<revision>/<file>`

That key shape is what `remotePathTemplate` expects.

## 3) Browser DB artifacts (PGlite + pgvector)

Search uses a prebuilt PGlite data directory fetched from CDN:

- URL constant: `R2_TAR_URL` in `src/constants.ts`
- Loader: `loadPrebuiltDb()` in `src/utils/db.ts`

Loader behavior:

- Fetches `.bin`, `.bin.zst`, or compressed variants.
- Decompresses (zstd or brotli fallback).
- Boots PGlite with `loadDataDir`.

Then each query embedding is searched with pgvector distance in SQL (`search()` in `src/utils/db.ts`).

## 4) Why Cloudflare Worker headers are required

Transformers + ONNX runtime can use multi-threaded WASM only when the page is cross-origin isolated.

`src/worker.ts` adds:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

It also adds CORS for artifact-like paths (`.tar`, `.bin`) for allowlisted origins.

`wrangler.jsonc` uses:

- `main: "src/worker.ts"`
- `assets.run_worker_first: true`

So even static Astro assets are passed through the Worker and receive required headers.

## 5) Artifact build + upload workflow

Build the DB artifacts:

```bash
pnpm seed
```

This runs `scripts/seed-emoji.ts`, which:

- Builds emoji docs + embeddings.
- Dumps PGlite data dir tar.
- Writes compressed variants (`.zst`).
- Optionally uploads artifacts to R2 with `--with-upload`.

Upload helper uses signed S3-compatible requests:

- `src/utils/r2.node.ts`

## 6) Local development modes

Use one of these:

- `pnpm dev` -> Astro dev only.
- `pnpm dev:prototype` -> Astro + `wrangler pages dev` proxy.

Use `dev:prototype` when testing COOP/COEP behavior and threading, because header behavior should match production.

Important update as of 2026-03-31:

- Homepage search now requests the DB tar and model files through worker-backed
  proxy routes (`/proxy/db/...` and `/proxy/models/...`) so preview domains do
  not depend on `cdn.fetchmoji.com` CORS allowlists.
- Plain static preview (`pnpm preview`) will not emulate those proxy routes.
  Use a worker-backed environment or the deployed preview domain for
  high-fidelity search verification.

`App.tsx` logs cross-origin isolation status on mount, which is useful for quick verification.

## 7) Common integration failures

- `SharedArrayBuffer is not defined`
  - Cause: missing COOP/COEP.
  - Fix: verify Worker headers and that responses are served through `run_worker_first`.

- Model files 404
  - Cause: wrong `MODELS_HOST` or path template mismatch with object keys.
  - Fix: ensure keys follow `<model>/resolve/<revision>/...`.

- CORS errors on `.tar`/`.bin`
  - Cause: origin not in allowlist or missing CORS headers.
  - Fix: update `ALLOWED` in `src/worker.ts` and confirm response headers.

- Slow or unstable mobile behavior
  - Cause: model work on main thread or memory pressure.
  - Fix: keep inference in worker, use debounce, and terminate worker on cleanup.

## Key files map

- `src/pages/index.astro` - Astro entry page for React island.
- `src/components/App.tsx` - Search UI and query dispatch.
- `src/hooks/useEmojiSearch.ts` - Worker orchestration + state + debounce.
- `src/utils/worker.ts` - Transformers.js inference worker.
- `src/utils/db.ts` - PGlite load and vector search.
- `src/constants.ts` - Model/artifact host paths.
- `src/worker.ts` - Cloudflare Worker headers and CORS.
- `wrangler.jsonc` - Worker + static asset wiring.
- `scripts/seed-emoji.ts` - Build DB artifacts.
- `scripts/mirror-hf-repo.ts` - Mirror HuggingFace model repos to R2.
