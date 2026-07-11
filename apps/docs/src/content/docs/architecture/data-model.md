---
title: Data model
description: Versioned emoji, intent, locale, artifact, and privacy-safe event records form the shared contract across website and extension.
---

## SBC4

- `Tease:` Stable IDs and reviewed records connect the website, extension, and generated artifacts.
- `Lede:` Locale, emoji, intent, review, artifact, and measurement types define what is authored and what is generated.
- `Why it matters:` Explicit invariants prevent translation, linking, analytics, and artifact drift.
- `Go deeper:` Treat the types and invariants below as shared build contracts.

## Core entities

```ts
type Locale = {
  code: string
  label: string
  direction: "ltr" | "rtl"
  nativeReviewerRequired: boolean
}

type Emoji = {
  id: string
  glyph: string
  unicodeSequence: string
  shortName: string
  keywordsByLocale: Record<string, string[]>
}

type Intent = {
  id: string
  canonicalKey: string
  locale: string
  phrases: string[]
  fastPickEmojiId: string
  alternatives: IntentChoice[]
  messageExamples: string[]
  avoidWhen?: string
  relatedIntentIds: string[]
  review: EditorialReview
}

type IntentChoice = {
  emojiId: string
  toneLabel: string
  rationale: string
}

type EditorialReview = {
  status: "draft" | "native-review" | "published" | "retired"
  reviewer?: string
  reviewedAt?: string
  sourceNotes: string[]
}

type SearchArtifactManifest = {
  schemaVersion: number
  artifactVersion: string
  createdAt: string
  files: Array<{
    role: "initial" | "full" | "worker"
    url: string
    byteLength: number
    sha256: string
  }>
  localeCoverage: string[]
}
```

## Invariants

- Emoji IDs remain stable across artifact versions.
- A published intent references only known emoji and published related intents.
- A localized alternate is reciprocal only when both pages are published.
- Review provenance is required for localized advice and optional for neutral
  catalog metadata.
- Search artifacts are generated from reviewed source records through a
  reproducible build.
- Measurement events use a separate allowlisted type and cannot contain an
  `Intent`, query, message example, emoji ID, or arbitrary properties.

## Ownership

- Editorial source records are the source of truth for intent-page copy.
- Generated HTML, sitemap entries, vector/index files, and extension artifacts
  are build outputs.
- Search Console and store dashboards are evidence inputs, not content stores.
- This docs site owns the product contract; the live application repository owns
  implementation and tests.
