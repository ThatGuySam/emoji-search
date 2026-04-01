# Research: SQLite + HTTP VFS + Vector Search For FetchMoji

Date: 2026-03-28

## Scope

Research how this repo could replace its current in-browser `PGlite + pgvector`
stack with a SQLite-based approach using:

- an HTTP range-backed SQLite VFS (`httpvfs`)
- vector search in the browser
- a verification plan to confirm both relevance quality and runtime behavior

This memo combines:

- repo-local context
- the two Hacker News threads provided by the user
- GitHub repos/issues
- primary SQLite/sqlite-vec docs

## Short Answer

Yes, this is feasible for this repo.

The best-fit architecture is:

1. Build a read-only `emoji.sqlite` file offline.
2. Query it in-browser from a Worker using SQLite WASM plus an HTTP VFS.
3. Compile `sqlite-vec` directly into that WASM build for exact KNN search.
4. Keep the fields needed for ranking/filtering/rendering close to the vector
   table to avoid extra random page fetches.
5. Optionally copy/import the DB into OPFS after first load so repeat sessions
   use local storage instead of repeated range fetches.

For FetchMoji's scale, exact search is a feature, not a limitation. The current
emoji corpus is small enough that `sqlite-vec`'s brute-force design is likely a
better fit than adding ANN complexity.

## Current Understanding Of This Repo

Confirmed from local code:

- The current app is client-side semantic search with Astro/React.
- It uses `@electric-sql/pglite` plus `pgvector`.
- Query embeddings are produced in a Worker with Transformers.js.
- Search currently expects `384`-dimensional normalized vectors.
- The DB is prebuilt and loaded as a browser artifact.
- The app is read-heavy and effectively immutable at runtime.

That makes this project a strong candidate for a SQLite file served over HTTP
range requests. The read-only assumption is especially important.

## What The Evidence Says

### 1. HTTP-backed SQLite is real, but index shape matters

High-confidence sources:

- phiresky's `sql.js-httpvfs` repo and blog show SQLite pages being fetched over
  HTTP `Range` requests instead of downloading the full DB.
- Simon Willison's 2021 link post summarizes the core claim: indexed SQL
  queries can run against a large hosted SQLite file while transferring only a
  small subset of bytes.

Confirmed details:

- `sql.js-httpvfs` is read-only and works best when the DB is structured for the
  query patterns.
- phiresky recommends aggressive indexing, covering-index style access, and a
  `1024` byte page size for better HTTP fetch behavior.
- phiresky's examples show why this matters: once SQLite needs extra random page
  lookups, HTTP request count jumps.
- The provided HN thread from July 10, 2024 points directly at
  `sql.js-httpvfs` as the relevant pattern for "SQLite over range requests."

Implication for FetchMoji:

- Do not design the schema as "vector table plus lots of follow-up joins" on the
  hot path.
- Store the fields needed for result rendering alongside the vector lookup, or
  at least make them reachable through predictable indexed access.

### 2. The newer HTTP-VFS stack is closer to official SQLite, but still experimental

High-confidence sources:

- `mmomtchev/sqlite-wasm-http`
- official SQLite WASM docs

Confirmed details:

- `sqlite-wasm-http` is explicitly inspired by `sql.js-httpvfs` but uses the
  official SQLite WASM distribution.
- It supports multiple concurrent connections with a shared cache when
  `SharedArrayBuffer` is available.
- It also has a fallback mode that does not require `SharedArrayBuffer`.
- The repo still labels itself `Experimental`.
- It also recommends reducing page size to `1024` bytes and vacuuming.

Implication for FetchMoji:

- If you want the cleanest long-term fit with official SQLite WASM, this is the
  most relevant starting point.
- But it is not as battle-tested as the older `sql.js-httpvfs` idea, so budget
  time for integration risk.

### 3. Official SQLite WASM gives a good local-cache story via OPFS

High-confidence sources:

- SQLite WASM `persistence.md`
- SQLite WASM `api-worker1.md`
- SQLite WASM `api-oo1.md`

Confirmed details:

- OPFS is only available in Worker-thread contexts.
- SQLite's worker/promiser API is the intended browser usage shape.
- `OpfsDb.importDb()` can import a SQLite database into OPFS.
- The official docs recommend `opfs-sahpool` when you care more about
  performance than concurrency or cannot set COOP/COEP.
- `opfs-sahpool` does not require COOP/COEP and is documented as the highest
  performance OPFS option, but it does not support multiple simultaneous
  connections.

Implication for FetchMoji:

- The clean design is "remote immutable DB over HTTP VFS for cold start, then
  optional local OPFS import/cache for warm starts."
- Since FetchMoji does not need multi-tab write concurrency, `opfs-sahpool`
  looks like a viable warm-cache target.

### 4. `sqlite-vec` is the strongest open vector option for this use case

High-confidence sources:

- `sqlite-vec` docs
- Alex Garcia's August 1, 2024 release post
- HN thread `Ultra efficient vector extension for SQLite`

Confirmed details:

- `sqlite-vec` runs in the browser with WebAssembly.
- It must be statically compiled into a custom SQLite WASM build. Dynamic
  loading is not available in browser WASM builds.
- `sqlite-vec` currently focuses on brute-force vector search, not ANN.
- Alex explicitly frames that as appropriate for thousands to hundreds of
  thousands of vectors and small-device use cases.
- It supports `vec0` virtual tables plus metadata, partition keys, and auxiliary
  columns.
- It also supports vector functions like `vec_distance_cosine()` over vector
  blobs stored in regular tables.
- It supports quantization (`int8`, binary) and documents oversampling +
  rescoring for lower-precision search.

Implication for FetchMoji:

- The corpus size is small enough that brute-force exact search should be fine.
- The bigger design question is schema layout, not ANN indexing.
- If you want filter-first vector search, prefer `vec0` metadata columns or a
  schema that avoids complex post-KNN joins.

### 5. Filtering after vector search is a real schema trap

High-confidence sources:

- `sqlite-vec` metadata docs
- GitHub issue #196 in `asg017/sqlite-vec`

Confirmed details:

- `sqlite-vec` officially supports metadata columns that participate in KNN
  queries.
- The docs describe metadata constraints being applied during KNN calculation.
- Issue #196 shows a real user running into the opposite design: vectors in one
  table, filterable business fields in another, then trying to force `JOIN +
  WHERE` to filter before KNN.

Implication for FetchMoji:

- For emoji search, do not put rank-relevant data in a separate table unless
  you are comfortable with either:
  - post-filtering reduced result sets, or
  - scalar-distance scans over regular tables instead of `vec0`
- The safest path is to keep emoji id, short label, and any filterable category
  or tag data inside the `vec0` table definition.

## Top Options / Hypotheses

### Option 1: Official SQLite WASM + `sqlite-wasm-http` + `sqlite-vec`

What it looks like:

- Build a custom SQLite WASM bundle with `sqlite-vec` statically linked.
- Use `sqlite-wasm-http` for range-backed reads of `emoji.sqlite`.
- Run all SQLite work in a Worker.
- Optionally import the DB into OPFS after first successful load.

Why it fits:

- Closest to the official SQLite WASM direction.
- Good long-term story for Worker usage and OPFS.
- Best match if you want both remote lazy reads and local persistence.

Risks:

- `sqlite-wasm-http` is still marked experimental.
- You now own a custom SQLite WASM build that includes `sqlite-vec`.
- Debugging will span Worker behavior, cross-origin isolation, and VFS behavior.

Assessment:

- Best overall technical fit.
- Higher integration cost than the current PGlite setup.

### Option 2: `sql.js-httpvfs` + custom sql.js build with `sqlite-vec`

What it looks like:

- Keep the older, proven HTTP range-fetch pattern.
- Compile `sqlite-vec` into a `sql.js`/Emscripten SQLite build.

Why it fits:

- The HTTP VFS idea itself is well documented and well understood.
- phiresky's debugging advice is very concrete.

Risks:

- More "custom stack" surface area.
- Further from the official SQLite WASM path.
- Less attractive if you already want Worker + OPFS integration from official
  SQLite docs.

Assessment:

- Viable, but I would only pick this if the HTTP VFS layer matters more than
  alignment with official SQLite WASM.

### Option 3: Official SQLite WASM + `sqlite-vec` + whole-file download/import first

What it looks like:

- No HTTP VFS initially.
- Fetch the full DB file once.
- Import it into OPFS and query locally from then on.

Why it fits:

- Simplest implementation.
- Lowest integration risk.
- Still gains most of the SQLite migration benefits.

Risks:

- Loses the marquee "query remote SQLite lazily over HTTP range requests"
  behavior.
- Cold start depends on full DB download size.

Assessment:

- Strong fallback if Option 1 proves too expensive.
- For FetchMoji's likely DB size, this may actually be the fastest way to ship.

## Recommended Path

Recommendation:

- Start with Option 1 as the research target.
- Keep Option 3 as the delivery fallback.

Concrete schema recommendation:

```sql
create virtual table vec_emoji using vec0(
  emoji_id integer primary key,
  embedding float[384],
  short_name text,
  category text,
  +emoji text,
  +keywords text
);
```

Why this shape:

- `emoji_id`, `short_name`, and `category` stay available for filter-first KNN
  behavior.
- `emoji` and `keywords` can be auxiliary if they are only needed in output.
- This avoids an extra join on the hot path.

Recommended query shape:

```sql
select
  emoji_id,
  short_name,
  emoji,
  keywords,
  distance
from vec_emoji
where embedding match :query_embedding
  and k = 20
order by distance;
```

Optional hybrid search:

- Add FTS5 for exact keyword/name matching.
- Fuse FTS and vector ranks with a simple reciprocal-rank or score-merging rule.

This hybrid path is an inference, not something directly prescribed by the
sources, but it is a strong fit for emoji search because exact aliases and
semantic intent both matter.

## What Works

- Read-only hosted SQLite files over HTTP `Range` requests.
- Small page sizes (`1024`) and vacuumed DBs.
- Covering-index style access patterns.
- Worker-based SQLite execution.
- OPFS as a warm-cache/persistence layer.
- Exact brute-force vector search for small collections.
- Quantization when you need smaller DB files.

## What To Avoid

- Assuming HTTP VFS makes schema design unimportant.
- Storing vectors in one table and all filterable fields in another, then hoping
  the planner will naturally filter before KNN.
- Building around ANN before you confirm exact search is too slow.
- Relying on browser-main-thread SQLite + OPFS. Official docs say OPFS is a
  Worker-only story.
- Treating `sqlite-wasm-http` as production-proven without your own verification.

## Missing Information

- Actual size of the SQLite DB after moving current embeddings into `sqlite-vec`
  with:
  - float32
  - int8 quantization
  - binary quantization
- Whether the team is willing to maintain a custom SQLite WASM build.
- Whether hybrid FTS + vector ranking beats vector-only for FetchMoji's actual
  query distribution.
- Whether cold-start savings from HTTP VFS are materially better than simply
  downloading the whole DB once, given this app's likely small corpus.

## Verification Plan

### 1. Relevance Verification

Use a labeled query set, not ad-hoc manual spot checks.

Recommended checks:

- Build a golden set of at least 100-200 queries:
  - direct names: `rocket`, `crying`, `party`
  - intent phrases: `celebrate a win`, `feeling sick`
  - slang/synonyms: `hype`, `facepalm`, `ugh`
  - ambiguous prompts: `love`, `fire`, `cool`
  - negative/confusable pairs
- Score top-1, top-3, top-10 hit rate.
- Track `nDCG@10`, `Recall@10`, `Precision@10`, and optionally `MRR`.

Evidence:

- The BEIR benchmark repo evaluates retrieval systems with `NDCG@k`, `MAP@k`,
  `Recall@k`, and `Precision@k`.

Practical comparison matrix:

- current `PGlite + pgvector`
- SQLite + `sqlite-vec` float32
- SQLite + `sqlite-vec` int8
- SQLite + `sqlite-vec` binary + rescoring
- hybrid FTS5 + vector (if implemented)

### 2. HTTP-VFS Verification

The most important question is not "does search return rows?" but:

- how many requests?
- how many bytes?
- are queries doing scans or narrow indexed reads?

Recommended checks:

- Log number of HTTP range requests per query.
- Log total bytes read per query.
- Record cold-cache and warm-cache behavior separately.
- Run `EXPLAIN QUERY PLAN` for every production search query.
- Inspect read/page logs where available.

Evidence:

- phiresky explicitly recommends `EXPLAIN QUERY PLAN`, page-read logs, and
  `dbstat` to understand why a query is fetching too much data.

Pass/fail examples:

- pass: top search query fetches only a few pages / small KBs after schema load
- fail: every query triggers table scans or repeated random fetches

### 3. Latency Verification

Measure user-visible timings:

- app load -> DB ready
- first query typed -> results shown
- subsequent query typed -> results shown
- cold cache
- warm cache
- OPFS cached

Suggested targets:

- preserve the repo's current sub-100ms perceived update goal on warm searches
- keep first semantic result under a tolerable mobile threshold, even if cold
  start is slower

### 4. Memory Verification

Track:

- JS heap
- WASM heap
- Worker memory
- DB file size by storage mode

Why:

- This repo already documents iOS Safari memory concerns.
- SQLite WASM + Transformers.js + cached DB can fail through memory pressure
  long before correctness fails.

### 5. Persistence / Cache Verification

If OPFS caching is added:

- verify first session reads remote DB
- verify second session opens local cached DB without re-downloading
- version DB files by content hash
- verify stale cache invalidation by changing the DB filename or hash

### 6. Browser Matrix Verification

At minimum:

- Chrome desktop
- Safari desktop
- Firefox desktop
- iOS Safari

Specifically verify:

- Worker startup
- range requests
- OPFS availability
- `opfs-sahpool` fallback behavior
- behavior when `SharedArrayBuffer` is unavailable

### 7. Quantization Verification

If you use `int8` or binary vectors:

- compare against float32 on the same labeled query set
- do not accept size wins without ranking comparison

Evidence:

- `sqlite-vec` docs explicitly note the quality tradeoff of quantization and
  recommend oversampling + rescoring for binary quantization.

## Recommendation

If the goal is "implement emoji search with SQLite, HTTP VFS, and vector
search," then:

- use official SQLite WASM in a Worker
- statically compile in `sqlite-vec`
- start with a single immutable `emoji.sqlite`
- test `sqlite-wasm-http` first
- keep display/filter columns inside the `vec0` schema
- add OPFS caching once the HTTP path is correct

If the goal shifts from "prove the architecture" to "ship fast with low risk,"
skip HTTP VFS first and ship full-file download + OPFS import, then add remote
range access only if the DB size actually justifies it.

## Source Links

Primary / high confidence:

- phiresky blog, "Hosting SQLite databases on Github Pages" (2021-05-02)
  https://phiresky.github.io/blog/2021/hosting-sqlite-databases-on-github-pages/
- `phiresky/sql.js-httpvfs`
  https://github.com/phiresky/sql.js-httpvfs
- Simon Willison link post on phiresky's range-request approach (2021-05-02)
  https://simonwillison.net/2021/May/2/hosting-sqlite-databases-on-github-pages/
- `mmomtchev/sqlite-wasm-http`
  https://github.com/mmomtchev/sqlite-wasm-http
- SQLite WASM worker/promiser docs
  https://sqlite.org/wasm/doc/trunk/api-worker1.md
- SQLite WASM persistent storage / OPFS docs
  https://sqlite.org/wasm/doc/tip/persistence.md
- SQLite WASM oo1 `OpfsDb.importDb()` docs
  https://sqlite.org/wasm/doc/trunk/api-oo1.md
- `sqlite-vec` browser/WASM docs
  https://alexgarcia.xyz/sqlite-vec/wasm.html
- `sqlite-vec` `vec0` metadata / partition / auxiliary docs
  https://alexgarcia.xyz/sqlite-vec/features/vec0.html
- `sqlite-vec` API reference
  https://alexgarcia.xyz/sqlite-vec/api-reference.html
- Alex Garcia, "`sqlite-vec` v0.1.0" (2024-08-01)
  https://alexgarcia.xyz/blog/2024/sqlite-vec-stable-release/
- `sqlite-vec` binary quantization docs
  https://alexgarcia.xyz/sqlite-vec/guides/binary-quant.html
- `sqlite-vec` scalar quantization docs
  https://alexgarcia.xyz/sqlite-vec/guides/scalar-quant.html

Relevant discussion / practitioner sentiment:

- HN comment pointing to `sql.js-httpvfs` and HTTP-range SQLite (2024-07-10)
  https://news.ycombinator.com/item?id=40922842
- HN discussion of vector extensions for SQLite and open-source tradeoffs
  https://news.ycombinator.com/item?id=45347619
- `sqlite-vec` issue #196 on filter-first KNN vs join-heavy schemas
  https://github.com/asg017/sqlite-vec/issues/196
- Simon Willison TIL on `sqlite-vec` distance functions over stored embeddings
  https://til.simonwillison.net/sqlite/sqlite-vec

Evaluation reference:

- BEIR repo metrics summary
  https://github.com/beir-cellar/beir
