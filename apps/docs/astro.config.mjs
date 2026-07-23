// @ts-check
import starlight from "@astrojs/starlight"
import { defineConfig } from "astro/config"
import starlightLlmsTxt from "starlight-llms-txt"

// FetchMoji — PRODUCT GROWTH DOCUMENTATION AS SPEC.
// FetchMoji is live. This site describes the reviewed target state for its next
// growth iteration so product, discovery, and distribution changes stay aligned.
//
// starlight-llms-txt emits /llms.txt, /llms-full.txt, and /llms-small.txt at
// build time. /llms-full.txt is the machine-readable spec a build agent reads.
export default defineConfig({
  site: "https://fetchmoji.docs.samcarlton.com",
  integrations: [
    starlight({
      title: "FetchMoji",
      description:
        "The reviewable growth spec for FetchMoji: private semantic search, demand-led intent pages, agent discovery, and extension distribution.",
      plugins: [starlightLlmsTxt()],
      // Custom sidebar template (auth gate): tags private nav entries and
      // fully-private groups with data-private at build; the Worker removes them
      // for anonymous viewers. Frontmatter-driven — new pages auto-classified.
      components: {
        Sidebar: "./src/components/Sidebar.astro",
      },
      customCss: [
        "@fontsource-variable/geist",
        "@fontsource-variable/geist-mono",
        "./src/styles/custom.css",
      ],
      social: [
        {
          icon: "github",
          label: "FetchMoji on GitHub",
          href: "https://github.com/ThatGuySam/emoji-search",
        },
      ],
      lastUpdated: true,
      // Build this sidebar to match the pages you actually create in
      // src/content/docs/. Keep the two tiers visibly separate:
      //   Overview + Design  = human tier (the "why", for review)
      //   Features + Architecture = machine tier (the "what", the spec)
      // Badge the planned features so nobody mistakes the spec for shipped.
      sidebar: [
        {
          label: "Overview",
          items: [
            { label: "Introduction", slug: "overview/introduction" },
            { label: "Who it's for", slug: "overview/who-its-for" },
            { label: "How it works", slug: "overview/how-it-works" },
          ],
        },
        {
          label: "Features",
          badge: { text: "Planned", variant: "note" },
          items: [
            { label: "Semantic search", slug: "features/semantic-search" },
            { label: "macOS desktop palette", slug: "features/macos-desktop-palette" },
            { label: "Intent pages", slug: "features/intent-pages" },
            { label: "Browser extension", slug: "features/browser-extension" },
            { label: "Privacy & measurement", slug: "features/privacy-measurement" },
            { label: "Agent discovery", slug: "features/agent-discovery" },
          ],
        },
        {
          label: "Design",
          items: [
            // Motivation = the one eval-validated default human-tier page (the
            // "why it exists" Explanation). Keep it human-tier; never machine-tier.
            { label: "Motivation", slug: "design/motivation" },
            { label: "Design principles", slug: "design/principles" },
          ],
        },
        {
          label: "Architecture",
          items: [
            { label: "Tech stack", slug: "architecture/tech-stack" },
            { label: "Data model", slug: "architecture/data-model" },
          ],
        },
        {
          label: "Project",
          items: [
            { label: "Roadmap", slug: "project/roadmap" },
            { label: "Open questions & decisions", slug: "project/open-questions" },
            { label: "Changelog", slug: "project/changelog" },
          ],
        },
        {
          // The evidence the spec is built ON — the source-backed research memos,
          // published from the workspace's docs/research/ library. Default section.
          // Publishing MOVES a memo here (the site page is its source of truth) and
          // leaves a reference stub at the old workspace path. Add one slug: entry
          // per memo (the sams-research skill publishes here); keep just Overview
          // until memos exist. Recipe: the docs-spec skill's
          // references/docs-as-spec.md "Research" section.
          label: "Research",
          collapsed: true,
          items: [
            { label: "Overview", link: "/research/" },
            {
              label: "Growth channels audit",
              slug: "research/fetchmoji-growth-seo-agent-search-channels-2026-07-11",
            },
            {
              label: "Extension build & review",
              slug: "research/chrome-extension-specs-boilerplates-rejections-quality-inventory-2026-07-11",
            },
            {
              label: "macOS desktop prototypes",
              slug: "research/macos-emoji-palette-desktop-app-prototypes-2026-07-15",
            },
          ],
        },
      ],
    }),
  ],
})
