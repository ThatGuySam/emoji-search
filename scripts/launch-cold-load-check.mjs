import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium, devices, webkit } from 'playwright'

const BASE_URL = process.env.CHECK_BASE_URL ?? 'https://fetchmoji.com/'
const RUNS = Number(process.env.RUNS ?? 5)
const QUERIES = (process.env.QUERIES ?? 'shout,attach').split(',')
const RESULT_TIMEOUT_MS = Number(process.env.RESULT_TIMEOUT_MS ?? 90_000)
const OUT = process.env.OUT ?? 'docs/verification/launch-cold-load'
const ENGINE = process.env.ENGINE ?? 'webkit'
const DEVICE = ENGINE === 'webkit' ? 'iPhone 15 Pro' : 'Pixel 7'

async function newColdContext() {
  if (ENGINE === 'webkit') return { context: await (await webkit.launch()).newContext({ ...devices[DEVICE] }) }
  const profile = await mkdtemp(join(tmpdir(), 'fetchmoji-cold-'))
  const context = await chromium.launchPersistentContext(profile, { channel: 'chrome', ...devices[DEVICE] })
  return { context, profile }
}

async function runOnce(index) {
  const { context, profile } = await newColdContext()
  const page = context.pages()[0] ?? await context.newPage()
  const errors = []
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
  })
  page.on('requestfailed', (req) =>
    errors.push(`requestfailed: ${req.url()} ${req.failure()?.errorText}`))
  page.on('response', (res) => {
    if (res.status() >= 400) errors.push(`http ${res.status()}: ${res.url()}`)
  })

  const run = { index, queries: {}, errors }
  const started = Date.now()
  try {
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 60_000 })
    run.isolation = await page.evaluate(() => ({
      crossOriginIsolated: globalThis.crossOriginIsolated,
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      webgpu: 'gpu' in navigator,
    }))
    const input = page.getByLabel('Search emojis by meaning')
    for (const query of QUERIES) {
      await input.fill('')
      const t0 = Date.now()
      await input.pressSequentially(query, { delay: 120 })
      const first = page.locator('button[aria-label^="Copy "]').first()
      try {
        await first.waitFor({ timeout: RESULT_TIMEOUT_MS })
        await page.waitForTimeout(800)
        const labels = await page.locator('button[aria-label^="Copy "]')
          .evaluateAll((els) => els.slice(0, 10).map((el) =>
            `${el.textContent?.trim()} ${el.getAttribute('aria-label')?.replace(/^Copy | emoji$/g, '')}`))
        const inputValue = await input.inputValue()
        run.queries[query] = { ok: inputValue === query, ms: Date.now() - t0, inputValue, top: labels }
      } catch {
        run.queries[query] = { ok: false, ms: Date.now() - t0, top: [] }
      }
    }
  } catch (err) {
    errors.push(`run: ${err.message}`)
  }
  run.totalMs = Date.now() - started
  run.browserVersion = context.browser()?.version() ?? 'persistent'
  await context.close()
  if (profile) await rm(profile, { recursive: true, force: true })
  return run
}

const runs = []
for (let i = 0; i < RUNS; i++) {
  const run = await runOnce(i)
  runs.push(run)
  const status = QUERIES.map((q) =>
    `${run.queries[q]?.ok ? '✅' : '❌'} ${q} ${run.queries[q]?.ms ?? '-'}ms${run.queries[q]?.inputValue !== undefined && run.queries[q].inputValue !== q ? ` (box had "${run.queries[q].inputValue}")` : ''}`).join('  ')
  console.log(`🧪 run ${i + 1}/${RUNS}  ${status}  ${run.errors.length ? `⚠️ ${run.errors.length} errors` : ''}`)
}

const failed = runs.filter((r) => QUERIES.some((q) => !r.queries[q]?.ok))
const summary = {
  baseUrl: BASE_URL,
  engine: ENGINE === 'webkit' ? 'webkit' : 'chrome (fresh on-disk profile per run)',
  device: `${DEVICE} (emulated)`,
  checkedAt: new Date().toISOString(),
  runs: RUNS,
  failedRuns: failed.length,
  runsDetail: runs,
}
await mkdir(OUT, { recursive: true })
const file = `${OUT}/${summary.checkedAt.slice(0, 19).replace(/:/g, '')}.json`
await writeFile(file, `${JSON.stringify(summary, null, 2)}\n`)
for (const q of QUERIES) console.log(`🔎 ${q}: ${runs.find((r) => r.queries[q]?.ok)?.queries[q].top.slice(0, 5).join(' | ') ?? 'no results'}`)
console.log(`${failed.length ? '❌' : '✅'} ${RUNS - failed.length}/${RUNS} cold loads returned results  📄 ${file}`)
process.exitCode = failed.length ? 1 : 0
