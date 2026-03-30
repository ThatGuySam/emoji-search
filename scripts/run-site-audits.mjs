import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'

import pa11y from 'pa11y'
import { chromium } from 'playwright'

const mode = process.argv[2] ?? 'all'
const host = '127.0.0.1'
const port = Number(process.env.AUDIT_PORT ?? 4173)
const auditUrl = process.env.AUDIT_URL ?? `http://${host}:${port}/`
const reportDir = join(process.cwd(), '.reports', 'site-health')
const astroBin = join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'astro.cmd' : 'astro'
)

const allowedModes = new Set([
  'all',
  'lighthouse',
  'pa11y',
])

const commonChromePaths = [
  '/opt/homebrew/bin/chromium',
  '/opt/homebrew/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]

if (!allowedModes.has(mode)) {
  console.error('Usage: node scripts/run-site-audits.mjs [all|lighthouse|pa11y]')
  process.exit(1)
}

async function main() {
  await mkdir(reportDir, { recursive: true })
  const chromePath = resolveChromePath()

  if (mode === 'lighthouse') {
    await withPreviewServer(async () => {
      await runLighthouse(chromePath)
    })
    return
  }

  if (mode === 'pa11y') {
    await withPreviewServer(async () => {
      await runPa11y(chromePath)
    })
    return
  }

  await withPreviewServer(async () => {
    await runLighthouse(chromePath)
    await runPa11y(chromePath)
  })
}

function resolveChromePath() {
  const explicitPaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
  ].filter(Boolean)

  for (const candidate of [...explicitPaths, ...commonChromePaths]) {
    if (candidate && existsSync(candidate)) {
      return candidate
    }
  }

  try {
    const playwrightPath = chromium.executablePath()
    if (playwrightPath && existsSync(playwrightPath)) {
      return playwrightPath
    }
  }
  catch {
    // Fall through to the explicit error below.
  }

  throw new Error(
    'Could not locate Chrome/Chromium. Set PUPPETEER_EXECUTABLE_PATH or run `pnpm exec playwright install chromium`.'
  )
}

async function withPreviewServer(runChecks) {
  const server = spawn(
    astroBin,
    ['preview', '--host', host, '--port', String(port)],
    {
      shell: process.platform === 'win32',
      stdio: 'inherit',
    }
  )

  try {
    await waitForUrl(auditUrl, 20000)
    await runChecks()
  }
  finally {
    server.kill('SIGTERM')

    try {
      await Promise.race([
        once(server, 'close'),
        delay(5000).then(() => {
          if (!server.killed) {
            server.kill('SIGKILL')
          }
        }),
      ])
    }
    catch {
      // Ignore shutdown races.
    }
  }
}

async function waitForUrl(url, timeoutMs) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: 'manual' })
      if (response.ok) {
        return
      }
    }
    catch {
      // Retry until timeout.
    }

    await delay(500)
  }

  throw new Error(`Timed out waiting for ${url}`)
}

async function runLighthouse(chromePath) {
  console.log(`Running Lighthouse against ${auditUrl}`)

  await runCommand('pnpm', [
    'exec',
    'lhci',
    'collect',
    '--config=./lighthouserc.json',
    `--chromePath=${chromePath}`,
  ])

  await runCommand('pnpm', [
    'exec',
    'lhci',
    'assert',
    '--config=./lighthouserc.json',
  ])
}

async function runPa11y(chromePath) {
  console.log(`Running pa11y against ${auditUrl}`)

  const results = await pa11y(auditUrl, {
    chromeLaunchConfig: {
      args: ['--no-sandbox'],
      executablePath: chromePath,
    },
    includeNotices: false,
    includeWarnings: false,
    runner: 'axe',
    standard: 'WCAG2AA',
    timeout: 30000,
    wait: 1000,
  })

  const reportPath = join(reportDir, 'pa11y.json')
  await writeFile(reportPath, `${JSON.stringify(results, null, 2)}\n`)

  if (results.issues.length > 0) {
    console.error(`Pa11y found ${results.issues.length} issue(s). Report: ${reportPath}`)
    for (const issue of results.issues.slice(0, 10)) {
      console.error(`- ${issue.type}: ${issue.code} at ${issue.selector}`)
    }

    throw new Error('Pa11y audit failed')
  }

  console.log(`Pa11y passed with 0 issues. Report: ${reportPath}`)
}

async function runCommand(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: process.platform === 'win32',
      stdio: 'inherit',
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 1}`))
    })
  })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
