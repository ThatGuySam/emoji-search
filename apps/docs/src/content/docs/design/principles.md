---
title: Design principles
description: The rules that govern FetchMoji product, content, privacy, and distribution trade-offs.
---

## SBC4

- `Tease:` Eight rules decide FetchMoji trade-offs.
- `Lede:` Intent, architectural privacy, input trust, evidence, localization, semantics, and point-of-use distribution form the product's decision system.
- `Why it matters:` Future changes can be evaluated without re-litigating the full strategy.
- `Go deeper:` Use these principles when a feature, metric, or channel conflicts with the core promise.

## Intent before labels

Accept the words a person naturally uses. Official emoji names are metadata, not
the required input language.

## Privacy by architecture

Queries and ranking stay on the device. Public copy names the exact boundary;
it never hides unrelated analytics behind an absolute “no telemetry” claim.

## Never lose the first interaction

The input is trustworthy from the moment it appears. If search is initializing,
the product preserves the query, exposes the state, and runs it when ready.

## A short answer with useful nuance

Lead with one fast pick. Offer a small comparison when tone matters. More
results are not automatically more helpful.

## Evidence selects expansion

Observed query demand, copy behavior, native review, and page usefulness decide
what grows. URL count is not a success metric.

## Localization is editorial work

Emoji meaning shifts with language, relationship, platform, and generation.
Localized advice requires a native reviewer and visible provenance.

## Semantic for everyone

The DOM, accessibility tree, and visible interface describe the same action and
state. Improvements for assistive technology also improve browser-agent use.

## Distribution at the point of use

Prefer channels that make FetchMoji easier to reuse—browser extension, search,
and integrations—over channels that create only a brief attention spike.
