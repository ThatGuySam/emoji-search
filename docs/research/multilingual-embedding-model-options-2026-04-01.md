# Multilingual Embedding Model Options For FetchMoji

Tease: There are stronger multilingual embedding models than `gte-small`, but most of them are too heavy for FetchMoji's browser-on-iPhone constraint.

Lede: For FetchMoji's live client-side emoji search, the best multilingual upgrade path is still `Xenova/multilingual-e5-small`, not EmbeddingGemma or Qwen3. It keeps the current `384`-dimension vector shape, is already packaged for Transformers.js, and is retrieval-oriented. The tradeoff is a materially larger browser model than the current `gte-small`, so it should be prototyped behind a flag before any production swap.

Why it matters:

- The current repo is optimized for iOS Safari, browser-only inference, and a tight startup budget.
- A multilingual model that wins on benchmarks but blows up cold-start or memory is not actually better for this product.
- Choosing a model with the same vector width avoids an immediate SQLite/blob/schema migration.

Go deeper:

- Keep `Xenova/gte-small` in production for now.
- Prototype `Xenova/multilingual-e5-small` first if multilingual semantic search becomes important.
- Keep EmbeddingGemma as a build-time QA/offline tool and rule out Qwen3 for the live browser path.

Date: 2026-04-01

## Scope

Research target:

- identify whether there is a better multilingual embedding model for FetchMoji's
  search use case
- prioritize browser compatibility, average-iPhone constraints, and
  Transformers.js support over raw leaderboard position

Answer type needed:

- primary docs
- repo-local context
- implementation tradeoffs
- some practitioner validation where available

## Repo Context First

Confirmed from local files on 2026-04-01:

- `src/constants.ts` currently sets `DEFAULT_MODEL = 'Xenova/gte-small'`,
  `DEFAULT_DIMENSIONS = 384`, and `DATA_TYPE = 'int8'`.
- `src/utils/hf.ts` uses a Transformers.js `feature-extraction` pipeline and
  currently routes browser inference to `wasm` for `int8` models.
- `src/utils/db.ts`, `src/utils/sqlite.ts`, and `src/utils/pglite.ts` all
  assume a `384`-dimension embedding shape in the live search path.
- `src/utils/memoryBudget.ts` models the current iOS-safe stack with a
  conservative app budget of `300MB`, a warning threshold of `200MB`, and a
  current `gte-small` model allocation of `35MB`.

Previously recorded repo conclusions that still appear sound:

- `docs/research/trending-term-sources-and-multilingual-emoji-search-2026-03-30.md`
  already identified `Xenova/multilingual-e5-small` as the most plausible
  browser-friendly multilingual migration.
- `docs/research/llm-assisted-editorial-content-and-multilingual-guardrails-2026-03-30.md`
  treated EmbeddingGemma as a strong offline QA model, not a default live
  browser model.
- `docs/research/ios-safari-memory-debugging-2026-03-28.md` documented active
  Safari/WASM pressure and pointed to large ONNX downloads as a real iPhone risk
  surface.

## Short Answer

If "better" means "better for FetchMoji's actual product constraints," the best
multilingual candidate is still:

1. `Xenova/multilingual-e5-small` for a live browser prototype
2. `onnx-community/embeddinggemma-300m-ONNX` only for offline/build-time or
   much looser latency budgets
3. `onnx-community/Qwen3-Embedding-0.6B-ONNX` only if the architecture changes
   away from average-iPhone browser inference

If "better" means "best multilingual quality regardless of browser cost," then
Qwen3-class models are ahead. But they are not realistic for FetchMoji's
current browser runtime.

## What The Evidence Says

### Evaluation criteria for this repo

For FetchMoji, the relevant criteria are:

1. multilingual semantic retrieval quality
2. availability as a Transformers.js-compatible ONNX model
3. model artifact size and likely iPhone cold-start behavior
4. embedding dimensionality compatibility with the current `384`-dim stack
5. retrieval-oriented behavior for query-to-emoji-doc search

### Candidate 1: `Xenova/multilingual-e5-small`

Why it stands out:

- It is explicitly multilingual and retrieval-oriented.
- The base `intfloat/multilingual-e5-small` model supports multilingual search
  and requires `query:` / `passage:` prefixes for best retrieval performance.
- The Transformers.js-ready ONNX repo already exists.
- Its output dimension is `384`, matching the current FetchMoji schema.

Evidence:

- The Hugging Face model card snippet for `intfloat/multilingual-e5-small`
  says the model is initialized from `microsoft/Multilingual-MiniLM-L12-H384`,
  supports `100` languages, and each input should start with `query:` or
  `passage:` for retrieval.
- The Xenova ONNX repo exists specifically for Transformers.js usage.
- The Xenova ONNX files list `model_int8.onnx` at about `118MB` and
  `model_q4f16.onnx` at about `205MB`.

Implications for FetchMoji:

- Best low-risk multilingual upgrade because it preserves `384d`.
- Requires corpus/query prompt changes:
  - user queries should be prefixed with `query: `
  - emoji docs should be embedded as `passage: ...`
- Model size is roughly `3.5x` the current `gte-small` int8 artifact
  (`118MB` vs `33.8MB`), so startup will get slower.

Local runtime check from this repo's environment:

- `Xenova/gte-small` (`q8`, CPU): `9.8ms` encode, `384d`
- `Xenova/multilingual-e5-small` (`q8`, CPU): `27.4ms` encode, `384d`

Inference:

- Expect a meaningful browser slowdown versus current production, but still in
  the realm of a serious prototype.
- On average iPhone hardware, this is probably the only multilingual model in
  this research set that still has a plausible chance of surviving the current
  browser UX constraints.

### Candidate 2: `onnx-community/embeddinggemma-300m-ONNX`

Why it is attractive:

- Designed for on-device embeddings.
- Multilingual support over `100+` languages.
- Longer context window (`2048` tokens).
- Better multilingual benchmark story than older small multilingual baselines.
- Supports truncating the output from `768` to `512`, `256`, or `128`.

Evidence:

- Google's September 4, 2025 announcement says EmbeddingGemma is a
  `308M`-parameter model trained on `100+` languages and can run under
  `200MB` RAM with quantization.
- The ONNX model card says the model outputs `768d` embeddings by default,
  supports `512/256/128` truncation, and recommends retrieval-specific prompts
  like `task: search result | query: ` and `title: none | text: `.
- The ONNX files list:
  - `model_q4.onnx_data` around `197MB`
  - `model_q4f16.onnx_data` around `175MB`
  - `model_quantized.onnx_data` around `309MB`

Why it is still not the best live browser choice here:

- It does not preserve the current `384d` shape.
- It is much heavier than the current model and still materially heavier than
  `multilingual-e5-small`.
- The FetchMoji repo's iOS memory budget would move from roughly `130MB`
  current clean-stack assumptions to roughly `292MB` with a `q4`-class
  EmbeddingGemma model, which is effectively at the repo's conservative
  `300MB` app budget.

Local runtime check from this repo's environment:

- `Xenova/gte-small` (`q8`, CPU): `12.7ms` encode, `1958.4ms` init
- `EmbeddingGemma q4` (`AutoTokenizer + AutoModel`, CPU):
  `71.3ms` encode, `12885.6ms` init

Inference:

- EmbeddingGemma is attractive if FetchMoji moves more work offline, or if the
  app eventually tolerates materially slower first-search behavior.
- For the current live browser path on an average iPhone, it remains too close
  to the edge on both startup and memory.

### Candidate 3: `onnx-community/Qwen3-Embedding-0.6B-ONNX`

Why it is compelling on paper:

- Strong multilingual leaderboard story.
- `100+` languages.
- `32k` context window.
- Up to `1024d` embeddings with instruction-aware usage.

Evidence:

- The Qwen model card describes `Qwen3-Embedding-0.6B` as a `0.6B`-parameter
  multilingual embedding model with `32k` context and up to `1024` dimensions.
- The card highlights stronger overall family performance, with the `8B`
  variant ranked first on the multilingual MTEB leaderboard as of June 5, 2025.
- The ONNX files are extremely large for browser use:
  - `model_int8.onnx` around `614MB`
  - `model_q4.onnx` around `914MB`
  - total ONNX folder around `7.81GB`

Why it is not realistic for FetchMoji now:

- Artifact size is an order of magnitude beyond the current browser model.
- Output width changes from `384` to `1024`.
- Practitioner discussion is more operationally fragile than E5: there are user
  reports of performance collapsing when model-specific formatting details are
  missed.

Inference:

- Qwen3 is a server-side or non-iPhone-browser candidate, not a serious
  near-term choice for FetchMoji's current architecture.

### Candidate 4: `Xenova/paraphrase-multilingual-MiniLM-L12-v2`

Why it stays in the conversation:

- It is lightweight enough to be browser-plausible.
- It is available as a Transformers.js ONNX model.
- It outputs `384d` vectors and supports `50` languages.
- ONNX int8 size is about `118MB`, effectively the same class as
  `multilingual-e5-small`.

Why it does not beat `multilingual-e5-small` for this repo:

- It is an older general sentence-similarity model, not a retrieval-first
  query-to-passage model.
- FetchMoji is doing search over emoji documents, not only symmetric semantic
  similarity.

Inference:

- It is worth keeping in mind as a small fallback baseline, but it is not the
  best-fit upgrade for the repo's search architecture.

## Source Quality Notes

High confidence:

- local repo code and research memos
- Hugging Face model cards and ONNX file listings
- Google Developers Blog post for EmbeddingGemma
- Qwen model card

Medium confidence:

- local one-off runtime checks run from this repo's environment
- GitHub issue evidence about iPhone Safari failing on large ONNX downloads
- Hugging Face search-result snippets for model-card details that were easier to
  retrieve than the direct model-card HTML

Low confidence / low-yield:

- HN and Lobsters searches were low-yield for this exact question
- Reddit and forum threads were useful mainly as warning signals for model
  integration pitfalls, not as the main authority

## What Works

- Treat model choice as a product constraint problem, not a leaderboard problem.
- Prefer multilingual models that already ship as Transformers.js ONNX repos.
- Preserve `384d` when possible to avoid a coupled schema + artifact migration.
- Use retrieval-tuned models for FetchMoji's query-to-emoji-doc setup.

## What To Avoid

- Swapping in EmbeddingGemma or Qwen3 just because their benchmark story is
  stronger.
- Ignoring the repo's iPhone/Safari memory budget.
- Treating generic multilingual sentence-similarity models as automatically
  better than retrieval-tuned ones.
- Migrating to a model that changes dimension width without first deciding what
  happens to the current SQLite and PGlite artifact format.

## Recommendation

Recommendation order:

1. Keep `Xenova/gte-small` in production right now.
2. If multilingual semantic search becomes a priority, prototype
   `Xenova/multilingual-e5-small` behind a flag.
3. Keep EmbeddingGemma for build-time QA, duplicate detection, and multilingual
   draft scoring.
4. Rule out Qwen3 for the current client-side iPhone-browser architecture.

Why:

- `multilingual-e5-small` is the only candidate in this pass that is both
  meaningfully multilingual and still aligned with FetchMoji's browser
  constraints.
- It keeps the current `384d` vector shape.
- It is already packaged for Transformers.js.
- It is retrieval-oriented instead of being a generic similarity model.

Recommended next validation steps:

1. Build a multilingual query set from the existing intent corpus:
   `pt-BR`, `ja-JP`, `hi-IN`, plus mixed-language slang and transliteration
   cases.
2. Prototype `Xenova/multilingual-e5-small` with:
   - `query: ` prefixes on user queries
   - `passage: ` prefixes when rebuilding the corpus
3. Re-measure on a real iPhone:
   - cold init
   - first-search latency
   - warm-query latency
   - memory behavior under `?no_cache=1`
4. Compare multilingual recall against the current `gte-small` plus localized
   aliases before deciding whether a model swap is justified.

## Source Links

Primary docs and repos:

- Google Developers Blog, "Introducing EmbeddingGemma" (September 4, 2025)  
  https://developers.googleblog.com/introducing-embeddinggemma/
- Hugging Face ONNX model card, `onnx-community/embeddinggemma-300m-ONNX`  
  https://huggingface.co/onnx-community/embeddinggemma-300m-ONNX
- Hugging Face ONNX files, `onnx-community/embeddinggemma-300m-ONNX/tree/main/onnx`  
  https://huggingface.co/onnx-community/embeddinggemma-300m-ONNX/tree/main/onnx
- Hugging Face model card search result, `intfloat/multilingual-e5-small`  
  https://huggingface.co/intfloat/multilingual-e5-small
- Hugging Face ONNX files, `Xenova/multilingual-e5-small/tree/main/onnx`  
  https://huggingface.co/Xenova/multilingual-e5-small/tree/main/onnx
- Hugging Face Transformers.js repo page, `Xenova/multilingual-e5-small`  
  https://huggingface.co/Xenova/multilingual-e5-small
- Hugging Face model card, `Qwen/Qwen3-Embedding-0.6B`  
  https://huggingface.co/Qwen/Qwen3-Embedding-0.6B
- Hugging Face ONNX files, `onnx-community/Qwen3-Embedding-0.6B-ONNX/tree/main/onnx`  
  https://huggingface.co/onnx-community/Qwen3-Embedding-0.6B-ONNX/tree/main/onnx
- Hugging Face model card, `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`  
  https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
- Hugging Face Transformers.js repo page, `Xenova/paraphrase-multilingual-MiniLM-L12-v2`  
  https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2
- Hugging Face ONNX files, `Xenova/paraphrase-multilingual-MiniLM-L12-v2/tree/main/onnx`  
  https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2/tree/main/onnx

GitHub and implementation-risk validation:

- `huggingface/transformers.js-examples` issue #72, iPhone Safari auto reloads
  during large ONNX downloads (August 23, 2025)  
  https://github.com/huggingface/transformers.js-examples/issues/72

Repo-local context:

- `docs/research/trending-term-sources-and-multilingual-emoji-search-2026-03-30.md`
- `docs/research/llm-assisted-editorial-content-and-multilingual-guardrails-2026-03-30.md`
- `docs/research/ios-safari-memory-debugging-2026-03-28.md`
- `src/constants.ts`
- `src/utils/hf.ts`
- `src/utils/memoryBudget.ts`
