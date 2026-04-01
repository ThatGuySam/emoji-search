import { defineCollection, z } from 'astro:content'

const intentPages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    query: z.string(),
    intentId: z.string(),
    h1: z.string(),
    ctaLabel: z
      .string()
      .default('Try this in FetchMoji'),
    relatedSlugs: z.array(z.string()).min(2),
  }),
})

const supportPages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    h1: z.string(),
    issue: z.string(),
    ctaLabel: z
      .string()
      .default('Open FetchMoji search'),
    relatedIntentSlugs: z.array(z.string()).default([]),
  }),
})

const localizedIntentPages = defineCollection({
  type: 'content',
  schema: z.object({
    locale: z.enum(['pt-BR', 'ja-JP', 'hi-IN']),
    sourceSlug: z.string(),
    localizedSlug: z.string(),
    title: z.string(),
    description: z.string(),
    query: z.string(),
    intentId: z.string(),
    h1: z.string(),
    ctaLabel: z.string(),
    relatedSlugs: z.array(z.string()).min(2),
  }),
})

export const collections = {
  'intent-pages': intentPages,
  'support-pages': supportPages,
  'localized-intent-pages': localizedIntentPages,
}
