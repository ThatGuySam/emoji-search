---
title: Motivation
description: FetchMoji turns emoji selection from a label lookup into a private tone decision at the moment of writing.
---

## SBC4

- `Tease:` Emoji selection is a tone decision, not a catalog lookup.
- `Lede:` FetchMoji combines private intent search, reviewed explanations, and a reusable extension because each solves a different failure in the current workflow.
- `Why it matters:` This mental model explains why more URLs or a one-day launch cannot substitute for product utility.
- `Go deeper:` Review the design decisions, rejected alternatives, and non-goals.

Emoji selection fails in two different ways. Keyboard search asks for an
official label the writer may not know. Generic web lists return many symbols
without resolving the harder question: which one communicates this tone in this
message?

FetchMoji exists because that is a meaning problem, not a catalog problem.

## The problem

The status quo splits the job across a keyboard, a search engine, and intuition.
The writer guesses a synonym, scans unrelated results, and still has to decide
whether an emoji reads as warm, ironic, dismissive, awkward, or excessive.

A website can answer that question, but a website-only utility is easy to forget
and expensive to revisit for a two-second task. A large set of templated landing
pages can attract impressions, but it does not create retention and can weaken
trust if the pages add no distinct judgment.

## The mental model

FetchMoji is a **tone picker that starts with the writer's own words**. The
interactive search makes the immediate decision; reviewed intent pages explain
high-demand decisions; the extension makes the picker available where the
writing happens.

## Key design decisions

- **Queries stay on the device.** Message-adjacent text receives a structural
  privacy boundary, not a policy promise. (Consequence: the local index must be
  small and fast enough for ordinary devices.)
- **Demand selects pages.** Search Console query clusters determine the
  editorial queue. (Consequence: coverage grows more slowly than automated URL
  generation.)
- **Every page earns a separate decision.** A published intent page includes
  tone trade-offs, examples, and misreading guidance. (Consequence: localization
  requires human review.)
- **The extension is the launch object.** Distribution is attached to repeat
  utility rather than a one-day leaderboard. (Consequence: extension quality,
  permissions, and support become product responsibilities.)
- **Ordinary web semantics serve humans and agents.** Crawlable text, links,
  labels, and states come before special AI files. (Consequence: agent-specific
  protocols remain optional until a real integration needs them.)

## Alternatives considered

- **Publish many more phrase variations.** Rejected because impressions alone
  do not prove distinct value, and scaled near-duplicate pages create search
  quality risk.
- **Launch the existing website on Product Hunt first.** Rejected as the primary
  ignition because Product Hunt rewards existing community momentum and does not
  put the product into the repeated writing workflow.
- **Move search to a server for a lighter client.** Rejected as the default
  because sending natural message text across the network breaks the strongest
  product distinction.
- **Add `llms.txt` and AI-specific prose as the agent strategy.** Rejected because
  current search guidance prioritizes indexable, useful content and semantic web
  structure; Google does not use `llms.txt` as a ranking mechanism.

## Non-goals

- a comprehensive encyclopedia of every Unicode emoji;
- custom emoji or image generation;
- automatic reading of messages or webpages;
- behavioral profiling or query-level analytics;
- publishing unreviewed translated pages;
- treating launch badges, directory listings, or AI markup as the growth engine.
