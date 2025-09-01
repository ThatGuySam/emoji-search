# Perfect Emoji Search

Find the perfect emoji using your own words.
All ranking and inference run fully client‑side.

### Demo
`https://emoji.samcarlton.com`

---

## Highlights

- Mobile‑first layout with sticky search
  header and instant results.
- Tap to copy with a polite toast and haptic
  feedback when available.
- Accessibility: clear labels, `role="img"`
  on glyphs, `role="status"` for the toast.
- Works offline after first load.

---

## Tech stack

- Astro + React (client:load)
- PGlite (WASM) + pgvector in the browser
- Hugging Face Transformers.js
  (Xenova `gte-small` ONNX)
- Artifacts streamed and cached in the
  browser; large files compressed (zstd
  with brotli fallback)
- Tailwind v4 (via Vite plugin)

---

## How ranking works (TODO)

Results update as you type (no submit).

Signals blended per UX research:
- exact/alias/shortcode boost
- lexical over names/keywords
- semantic (text‑embedding cosine)
- small assists from curated synonyms
  and verb→emoji maps

Diversification uses MMR to avoid near
duplicates in top‑N (e.g., skin‑tones).

Presentation:
- Top hits: up to 3 exact matches first
- Then diversified list (18–24)

---

## Data & seeding

- Vector table prebuilt and packed
  into a tarball that PGlite restores at
  runtime.

Artifacts live in `src/artifacts/`.

---

## Key code

- `src/components/App.tsx` UI and
  interactions (instant search, chips,
  copy toast, bottom sheet).
- `src/components/Root.tsx` wraps the app
  in `StrictMode` and an `ErrorBoundary`.
- `src/components/ErrorBoundary.tsx`
  lightweight crash guard with a reload
  fallback.
- `src/utils/db.ts` loads the prebuilt DB
  and runs vector search.
- `src/utils/worker.ts` hosts the
  Transformers.js embedding work off the
  main thread.

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

Seed helper (optional for scripts that
prepare artifacts):

```bash
pnpm seed
```

Test (Vitest):

```bash
pnpm test --run
```

Notes
- Output is static (`dist/`). Host on any
  CDN/static host. No server required.
- Large assets are included via Vite
  `assetsInclude` so tar files ship.

---

## Performance

- Aim for sub‑100ms perceived keystroke →
  result update.
- Preload models/db after first paint.
- Use `content-visibility` and defer
  non‑critical work.
- Recommended: Compress and stream models automatically with Zstandard via Cloudflare Rules. 

---

## Accessibility

- Each emoji button is clearly labeled
  for screen readers.
- Copy confirmation is a non‑blocking
  `role="status"` toast.
- Keyboard users keep focus in the field;
  results update live.

---

## Roadmap (from notes)

- Benchmarks and accuracy tests
- Multimodal descriptors research
- Quantize model to ~17MB target
- Auto‑expand synonyms/tags for ~3k emojis
- Cache DB in browser storage
- Mirror HF LFS repos into object storage
- SEO/LLM discovery (paths like
  `/emoji-for-attachment`)
- Hunspell‑based spelling tolerance
- Progressive loaders for cold start
- Start model + emoji downloads ASAP
- zstd experiment with wasm polyfill
- Preconnects for model host
- CMD+K launcher

Done
- Threads for worker inference via Cloudflare Rule
- TF/Transformers.js update
- Initial page‑speed work
- Model compression first pass
- Emoji loading end‑to‑end
- Mobile layout refinements (safe areas,
  non‑wrapping search row, a11y labels)

---

## References

- Transformers.js example that inspired
  this repo:
  `https://github.com/huggingface/transformers.js-examples/tree/main/pglite-semantic-search`
- In‑browser semantic search article:
  `https://supabase.com/blog/in-browser-semantic-search-pglite`

