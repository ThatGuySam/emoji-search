# Vitest Browser Mode on GitHub Actions

> *AI-generated document (Claude Opus 4.5) — January 2026*

This guide covers the nuances of running Vitest Browser Mode
in GitHub Actions CI environments. Browser Mode lets you run
tests in real browsers (Chromium, Firefox, WebKit) rather
than simulated environments like jsdom.

## Table of Contents

1. [Why Browser Mode?](#why-browser-mode)
2. [Quick Start](#quick-start)
3. [Configuration Deep Dive](#configuration-deep-dive)
4. [GitHub Actions Workflow](#github-actions-workflow)
5. [Common Issues & Solutions](#common-issues--solutions)
6. [Vitest 4.0 Migration](#vitest-40-migration)
7. [Advanced Patterns](#advanced-patterns)
8. [Performance Tips](#performance-tips)

---

## Why Browser Mode?

Browser Mode provides access to real browser APIs:

- **Real DOM**: Actual `window`, `document`, `localStorage`
- **Browser Events**: Native event handling
- **Visual Testing**: Screenshot comparisons
- **WebGL/Canvas**: APIs unavailable in jsdom

Trade-offs:

| Aspect        | jsdom/happy-dom      | Browser Mode      |
|---------------|----------------------|-------------------|
| Speed         | Fast (~ms)           | Slower (~100ms+)  |
| Accuracy      | Simulated            | Real browser      |
| Setup         | Zero config          | Requires provider |
| CI Complexity | Simple               | Needs browsers    |

---

## Quick Start

### 1. Install Dependencies

```bash
# Vitest 4.0+ uses separate provider packages
npm install -D vitest @vitest/browser-playwright

# Or with pnpm (preferred)
pnpm add -D vitest @vitest/browser-playwright
```

### 2. Configure Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true, // Required for CI
      instances: [
        { browser: 'chromium' },
      ],
    },
  },
})
```

### 3. Create Workflow

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm test
```

---

## Configuration Deep Dive

### Provider Options

Vitest 4.0 supports three browser providers:

```typescript
// Playwright (recommended for CI)
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    browser: {
      provider: playwright({
        // Pass Playwright launch options
        launchOptions: {
          slowMo: 50, // Debugging only
        },
      }),
      instances: [
        { browser: 'chromium' },
        { browser: 'firefox' },
        { browser: 'webkit' },
      ],
    },
  },
})
```

```typescript
// WebdriverIO (alternative)
import { webdriverio } from '@vitest/browser-webdriverio'

export default defineConfig({
  test: {
    browser: {
      provider: webdriverio(),
      instances: [
        { browser: 'chrome' },
      ],
    },
  },
})
```

### Headless Mode

**Critical for CI**: Headless mode runs browsers without
a visible UI. Vitest auto-enables this in CI, but explicit
configuration is recommended:

```typescript
export default defineConfig({
  test: {
    browser: {
      headless: true,
      // Or conditionally:
      // headless: !!process.env.CI,
    },
  },
})
```

### Multiple Browser Instances

Run tests across multiple browsers:

```typescript
export default defineConfig({
  test: {
    browser: {
      instances: [
        { browser: 'chromium' },
        { browser: 'firefox' },
        { browser: 'webkit' },
      ],
    },
  },
})
```

---

## GitHub Actions Workflow

### Minimal Working Example

```yaml
name: Vitest Browser Tests
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Critical: Install Playwright browsers + OS deps
      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run tests
        run: npm test
```

### With Caching (Faster CI)

```yaml
name: Vitest Browser Tests (Cached)
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Cache Playwright browsers
      - name: Get Playwright version
        id: playwright-version
        run: |
          echo "version=$(npm ls playwright --json | \
            jq -r '.dependencies.playwright.version')" \
            >> $GITHUB_OUTPUT

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        id: playwright-cache
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ steps.playwright-version.outputs.version }}

      - name: Install Playwright browsers
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps

      # Install OS deps even if browsers are cached
      - name: Install Playwright OS deps
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps

      - name: Run tests
        run: npm test
```

### Using Docker (Most Reliable)

For maximum consistency, use Playwright's Docker image:

```yaml
name: Vitest (Docker)
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.50.0-noble
      options: --user 1001

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm test
```

> **Note**: Update the Playwright image version to match
> your installed `playwright` package version.

### Separating Unit and Browser Tests

```yaml
name: All Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit

  browser-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:browser
```

With corresponding scripts:

```json
{
  "scripts": {
    "test:unit": "vitest run --exclude '**/*.browser.test.*'",
    "test:browser": "vitest run --browser.enabled"
  }
}
```

---

## Common Issues & Solutions

### 1. "Browser executable doesn't exist"

**Cause**: Playwright browsers not installed.

**Solution**:

```yaml
- run: npx playwright install --with-deps
```

The `--with-deps` flag installs system dependencies
(fonts, libraries) required by the browsers.

### 2. Sandbox Errors on Linux

**Cause**: Chrome's sandbox requires elevated permissions.

**Solution**: Add `--no-sandbox` flag:

```typescript
export default defineConfig({
  test: {
    browser: {
      provider: playwright({
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      }),
    },
  },
})
```

Or use the `--user 1001` option with Docker:

```yaml
container:
  image: mcr.microsoft.com/playwright:v1.50.0-noble
  options: --user 1001
```

### 3. `@playwright/test` Conflict

**Cause**: `@playwright/test` and `playwright` packages
are incompatible when installed together. Vitest Browser
Mode requires `playwright`, but `@playwright/test` forbids
its presence.

**Solution**: Choose one approach:

```bash
# Option A: Use only Vitest Browser Mode
npm uninstall @playwright/test
npm install -D playwright @vitest/browser-playwright

# Option B: Keep both separate (different projects/workspaces)
```

If you need both, consider a monorepo structure:

```
packages/
  app/            # Uses Vitest Browser Mode
  e2e/            # Uses @playwright/test
```

### 4. Tests Hanging Indefinitely

**Cause**: Thread-blocking dialogs (`alert`, `confirm`).

**Solution**: Vitest mocks these by default, but explicit
mocking is recommended:

```typescript
// In your test setup
vi.stubGlobal('alert', vi.fn())
vi.stubGlobal('confirm', vi.fn(() => true))
vi.stubGlobal('prompt', vi.fn(() => 'mocked'))
```

### 5. ERR_CONNECTION_REFUSED in Docker

**Cause**: Network configuration issues.

**Solution**: Check `allowedHosts` or use host networking:

```yaml
container:
  image: mcr.microsoft.com/playwright:v1.50.0-noble
  options: --user 1001 --network host
```

### 6. Flaky Tests in CI

**Cause**: Resource contention, timing issues.

**Solutions**:

```typescript
// Increase timeout for CI
export default defineConfig({
  test: {
    testTimeout: process.env.CI ? 30000 : 10000,
    browser: {
      // Reduce parallelism in CI
      pool: {
        threads: process.env.CI ? 1 : 4,
      },
    },
  },
})
```

### 7. Visual Regression Failures

**Cause**: Font rendering differs between environments.

**Solution**: Run visual tests only in Docker:

```yaml
# Only run visual tests in controlled environment
jobs:
  visual-tests:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.50.0-noble
      options: --user 1001
```

---

## Vitest 4.0 Migration

Vitest 4.0 introduced breaking changes to Browser Mode.

### Package Changes

```bash
# Old (Vitest 3.x)
npm install -D @vitest/browser

# New (Vitest 4.0+)
npm install -D @vitest/browser-playwright
# or
npm install -D @vitest/browser-webdriverio
```

### Configuration Changes

```typescript
// Old (Vitest 3.x)
export default defineConfig({
  test: {
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
    },
  },
})

// New (Vitest 4.0+)
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [
        { browser: 'chromium' },
      ],
    },
  },
})
```

### Import Path Changes

```typescript
// Old
import { page } from '@vitest/browser/context'

// New
import { page } from 'vitest/browser'
```

---

## Advanced Patterns

### Conditional Browser Mode

Enable browser mode only for specific test files:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    browser: {
      enabled: false, // Disabled by default
    },
  },
})

// vitest.browser.config.ts
export default defineConfig({
  test: {
    include: ['**/*.browser.test.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
})
```

```json
{
  "scripts": {
    "test:unit": "vitest run",
    "test:browser": "vitest run -c vitest.browser.config.ts"
  }
}
```

### Test Sharding

Split tests across multiple CI jobs:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm test -- --shard=${{ matrix.shard }}/4
```

### Artifact Upload on Failure

```yaml
- name: Run tests
  run: npm test
  continue-on-error: true
  id: tests

- name: Upload test artifacts
  if: steps.tests.outcome == 'failure'
  uses: actions/upload-artifact@v4
  with:
    name: test-artifacts
    path: |
      test-results/
      playwright-report/
    retention-days: 7
```

---

## Performance Tips

### 1. Cache Playwright Browsers

See [With Caching](#with-caching-faster-ci) section above.

### 2. Run Critical Tests First

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    sequence: {
      // Run faster tests first
      sequencer: class extends BaseSequencer {
        async sort(files) {
          return files.sort((a, b) => {
            if (a.includes('critical')) return -1
            return 1
          })
        }
      },
    },
  },
})
```

### 3. Use Chromium Only in CI

WebKit and Firefox are slower to start:

```typescript
export default defineConfig({
  test: {
    browser: {
      instances: process.env.CI
        ? [{ browser: 'chromium' }]
        : [
            { browser: 'chromium' },
            { browser: 'firefox' },
            { browser: 'webkit' },
          ],
    },
  },
})
```

### 4. Parallel Execution Limits

```typescript
export default defineConfig({
  test: {
    // Limit concurrent tests in CI
    maxConcurrency: process.env.CI ? 2 : 10,
    browser: {
      headless: true,
    },
  },
})
```

---

## Debugging CI Failures

### Enable Debug Logging

```yaml
- name: Run tests with debug
  run: DEBUG=pw:browser npm test
  env:
    DEBUG: pw:browser
```

### Capture Screenshots on Failure

```typescript
// In test setup
afterEach(async ({ task }) => {
  if (task.result?.state === 'fail') {
    await page.screenshot({
      path: `test-results/${task.name}.png`,
    })
  }
})
```

### Run Headed Mode Locally

```bash
# Debug with visible browser
npx vitest --browser.headless=false
```

---

## References

- [Vitest Browser Mode Docs](https://vitest.dev/guide/browser/)
- [Vitest 4.0 Migration Guide](https://vitest.dev/guide/migration)
- [Playwright CI Guide](https://playwright.dev/docs/ci)
- [Vitest GitHub Actions (Official)](https://github.com/vitest-dev/vitest/blob/main/.github/workflows/ci.yml)
- [Known Issue: @playwright/test conflict](https://github.com/vitest-dev/vitest/issues/3807)
