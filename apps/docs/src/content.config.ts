import { defineCollection, z } from "astro:content"
import { docsLoader } from "@astrojs/starlight/loaders"
import { docsSchema } from "@astrojs/starlight/schema"

// Visibility is private by default (the auth Worker gates everything not listed
// as public). Mark a page open to the internet with `public: true` in its
// frontmatter; `private: false` is an accepted alias. See worker/index.ts and
// scripts/build-visibility-manifest.mjs.
export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        public: z.boolean().optional(),
        private: z.boolean().optional(),
      }),
    }),
  }),
}
