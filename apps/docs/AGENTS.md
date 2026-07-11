# Build handoff — FetchMoji growth iteration

FetchMoji is live at `https://fetchmoji.com/`. This app is its **growth spec**,
written docs-first so the next product, content, privacy, and distribution work
can be reviewed before implementation.

## Read the spec first

- **Deployed:** `https://fetchmoji.docs.samcarlton.com/llms-full.txt`
  - The site is private by default. Agents use the fleet `AUTH_SECRET` as
    `Authorization: Bearer <secret>`.
- **Local:** run `bun run build` in this directory and read
  `dist/llms-full.txt`, or read `src/content/docs/features/` and
  `src/content/docs/architecture/` directly.
- **Evidence:** research lives under `src/content/docs/research/`. It supports
  the spec but is not itself the implementation contract.

## How to build from it

- Build product changes from this repository's root app or `apps/ext`; do not
  implement the product inside this Starlight app.
- Match each feature page's **Behavior**, **Inputs & outputs**, **States & edge
  cases**, and **Data shape** sections.
- Read `src/content/docs/project/open-questions.md` before making a material
  choice. Ask the human about items under **Open**; do not silently resolve them.
- Preserve the explicit decisions: query text stays local, native review gates
  localized advice, Chrome is the first extension surface, and Product Hunt is
  secondary.
- For extension work, use WXT + TypeScript + React, keep the search package
  UI-independent, bundle all executable JavaScript and WebAssembly, and maintain
  a human-reviewed `CHROMEWEBSTORE.md` from the start.
- Treat the extension research inventory's P0 items and release gates as the
  minimum submission contract. Do not infer privacy, permission, or remote-code
  declarations from intent; prove them against the production ZIP and browser
  behavior.
- Reflect implementation-forced contract changes back into these docs and add a
  changelog entry before redeploying.
- Docs are not tests. Add unit, integration, browser, crawler, accessibility,
  privacy-network, and extension tests appropriate to the implementation.

## Status

The core website exists. The growth iteration described by pages marked
**Planned** is not yet implemented. Start with Phase 0 in the Roadmap and stop on
any unresolved fork listed in Open questions & decisions.
