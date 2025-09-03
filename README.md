# Better Emoji Search

Find the perfect emoji using your own words.
All ranking and inference run fully client‑side (no servers, no telemetry).

### Demo

`https://emoji.samcarlton.com`

---

## Highlights

* **Mobile‑first** layout tuned for iOS Safari: sticky search header, instant results, safe‑area insets, 44×44pt hit targets.
* **Type = search** with `enterkeyhint="search"`, live updates as you type (no explicit submit).
* **Tap to copy** with a polite toast and light haptic feedback when available.
* **Accessibility first**: clear labels, `role="img"` on glyphs, `aria-label` on buttons, `role="status"` for the toast.
* **Works offline** after first load; artifacts are cached by the browser.
* **Liquid‑glass UI** vibe: heavier rounded corners, soft shadows, subtle blur, reduced‑motion friendly.

---

## Tech stack

* **Astro + React** (`client:load` islands)
* **PGlite (WASM) + pgvector** fully in the browser
* **Hugging Face Transformers.js** (Xenova `gte-small` ONNX)
* **WebAssembly SIMD + Threads** when cross‑origin isolated; WebGPU used if supported by runtime
* **Artifacts streamed & cached** in the browser; large files compressed (zstd with brotli fallback)
* **Tailwind v4** (via Vite plugin)

---

## Data & seeding

* The **vector table is prebuilt** and packed into a tarball that PGlite restores at runtime.
* Source lists include the core emoji set (≈3k) plus curated synonyms and verb→emoji hints.
* Artifacts live in `src/artifacts/`.

Optional seed helper (builds/refreshes artifacts): `pnpm seed`

---

## Key code

* `src/components/App.tsx` — UI & interactions (instant search, chips, copy toast, bottom sheet)
* `src/components/Root.tsx` — wraps app in `StrictMode` and an `ErrorBoundary`
* `src/components/ErrorBoundary.tsx` — lightweight crash guard with a reload fallback
* `src/utils/db.ts` — loads the prebuilt DB and runs vector search
* `src/utils/worker.ts` — hosts Transformers.js embedding work off the main thread

---

## Performance

* Target **<100ms** perceived keystroke → result update
* Preload models/DB after first paint; lazy‑init non‑critical work
* Use `content-visibility`, minimal reflows, memoized lists
* Artifacts compressed (zstd preferred; brotli fallback) and **range‑request friendly** for cold starts
* Recommend: **automatic Zstandard compression and caching via Cloudflare Rules**

---

## Accessibility

* Each emoji button has a clear, descriptive `aria-label`
* Copy confirmation is a non‑blocking `role="status"` toast
* Keyboard users keep focus in the field; results update live (ARIA‑live polite)
* Respect `prefers-reduced-motion`; maintain AA/AAA contrast targets

---

## Compatibility

* Optimized for **iOS Safari**; also works on recent Chrome/Edge/Firefox
* Uses **WASM SIMD** everywhere; **WASM Threads** when cross‑origin isolation is enabled
* If threads aren’t available, it gracefully runs single‑threaded (slower, still functional)

---

## Production hosting (Cloudflare R2 + CDN)

Static build; no server required. Recommended shape:

* Host large artifacts (models/DB tar) in **Cloudflare R2** behind **Cloudflare CDN**
* Immutable, content‑hashed filenames + long‑lived cache headers
* **Cross‑Origin Isolation** headers to unlock WASM Threads/SharedArrayBuffer

Example response headers (set via Cloudflare Rules/Workers):

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: cross-origin
Permissions-Policy: vibrate=*, gyroscope=()
Timing-Allow-Origin: *
Cache-Control: public, max-age=31536000, immutable
```

If artifacts are on a different origin, ensure **CORS + `Cross-Origin-Resource-Policy`** allow embedding under COEP.

---

## Develop

Install deps:

```bash
pnpm i
```

Run locally:

```bash
pnpm dev
```

Build and preview:

```bash
pnpm build
pnpm preview
```

Seed helper (optional for scripts that prepare artifacts):

```bash
pnpm seed
```

Test (Vitest):

```bash
pnpm test --run
```

**Notes**

* Output is static (`dist/`). Host on any CDN/static host.
* Large assets are included via Vite `assetsInclude` so tar files ship.

---

## Roadmap

* Benchmarks & accuracy tests (top‑k precision/recall)
* Multimodal descriptors research
* Quantize model toward \~17 MB target
* Auto‑expand synonyms/tags for \~3k emojis
* Cache DB in browser storage for instant warm starts
* Mirror HF LFS repos into object storage
* SEO/LLM discovery routes (e.g., `/emoji-for-attachment`)
* Hunspell‑based spelling tolerance
* Progressive loaders for cold start
* Start model + emoji downloads ASAP; preconnects for model host
* zstd experiment with WASM polyfill (for non‑zstd hosts)
* CMD+K launcher & `/` to focus search
* Trending intents (e.g., film/album releases) via external signals

**Done**

* Threads for worker inference via Cloudflare header rule (COOP/COEP)
* Transformers.js updates
* Initial page‑speed work
* Model compression first pass
* Emoji loading end‑to‑end
* Mobile layout refinements (safe areas, non‑wrapping search row, a11y labels)

---

## Privacy

* 100% client‑side; **no prompts or text leave the browser**
* No cookies, no analytics by default (add your own if you must)

---

## References

* Transformers.js example that inspired this repo:
  `https://github.com/huggingface/transformers.js-examples/tree/main/pglite-semantic-search`
* In‑browser semantic search article:
  `https://supabase.com/blog/in-browser-semantic-search-pglite`
