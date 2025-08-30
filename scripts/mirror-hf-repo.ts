/**
 * Mirror a Hugging Face repo (including Git LFS) into Cloudflare R2.
 *
 * - Clones the repo (optionally at a given revision)
 * - Pulls LFS objects (git lfs fetch/checkout)
 * - Uploads all files to R2 at keys matching
 *   `{model}/resolve/{revision}/<relative_path>`
 *
 * Usage:
 *   bun scripts/mirror-hf-repo.ts <repo> [revision]
 *   # repo can be:
 *   #   - org/repo
 *   #   - https://huggingface.co/org/repo
 *
 * Examples:
 *   bun scripts/mirror-hf-repo.ts Xenova/gte-small
 *   bun scripts/mirror-hf-repo.ts https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2 v1.0
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { argv } from 'node:process'

import { upsertObject } from '../src/utils/r2.node'
import { env } from '../src/env'

type MirrorOptions = {
  repo: string
  revision: string
}

const MAX_PARALLEL = 4
/**
 * Parse CLI arguments into options.
 *
 * Accepts either `org/repo` or a full HF URL and an optional revision.
 * Defaults revision to `main`.
 */
function parseArgs(): MirrorOptions {
  const [, , repoArg, revArg] = argv
  if (!repoArg) {
    console.error('Usage: bun scripts/mirror-hf-repo.ts <repo> [revision]')
    process.exit(1)
  }
  return {
    repo: repoArg,
    revision: revArg || 'main',
  }
}

/**
 * Returns true if the string looks like a URL.
 */
function isUrlLike(s: string) {
  return s.startsWith('http://') || s.startsWith('https://')
}

/**
 * Normalize the repo argument into `org/repo` form.
 *
 * Accepts either `org/repo` or `https://huggingface.co/org/repo`.
 * Throws on invalid formats.
 */
function parseRepo(repo: string) {
  // Accept either `org/repo` or full URL
  if (isUrlLike(repo)) {
    const u = new URL(repo)
    // e.g. https://huggingface.co/org/repo
    const parts = u.pathname.replace(/^\/+/, '').split('/')
    if (parts.length < 2) throw new Error('Invalid HF URL, expected /org/repo')
    return `${parts[0]}/${parts[1]}`
  }
  if (!repo.includes('/')) throw new Error('Invalid repo. Expected org/repo')
  return repo
}

/**
 * Run a child process with inherited stdio, rejecting on non-zero exit.
 */
async function run(cmd: string, args: string[], cwd?: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

/**
 * Async generator yielding absolute file paths under a root, excluding `.git`.
 */
async function* walkFiles(rootDir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true })
  for (const e of entries) {
    const p = path.join(rootDir, e.name)
    if (e.name === '.git') continue
    if (e.isDirectory()) {
      yield* walkFiles(p)
    } else if (e.isFile()) {
      yield p
    }
  }
}

/**
 * Map a repo id to the object prefix used in R2.
 */
function toModelPath(repoId: string) {
  return repoId
}

/**
 * Build the target key in R2 following Hugging Face layout.
 *
 * Produces: `<model>/resolve/<revision>/<relative_path>`.
 */
function toS3Key(model: string, revision: string, repoRoot: string, absFilePath: string) {
  const rel = path.relative(repoRoot, absFilePath).split(path.sep).join('/')
  return `${model}/resolve/${revision}/${rel}`
}

/**
 * Clone a HF repo, fetch LFS objects, and upload files to R2.
 */
async function mirrorRepo(opts: MirrorOptions) {
  const repoId = parseRepo(opts.repo)
  const model = toModelPath(repoId)

  const tmpRoot = path.join(process.cwd(), '.tmp')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const destDir = path.join(tmpRoot, `hf-${repoId.replace(/[\/]/g, '__')}__${stamp}`)
  await fs.mkdir(destDir, { recursive: true })

  const repoUrl = isUrlLike(opts.repo) ? opts.repo : `https://huggingface.co/${repoId}`

  console.log('📦 Clone   | ▶️  Starting clone of', repoUrl)
  await run('git', ['clone', '--depth=1', repoUrl, destDir])
  console.log('📦 Clone   | ✅ Completed')

  console.log('🔀 Checkout| ▶️  Checking out revision', opts.revision)
  await run('git', ['fetch', '--all', '--tags'], destDir)
  await run('git', ['checkout', opts.revision], destDir)
  console.log('🔀 Checkout| ✅ Completed')

  console.log('📥 LFS     | ▶️  Installing and fetching objects')
  await run('git', ['lfs', 'install'], destDir)
  await run('git', ['lfs', 'fetch', '--all'], destDir)
  await run('git', ['lfs', 'checkout'], destDir)
  console.log('📥 LFS     | ✅ Completed')

  console.log('🧮 Files   | ▶️  Enumerating repository files')
  const files: string[] = []
  for await (const f of walkFiles(destDir)) files.push(f)
  console.log('🧮 Files   | ✅ Found', files.length, 'files')

  console.log('☁️ Upload  | ▶️  Uploading files to R2 bucket', env.R2_BUCKET)
  const startTs = Date.now()
  let completed = 0
  let failed = 0
  const inflight = new Set<Promise<void>>()
  const inflightKeys = new Set<string>()

  const fmtBytes = (n: number) => {
    const units = ['B','KB','MB','GB','TB']
    let i = 0; let v = n
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
    return `${v.toFixed(1)} ${units[i]}`
  }
  const fmtMs = (ms: number) => `${(ms/1000).toFixed(1)}s`

  const heartbeat = setInterval(() => {
    console.log(
      '⏳ Heartbeat| in-flight:', inflight.size,
      '| done:', completed, '/', files.length,
      '| failed:', failed,
      '| elapsed:', fmtMs(Date.now() - startTs)
    )
    if (inflightKeys.size) {
      const sample = Array.from(inflightKeys).slice(0, 3)
      console.log('   ↪︎ Working on:', sample.join(', '), inflightKeys.size > 3 ? `…(+${inflightKeys.size-3})` : '')
    }
  }, 10_000)

  const runWithLimit = async (task: () => Promise<void>, key: string) => {
    while (inflight.size >= MAX_PARALLEL) {
      await Promise.race(inflight)
    }
    const p = task()
      .catch((e) => {
        failed++
        console.warn('❌ Failed   |', key, e)
      })
      .finally(() => {
        inflight.delete(p)
        inflightKeys.delete(key)
      })
    inflight.add(p)
    inflightKeys.add(key)
  }

  for (const abs of files) {
    const key = toS3Key(model, opts.revision, destDir, abs)
    const st = await fs.stat(abs)

    await runWithLimit(async () => {
      const started = Date.now()
      console.log('🚚 Start   |', key, `(${fmtBytes(st.size)})`)
      const data = await fs.readFile(abs)
      await upsertObject({ key, body: data })
      completed++
      const dt = Date.now() - started
      const mbps = st.size > 0 ? (st.size / 1024 / 1024) / (dt / 1000) : 0
      console.log('✅ Done    |', key, `in ${fmtMs(dt)} @ ${mbps.toFixed(2)} MB/s`)
    }, key)
  }

  // Wait for remaining tasks
  if (inflight.size) {
    await Promise.allSettled(Array.from(inflight))
  }
  clearInterval(heartbeat)

  console.log('✅ Done     | Mirror complete:', {
    model,
    revision: opts.revision,
    bucket: env.R2_BUCKET,
    totalFiles: files.length,
  })

  // Do not delete temp clone to aid debugging; uncomment to clean up
  // await fs.rm(destDir, { recursive: true, force: true })
}

/**
 * CLI entrypoint.
 */
async function main() {
  const opts = parseArgs()
  await mirrorRepo(opts)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


