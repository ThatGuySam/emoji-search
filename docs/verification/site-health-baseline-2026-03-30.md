# Site Health Baseline

Date: 2026-03-30

## Scope

Verify the new local and GitHub CI audit stack for FetchMoji.

## Commands Run

```sh
pnpm audit:health
```

## Results

- Build: passed
- Linkinator: passed, `0` links scanned from the current static output
- Lighthouse: passed category assertions
- Pa11y: passed with `0` issues

Extracted Lighthouse metrics from the latest JSON report in `.lighthouseci/`:

- Performance: `0.87`
- Accessibility: `1.00`
- Best practices: `0.96`
- SEO: `1.00`
- Largest Contentful Paint: `2408.80 ms`
- Total Blocking Time: `17.5 ms`
- Cumulative Layout Shift: `0.2146`

## Notes

- CLS is intentionally configured as a warning in `lighthouserc.json`, not a
  blocking error, because the current homepage still exceeds the `0.1`
  threshold.
- The earlier pa11y failure came from a redundant `role="list"` on an empty
  `ul` in `src/components/ResultGrid.tsx`; removing that role brought pa11y to
  zero issues.
- The Astro build still emits warnings about large chunks and `@electric-sql`
  browser externals. Those are not part of the health gate yet, but they are
  worth addressing when performance work starts.

## Artifact Paths

- `.lighthouseci/`
- `.reports/site-health/pa11y.json`
