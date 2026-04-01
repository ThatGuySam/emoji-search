import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium, devices } from 'playwright'

const DEFAULT_BASE_URL =
  process.env.CHECK_BASE_URL ??
  'https://seo-preview.fetchmoji.com'
const DEFAULT_SCREENSHOT_DIR =
  process.env.CHECK_SCREENSHOT_DIR ??
  'docs/verification/screenshots/post-deploy'
const PROXY_DB_PATH =
  '/proxy/db/src/artifacts/Xenova/gte-small-384/emoji-int8.tar'

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    screenshotDir: DEFAULT_SCREENSHOT_DIR,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (
      value === '--base-url' &&
      argv[index + 1]
    ) {
      args.baseUrl = argv[index + 1]
      index += 1
      continue
    }

    if (
      value === '--screenshots-dir' &&
      argv[index + 1]
    ) {
      args.screenshotDir = argv[index + 1]
      index += 1
    }
  }

  return args
}

function createRuntimeProbe(page) {
  const runtime = {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
  }

  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtime.consoleErrors.push(message.text())
    }
  })

  page.on('pageerror', (error) => {
    runtime.pageErrors.push(error.message)
  })

  page.on('requestfailed', (request) => {
    runtime.requestFailures.push({
      url: request.url(),
      error:
        request.failure()?.errorText ??
        'request failed',
    })
  })

  return runtime
}

function assertNoRuntimeFailures(
  runtime,
  label,
) {
  const relevantConsoleErrors =
    runtime.consoleErrors.filter((entry) =>
      /cors|cross-origin|failed to fetch|networkerror/i.test(
        entry,
      ),
    )
  const relevantPageErrors =
    runtime.pageErrors.filter((entry) =>
      /cors|cross-origin|failed to fetch|networkerror/i.test(
        entry,
      ),
    )
  const relevantRequestFailures =
    runtime.requestFailures.filter(
      (entry) =>
        /cdn\.fetchmoji\.com|\/proxy\/db\/|\/proxy\/models\/|emoji-search\.sqlite|\.tar|\.bin|worker/i.test(
          entry.url,
        ) &&
        !/ERR_ABORTED/i.test(entry.error),
    )

  assert.equal(
    relevantConsoleErrors.length,
    0,
    `${label}: console errors indicate a runtime or CORS problem:\n${relevantConsoleErrors.join('\n')}`,
  )
  assert.equal(
    relevantPageErrors.length,
    0,
    `${label}: page errors indicate a runtime or CORS problem:\n${relevantPageErrors.join('\n')}`,
  )
  assert.equal(
    relevantRequestFailures.length,
    0,
    `${label}: asset requests failed:\n${relevantRequestFailures
      .map((entry) => `${entry.url} -> ${entry.error}`)
      .join('\n')}`,
  )
}

function routeUrl(baseUrl, pathname) {
  return new URL(
    pathname,
    baseUrl.endsWith('/')
      ? baseUrl
      : `${baseUrl}/`,
  ).toString()
}

async function expectCopiedToast(page) {
  const toast = page
    .locator('[role="status"]')
    .filter({
      hasText: 'Copied',
    })
    .first()

  await toast.waitFor({
    state: 'visible',
    timeout: 10000,
  })
}

async function assertSearchSettles(
  page,
  query,
) {
  const searchbox = page.getByRole('searchbox', {
    name: /search emojis by meaning/i,
  })
  await searchbox.waitFor()
  await page.waitForTimeout(1000)
  await searchbox.fill(query)
  await page.waitForTimeout(250)

  const resultButtons = page.locator(
    'button[aria-label^="Copy "]',
  )
  await resultButtons.first().waitFor({
    state: 'visible',
    timeout: 30000,
  })

  await page
    .getByText('Searching…')
    .waitFor({
      state: 'hidden',
      timeout: 30000,
    })
    .catch(() => {})

  assert.ok(
    (await resultButtons.count()) >= 1,
    `Search for "${query}" should render at least one result.`,
  )
}

async function assertCorsFetch(
  page,
  baseUrl,
) {
  const assetUrl = routeUrl(
    baseUrl,
    PROXY_DB_PATH,
  )
  const result = await page.evaluate(
    async (assetUrl) => {
      try {
        const response = await fetch(assetUrl, {
          method: 'HEAD',
        })
        return {
          ok: response.ok,
          status: response.status,
          type: response.type,
        }
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        }
      }
    },
    assetUrl,
  )

  assert.equal(
    result.ok,
    true,
    `Asset fetch failed for ${assetUrl}: ${JSON.stringify(result)}`,
  )
}

async function checkHomeDesktop(
  browser,
  baseUrl,
  screenshotDir,
) {
  const context = await browser.newContext({
    viewport: {
      width: 1440,
      height: 1024,
    },
  })
  const page = await context.newPage()
  const runtime = createRuntimeProbe(page)
  const homeUrl = routeUrl(
    baseUrl,
    '/?no_cache=1',
  )

  await page.goto(homeUrl, {
    waitUntil: 'domcontentloaded',
  })

  const searchbox = page.getByRole('searchbox', {
    name: /search emojis by meaning/i,
  })
  await searchbox.waitFor()
  await page.waitForTimeout(250)

  const isFocused = await searchbox.evaluate(
    (element) =>
      element === document.activeElement,
  )
  assert.equal(
    isFocused,
    true,
    'Home search should autofocus on load.',
  )

  const browseLinks = page.locator(
    '[data-home-browse-link]',
  )
  assert.ok(
    (await browseLinks.count()) >= 2,
    'Homepage should expose minimal browse navigation in the first view.',
  )

  await assertCorsFetch(page, baseUrl)

  await assertSearchSettles(
    page,
    'awkward silence',
  )
  assert.equal(
    await page
      .locator('text=fallback')
      .count(),
    0,
    'Homepage search should not immediately fall back with a backend error.',
  )

  await page.screenshot({
    path: path.join(
      screenshotDir,
      'home-desktop.png',
    ),
    fullPage: true,
  })

  assertNoRuntimeFailures(
    runtime,
    'home-desktop',
  )
  await context.close()
}

async function checkIntentDesktopLauncher(
  browser,
  baseUrl,
) {
  const context = await browser.newContext({
    viewport: {
      width: 1280,
      height: 960,
    },
  })
  const page = await context.newPage()

  await page.goto(
    routeUrl(baseUrl, '/emoji-for/awkward/'),
    {
      waitUntil: 'domcontentloaded',
    },
  )

  await page.locator('[data-top-nav-search]').waitFor()
  await page.keyboard.press('Control+K')
  await page.waitForURL(
    (url) =>
      new URL(url).pathname === '/',
    {
      timeout: 10000,
    },
  )

  const searchbox = page.getByRole('searchbox', {
    name: /search emojis by meaning/i,
  })
  await searchbox.waitFor()
  const isFocused = await searchbox.evaluate(
    (element) =>
      element === document.activeElement,
  )
  assert.equal(
    isFocused,
    true,
    'Control+K should route back to home search and focus the input.',
  )

  await context.close()
}

async function checkMobileScreens(
  browser,
  baseUrl,
  screenshotDir,
) {
  const context = await browser.newContext({
    ...devices['iPhone 13'],
  })
  const page = await context.newPage()

  await page.goto(
    routeUrl(baseUrl, '/?no_cache=1'),
    {
      waitUntil: 'domcontentloaded',
    },
  )
  await page.getByRole('searchbox', {
    name: /search emojis by meaning/i,
  }).waitFor()
  await assertSearchSettles(
    page,
    'awkward silence',
  )
  await page.screenshot({
    path: path.join(
      screenshotDir,
      'home-mobile.png',
    ),
    fullPage: true,
  })

  await page.goto(
    routeUrl(baseUrl, '/emoji-for/awkward/'),
    {
      waitUntil: 'domcontentloaded',
    },
  )
  const quickCopyButtons = page.locator(
    '[data-quick-copy-button]',
  )
  assert.ok(
    (await quickCopyButtons.count()) >= 3,
    'Intent pages should expose a thumb-friendly quick-copy strip.',
  )

  const firstQuickCopyBox =
    await quickCopyButtons.first().boundingBox()
  const headingBox = await page
    .getByRole('heading', {
      level: 1,
    })
    .boundingBox()

  assert.ok(
    firstQuickCopyBox &&
      headingBox &&
      firstQuickCopyBox.y < headingBox.y,
    'Quick-copy actions should appear before the main article heading.',
  )

  await quickCopyButtons.first().click()
  await expectCopiedToast(page)
  assert.ok(
    (await page
      .locator('[data-related-intent-emoji]')
      .count()) >= 1,
    'Related intent links should include an emoji scan cue.',
  )
  await page.screenshot({
    path: path.join(
      screenshotDir,
      'intent-mobile.png',
    ),
    fullPage: true,
  })

  await page.goto(
    routeUrl(baseUrl, '/emoji-for/'),
    {
      waitUntil: 'domcontentloaded',
    },
  )
  assert.ok(
    (await page
      .locator('[data-intent-hub-emoji]')
      .count()) >= 1,
    'Intent hub cards should lead with representative emoji.',
  )
  await page.screenshot({
    path: path.join(
      screenshotDir,
      'intent-hub-mobile.png',
    ),
    fullPage: true,
  })

  await context.close()
}

async function main() {
  const {
    baseUrl,
    screenshotDir,
  } = parseArgs(process.argv.slice(2))

  mkdirSync(screenshotDir, {
    recursive: true,
  })

  const browser = await chromium.launch({
    headless: true,
  })

  try {
    await checkHomeDesktop(
      browser,
      baseUrl,
      screenshotDir,
    )
    await checkIntentDesktopLauncher(
      browser,
      baseUrl,
    )
    await checkMobileScreens(
      browser,
      baseUrl,
      screenshotDir,
    )

    console.log(
      [
        `Post-deploy checks passed for ${baseUrl}`,
        `Screenshots saved to ${screenshotDir}`,
      ].join('\n'),
    )
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
