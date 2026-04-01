# UX Frame And State Map: SEO Content Surfaces + Global Launcher

Date: 2026-03-30

## UX Frame

User goal:

- Find the right emoji quickly from any page, then copy it with minimal friction.

Platform and surface:

- Web (mobile + desktop) across:
  - home instant-search screen
  - intent hub/list screen
  - intent detail screens
  - iOS support article screens
  - about/methodology screen

Primary flow:

1. Land on content route from search.
2. Read direct answer and recommended emoji.
3. Launch global search via fake search box or `CMD/Ctrl+K`.
4. Refine phrase on home screen and copy result.

Input modes:

- Touch: tap launcher CTA, tap links.
- Pointer: click launcher CTA, links.
- Keyboard: `CMD/Ctrl+K` to route home and focus search.

Platform conventions preserved:

- Slash-based route hierarchy (`/emoji-for/`, `/ios/`, `/about/`).
- Sticky, visible launcher on non-home pages.
- Explicit breadcrumbs on detail pages.

Accessibility baseline:

- Clear headings and semantic sectioning.
- 44px-approx touch targets for launcher/buttons.
- Keyboard path for global search launch.
- High-contrast text over card surfaces.
- Reduced-motion safe (no required animation for completion).

## Screen State Map

Primary states:

- `home.default`: no query entered.
- `home.searching`: user entered phrase, results update.
- `content.default`: non-home page with fake launcher visible.
- `content.to-home`: launcher click or `CMD/Ctrl+K` redirects to `/`.
- `support.default`: concise troubleshooting content visible.
- `sitemap/robots.available`: technical discovery assets reachable.

Important transitions:

- `content.default -> content.to-home`: launcher click.
- `content.default -> content.to-home`: `CMD/Ctrl+K`.
- `content.to-home -> home.default`: route load completes.
- `home.default -> home.searching`: user types query.

Deferred/non-goal states for this rollout:

- Modal or overlay launcher state on content pages.
- Query-prefill transitions from content pages.
- Published multilingual page states with `hreflang` rendering.

