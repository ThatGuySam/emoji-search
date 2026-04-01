# iOS Safari Memory Debugging Tools And Techniques

Tease: The fastest way to stop guessing is to separate JavaScript leaks from
Page/WASM pressure on a real iPhone first.

Lede: For this repo, the best recommendation is a three-part workflow: add
lightweight timeline markers, record real-device Safari Web Inspector traces,
then use Simulator + Instruments only after the traces tell us which bucket is
actually growing.

Why it matters:

- The app already debounces queries and terminates the worker on cleanup.
- PGlite still keeps browser DB files in memory on Safari.
- Upstream ONNX / Transformers / Emscripten issue threads still show
  Safari+WASM failure modes on cold-load and reload paths.

Go deeper:

- Start with real-device Timelines plus `console.timeStamp()`.
- If JavaScript stays flat but Page climbs, go to Instruments and memgraphs.
- If JavaScript growth dominates, use `fuite` or `memlab` as a secondary filter,
  not the primary debugger.

Date: 2026-03-28
Updated: 2026-03-29

## Scope

Research additional debugging tools and techniques to better reproduce and fix
the iOS memory issue in this repo's browser stack:

- React/Astro UI
- Transformers.js / ONNX Runtime in a Web Worker
- PGlite / WASM database loaded in-browser
- iOS Safari as the failure environment

## Short Answer

The best additions are:

- Safari Web Inspector Timelines on a real iPhone, with Memory and JavaScript
  Allocations enabled only during targeted traces.
- Xcode Instruments plus `vmmap`, `heap`, `malloc_history`, and memgraph-based
  analysis against the iOS Simulator Safari/WebContent process.
- ONNX Runtime tracing, profiling, and verbose logging in the worker so model
  load and inference events line up with Web Inspector markers.
- A repeatable "memory-neutral" reproduction loop that forces cold loads and
  lifecycle cleanup, instead of only relying on ad hoc typing.
- Optionally, a Chromium-only JS leak detector such as `fuite` or `memlab` to
  eliminate ordinary React/JS retainer leaks before spending more time on
  Safari-specific page/WASM pressure.

The main reason this is worth doing: the current code already terminates the
worker on cleanup, but Safari/WebKit memory failures in WASM stacks still show
up upstream, and PGlite's browser filesystems still keep database files in
memory on Safari.

## Repo Context

Current repo mitigations already in place:

- `src/hooks/useEmojiSearch.ts` debounces inference requests.
- `src/hooks/useEmojiSearch.ts` terminates the worker on cleanup.
- `src/utils/worker.ts` holds the Transformers.js pipeline in a singleton and
  exposes a dispose path.
- `src/utils/memoryBudget.ts` tracks estimated allocations because Safari does
  not expose `performance.memory`.
- `src/utils/db.ts` loads a prebuilt PGlite data dir into browser memory.

Important repo inference:

- `loadPrebuiltDb()` fetches the artifact, may decompress it into a new buffer,
  then passes the result into `loadDataDir`.
- PGlite's Safari-compatible storage paths still keep database files in memory.
- That means peak memory may come from a combination of model load, DB artifact
  fetch/decompress, and DB residency, not just leaked JS objects.

This inference is based on local code inspection plus PGlite filesystem docs.

## Source Quality Notes

High confidence:

- WebKit Web Inspector docs and blog posts
- Apple WWDC memory sessions
- ONNX Runtime Web docs
- PGlite docs

Medium confidence:

- GitHub issues in `onnxruntime`, `transformers.js-examples`, and `emscripten`
  that show current failure modes on iOS/Safari or Safari+WASM reload paths

Low confidence / not used heavily:

- HN/Lobsters searches were mostly complaints or generic Safari frustration, not
  concrete workflows with versions, traces, or implementation details

## Confirmed Findings

### 1. Safari Web Inspector can give the fastest signal on real devices

Confirmed:

- WebKit documents remote inspection for real iOS devices and notes that iOS
  Simulator inspection is always enabled.
- The Timelines tab includes Memory, CPU, and JavaScript Allocations.
- The Memory timeline breaks page memory into JavaScript, Images, Layers, and
  Page.
- Heap snapshots can be captured automatically during recording or manually with
  `console.takeHeapSnapshot()`.
- `console.timeStamp()` markers show up in Timelines.
- Timeline recordings can be exported and re-opened later.

Why this matters here:

- If the issue is mostly JS retention, JavaScript Allocations should show it.
- If JS heap looks flat but Page or Layers keeps climbing, the problem is more
  likely WebKit engine memory, decoded assets, DOM/rendering state, or WASM /
  non-heap pressure.

Important constraint:

- WebKit explicitly notes that Memory and JavaScript Allocations timelines can
  affect performance while recording.

### 2. Apple's lower-level memory tools are useful on Simulator even when the crash happens on device

Confirmed:

- Apple recommends Instruments for deeper memory profiling and specifically
  calls out Allocations, Leaks, VM Tracker, and VM Memory Trace.
- Apple also documents memgraph-based workflows with `vmmap`, `heap`, `leaks`,
  and `malloc_history`.
- WWDC24 explicitly states these command-line tools can analyze macOS and
  Simulator processes directly.

Why this matters here:

- Web Inspector tells you "what bucket grew."
- Instruments and memgraph tools are how you figure out which heap/VM regions
  grew and where the allocations came from.

Important constraint:

- Simulator is good for attribution and diffing, but Apple also warns that you
  still need to validate on real devices because memory behavior and limits are
  different.

### 3. ONNX Runtime Web already ships the exact diagnostic hooks we want

Confirmed:

- ONNX Runtime Web supports CPU profiling via `enableProfiling` and
  `endProfiling()`.
- It supports `ort.env.trace = true`, and the trace uses
  `console.timeStamp`.
- It supports verbose logging and debug mode.
- ONNX Runtime Web also documents `ort.env.wasm.numThreads`,
  `ort.env.wasm.proxy`, and WebGPU profiling.

Why this matters here:

- The repo already uses a worker and cross-origin isolation.
- The missing piece is not another runtime, it is better runtime-level
  diagnostics during the failing path.

### 4. Transformers.js exposes backend environment configuration

Confirmed:

- Transformers.js exposes `env.backends`.
- Its ONNX backend docs explicitly say the ONNX backend is accessible through
  environment variables.
- Transformers.js log levels map down into ONNX Runtime log severity.
- Older Transformers.js docs show browser-side backend configuration such as
  `env.backends.onnx.wasm.wasmPaths`.

Inference:

- Because Transformers.js exposes ONNX backend configuration and is backed by
  `onnxruntime-web`, the relevant ORT debug flags should be reachable either
  directly through the backend env object in this stack or by temporarily
  dropping to a direct ORT session for diagnosis.

### 5. PGlite's browser storage model keeps memory pressure in play on Safari

Confirmed:

- PGlite recommends IndexedDB VFS in the browser because OPFS is not supported
  by Safari.
- The in-memory FS keeps all files in memory.
- The IndexedDB FS is layered over the in-memory filesystem, loading all files
  into memory on start and flushing back to IndexedDB after query changes.
- PGlite's OPFS AHP filesystem does not work on Safari because Safari appears to
  limit sync access handles below what a standard Postgres install needs.

Why this matters here:

- Even if the ONNX worker is perfect, Safari still has to carry an in-memory DB
  footprint in the current browser storage model.

### 6. Upstream Safari/WASM issues remain plausible contributors

Confirmed from issue threads:

- An `onnxruntime` issue from September 13, 2024 reports iPhone-only WASM load
  failures across models while WebGL avoids the problem.
- A `transformers.js-examples` issue opened on August 23, 2025 reports iPhone
  Safari auto-refreshing during larger ONNX downloads.
- An `emscripten` issue from May 16, 2023 reports Safari iOS/macOS reload OOM
  with pthread/shared memory paths and larger memory ceilings; the report later
  narrowed the repro toward generated script behavior rather than Safari alone.

Interpretation:

- You should not assume every failure is a JS leak.
- Safari + WASM + large allocations + reload/cold-start paths remains an active
  upstream risk surface.

## What Works

### A. Real-device Timelines with deliberate markers

Recommended technique:

1. Remote-inspect a real iPhone in Safari Web Inspector.
2. Open Timelines and enable:
   - CPU
   - Memory
   - JavaScript Allocations
3. Use a controlled reproduction loop instead of free-form testing.
4. Add `console.timeStamp()` markers around:
   - DB fetch start
   - DB load complete
   - worker preload start
   - worker ready
   - search start
   - search complete
   - dispose requested
   - worker terminated
5. Optionally add `console.takeHeapSnapshot('label')` before and after one
   cycle, then after five cycles.
6. Export the recording.

Why it is good:

- Fastest way to separate JS growth from Page/Layers/Image growth.
- The `console.timeStamp()` markers line up with ONNX Runtime trace markers.

Tradeoff:

- Recording itself adds overhead, so repeat the test once without Memory /
  Allocations enabled to validate whether the crash threshold changes.

### B. Simulator + Instruments + memgraph diffing

Recommended technique:

1. Reproduce the same loop in iOS Simulator Safari.
2. Attach Instruments using Allocations first; add VM Tracker when needed.
3. Capture a baseline after first steady state.
4. Run one loop and then five loops.
5. Save the trace or capture memgraphs.
6. Use:
   - `vmmap -summary` to identify which regions grew
   - `heap -diffFrom` to compare before/after memgraphs
   - `malloc_history` to trace large allocations
   - `leaks` when a specific address or cycle is suspicious

Why it is good:

- Best toolset for non-JS memory attribution on a process you can inspect more
  deeply than a real iPhone Safari tab.

Tradeoff:

- Do not use Simulator measurements as the final device budget.

### C. ONNX Runtime trace/profiling in the worker

Recommended technique:

- Temporarily enable the runtime's own diagnostics during repro runs:
  - verbose logging
  - debug mode
  - trace
  - profiling
- Correlate these logs with the Web Inspector timeline export.
- Add a diagnostic toggle to force `numThreads = 1` for A/B runs.

Why it is good:

- It tells you whether the spike is mostly session creation, WASM init, repeated
  inference, or cleanup failure.

Strong A/B candidates:

- default threads vs `numThreads = 1`
- warm cache vs `?no_cache=1`
- preload only vs preload + query loop
- query loop with worker retained vs query loop followed by destroy/remount

### D. A memory-neutral repro loop

Recommended technique:

- Define an operation that should end close to baseline memory after cleanup:
  - mount
  - preload DB + model
  - perform N searches
  - clear search
  - destroy worker / unmount search core
  - remount
- Repeat 5 to 10 times.

Why it is good:

- This matches WebKit's own recommended heap comparison style: compare before
  and after a repeated action that should be memory-neutral.

Repo-specific candidates:

- repeated search with the same worker
- repeated full component remount
- repeated hard reload with `?no_cache=1`
- DB load only, without model
- model preload only, without DB

### E. Desktop-only JS leak detectors as a triage filter

Useful but limited:

- `fuite`
- `memlab`

Why they are useful:

- Both support scripted interaction loops.
- Both help catch common SPA/React retainers that are independent of Safari.

Why they are not enough:

- `fuite` is Puppeteer-driven and centered on Chromium tooling.
- `memlab` explicitly analyzes heap snapshots from Chromium-based browsers,
  Node.js, Electron.js, and Hermes.
- They will not prove anything about iOS Safari page memory, WebKit layers, or
  Safari-specific WASM pressure.

Best use:

- Use them to rule out obvious JS retainer leaks early.
- Then switch back to Safari/WebKit tools for the real issue.

## What To Avoid

- Treating a flat JS heap as proof that memory is fine. WebKit's "Page" bucket
  can still grow badly.
- Measuring only with Web Inspector attached. The Memory and JavaScript
  Allocations timelines add overhead.
- Assuming Simulator threshold equals device threshold.
- Assuming WebKit desktop or Chromium behavior proves iPhone behavior.
- Testing only warm-cache flows. Several upstream reports are specifically about
  cold downloads or reload paths.

## Recommendation

Recommended order of operations:

1. Add a temporary `debug_memory` flag with `console.timeStamp()` markers and
   optional heap snapshots.
2. Run three standard traces on a real iPhone with Safari Web Inspector:
   - cold load only
   - cold load + 10 searches
   - 5 remount cycles
3. Turn on ONNX Runtime trace/log/profiling during those same runs and compare
   default behavior against forced single-threaded WASM.
4. Branch based on what the real-device traces show:
   - If JavaScript grows: use `fuite` or `memlab` to chase retained objects.
   - If Page or non-JS memory grows: move to Simulator + Instruments +
     `vmmap` / `heap` / `malloc_history`.
5. Only after that attribution work, change memory strategy in the app.

Most likely payoff:

- Web Inspector will tell us whether the bug is "JS leak" vs "page/WASM/native
  pressure."
- Instruments and memgraph tools will tell us where the non-JS pressure lives.
- ORT tracing will tell us whether the model lifecycle is the actual trigger.

Why this is the recommendation:

- Real-device Safari traces give the highest signal per hour.
- Simulator tools are deeper but slower; they are best used once the traces say
  non-JS memory is the problem.
- Chromium-only leak tools are valuable, but only after Safari traces suggest
  the issue is actually in JS retainers.

## Recommended Next Inspection Steps

- Add a temporary `debug_memory` URL flag and only emit extra markers when it is
  set.
- Mark these transitions with `console.timeStamp()`:
  - `db-fetch-start`
  - `db-loaded`
  - `worker-preload-start`
  - `worker-ready`
  - `search-start`
  - `search-complete`
  - `worker-dispose`
  - `worker-terminated`
- Add one code path that skips DB load and one that skips model preload, so the
  traces can isolate the larger contributor.
- Add one code path that forces single-threaded ONNX WASM for comparison.
- Export and save every Safari Web Inspector recording used for analysis.

## Source Links

Primary / high confidence:

- WebKit, "Enabling Web Inspector" (updated 2025-03-19)
  https://webkit.org/web-inspector/enabling-web-inspector/
- WebKit, "Timelines Tab"
  https://webkit.org/web-inspector/timelines-tab/
- WebKit, "Memory Debugging with Web Inspector" (2016-06-06)
  https://webkit.org/blog/6425/memory-debugging-with-web-inspector/
- Apple WWDC24, "Analyze heap memory"
  https://developer.apple.com/videos/play/wwdc2024/10173/
- Apple WWDC21, "Detect and diagnose memory issues"
  https://developer.apple.com/videos/play/wwdc2021/10180/
- Apple WWDC18, "iOS Memory Deep Dive"
  https://developer.apple.com/videos/play/wwdc2018/416/
- ONNX Runtime Web, "Performance Diagnosis"
  https://onnxruntime.ai/docs/tutorials/web/performance-diagnosis.html
- Transformers.js API, `env`
  https://huggingface.co/docs/transformers.js/en/api/env
- Transformers.js API, `backends/onnx`
  https://huggingface.co/docs/transformers.js/en/api/backends/onnx
- Transformers.js custom usage example showing browser ONNX backend settings
  https://huggingface.co/docs/transformers.js/v2.17.2/en/custom_usage
- PGlite docs, "Filesystems"
  https://pglite.dev/docs/filesystems
- PGlite docs, "Debugging PGlite"
  https://pglite.dev/debugging

Supporting issue threads / medium confidence:

- `microsoft/onnxruntime` issue #22086, iOS WASM load failure (2024-09-13)
  https://github.com/microsoft/onnxruntime/issues/22086
- `microsoft/onnxruntime` issue #22776, iOS WebGPU support discussion
  (2024-11-08)
  https://github.com/microsoft/onnxruntime/issues/22776
- `huggingface/transformers.js-examples` issue #72, iPhone Safari reload during
  large ONNX downloads (2025-08-23)
  https://github.com/huggingface/transformers.js-examples/issues/72
- `emscripten-core/emscripten` issue #19374, Safari reload OOM with shared
  memory/pthreads (2023-05-16)
  https://github.com/emscripten-core/emscripten/issues/19374

Optional desktop-only complements:

- `nolanlawson/fuite`
  https://github.com/nolanlawson/fuite
- Nolan Lawson, "Introducing fuite: a tool for finding memory leaks in web
  apps" (2021-12-17)
  https://nolanlawson.com/2021/12/17/introducing-fuite-a-tool-for-finding-memory-leaks-in-web-apps/
- `facebook/memlab`
  https://github.com/facebook/memlab
