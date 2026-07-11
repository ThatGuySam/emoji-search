---
title: Semantic search
description: Search accepts a natural phrase, preserves it through initialization, ranks locally, and returns a compact copyable result set.
sidebar:
  badge:
    text: Planned
    variant: note
---

## SBC4

- `Tease:` The search field is trustworthy from its first rendered frame.
- `Lede:` Semantic search buffers early input, ranks locally, explains nearby tones, and copies a compact result without query transmission.
- `Why it matters:` The core product fails if initialization loses the user's first interaction.
- `Go deeper:` The behavior and edge-state contract below is the build target.

Semantic search is the core interaction. It turns a phrase about meaning or tone
into a small ranked set of emojis without transmitting the phrase.

## Behavior

1. The page renders a labeled search input and a visible readiness state.
2. The user can type immediately. The interface stores every change even when
   the search worker or local index is still initializing.
3. Once ready, the current query runs automatically. Later keystrokes update the
   result set without a page navigation.
4. The first result is the default choice. Additional results carry short tone
   labels that explain the difference rather than repeating emoji names.
5. Selecting a result copies the emoji. A visible and accessible confirmation
   identifies the copied value.
6. Clearing the query restores reviewed examples instead of an unexplained empty
   result list.

## Inputs & outputs

- **Inputs:** Unicode text from 1 to 280 characters. Whitespace-only input is
  treated as empty. The query can contain any supported writing system.
- **Outputs:** up to 20 ranked candidates. Each includes an emoji, stable ID,
  tone label, concise rationale, and numeric score used only for ordering.
- **Side effects:** clipboard write only after an explicit user action. Query
  text is not sent in analytics, URLs, logs, or network requests.

## States & edge cases

- **Initializing:** preserve input, show that local search is loading, and run
  the latest query when ready.
- **Ready with no query:** show reviewed examples and no misleading “results”
  heading.
- **Searching:** keep the previous results visible or show a stable skeleton;
  do not shift the input.
- **No match:** explain that no confident result was found and offer broader
  example wording.
- **Local artifact failure:** show a retry action and a link to reviewed intent
  pages; never fall back to uploading the query.
- **Offline after first successful load:** use cached immutable artifacts and
  continue searching.
- **Clipboard denied:** leave the result selected and provide a manual-copy
  fallback.
- **Rapid input:** cancel or supersede stale searches so an older result set
  cannot replace a newer query.

## Data shape

```ts
type SearchReadiness = "initializing" | "ready" | "error"

type SearchRequest = {
  requestId: string
  query: string
  locale: string
  limit: number
}

type SearchResult = {
  emojiId: string
  emoji: string
  toneLabel: string
  rationale: string
  score: number
  rank: number
}
```

## Decisions

- **2026-07-11 — Query text remains local.** Privacy is the core product
  boundary; a performance fix cannot silently replace it with server search.
- **2026-07-11 — Early input is buffered.** A rendered input must never discard
  the user's first interaction while hydration or WASM initialization catches up.

## Open questions

- What cold-load and repeat-load “time to first useful result” budgets are
  achievable on the supported low-end mobile baseline?
- Which compact artifact produces a useful first result before the full local
  corpus is available?
