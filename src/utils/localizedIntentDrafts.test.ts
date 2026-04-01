import { describe, expect, it } from 'vitest'

import {
  buildLocalizedIntentDraftArtifact,
  parseLocalizedIntentFrontmatter,
} from './localizedIntentDrafts'

describe('parseLocalizedIntentFrontmatter', () => {
  it('extracts the localized slug and query fields', () => {
    const parsed = parseLocalizedIntentFrontmatter(`---
locale: "pt-BR"
sourceSlug: "awkward-silence"
localizedSlug: "silencio-constrangedor"
title: "Emoji para silêncio constrangedor"
description: "Melhores opções de emoji."
query: "silêncio constrangedor"
intentId: "bridge_awkward_silence"
---
Body`)

    expect(parsed).toEqual({
      locale: 'pt-BR',
      sourceSlug: 'awkward-silence',
      localizedSlug: 'silencio-constrangedor',
      title: 'Emoji para silêncio constrangedor',
      description: 'Melhores opções de emoji.',
      query: 'silêncio constrangedor',
      intentId: 'bridge_awkward_silence',
    })
  })
})

describe('buildLocalizedIntentDraftArtifact', () => {
  it('builds draft records from the published localized content', async () => {
    const artifact =
      await buildLocalizedIntentDraftArtifact({
        locale: 'pt-BR',
        generatedAt: '2026-04-01T00:00:00.000Z',
      })

    expect(artifact.locale).toBe('pt-BR')
    expect(artifact.records.length).toBe(10)
    expect(
      artifact.records.find(
        (record) =>
          record.id === 'bridge_awkward_silence',
      ),
    ).toMatchObject({
      localizedSlug: 'silencio-constrangedor',
      localizedQuery: 'silêncio constrangedor',
      confidence: 0.95,
    })
  })
})
