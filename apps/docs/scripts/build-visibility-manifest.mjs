/**
 * build-visibility-manifest.mjs — emit dist/_private-manifest.json after build.
 *
 * Private by default: a docs page is PUBLIC only if its frontmatter sets
 * `public: true` (or `private: false`). Everything else — including the home
 * page and the /llms*.txt dumps — stays gated by the Worker.
 *
 * The Worker reads `publicPaths` to decide what to serve to anonymous viewers
 * and which `<a>` links to neutralize. Run via the app's build script:
 *   astro build && node scripts/build-visibility-manifest.mjs
 *
 * Portable: zero runtime deps beyond `gray-matter` (devDependency) + Node fs.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"
import matter from "gray-matter"

const root = fileURLToPath(new URL("..", import.meta.url))
const DOCS_DIR = join(root, "src", "content", "docs")
const DIST = join(root, "dist")
const OUT = join(DIST, "_private-manifest.json")

if (!existsSync(DIST)) {
  console.error("❌  dist/ not found — run `astro build` first.")
  process.exit(1)
}

/** Recursively list .md/.mdx files under a directory. */
function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (/\.(md|mdx)$/.test(entry.name)) out.push(full)
  }
  return out
}

/** Mirror Starlight's file→slug rule (no `base` configured here). */
function fileToPath(file, frontmatterSlug) {
  if (typeof frontmatterSlug === "string") {
    const s = frontmatterSlug.replace(/^\/+|\/+$/g, "")
    return s === "" ? "/" : `/${s}/`
  }
  let slug = relative(DOCS_DIR, file)
    .split(sep)
    .join("/")
    .replace(/\.(md|mdx)$/, "")
  slug = slug.replace(/\/index$/, "").replace(/^index$/, "")
  return slug === "" ? "/" : `/${slug}/`
}

const files = walk(DOCS_DIR)
const publicPaths = []
let privateCount = 0

for (const file of files) {
  const { data } = matter(readFileSync(file, "utf8"))
  const isPublic = data.public === true || data.private === false
  const path = fileToPath(file, data.slug)
  if (isPublic) publicPaths.push(path)
  else privateCount++
}

publicPaths.sort()
writeFileSync(OUT, JSON.stringify({ publicPaths }, null, 2) + "\n")

console.log(
  `🔒  Visibility manifest: ${publicPaths.length} public / ${privateCount} private page(s) → ${relative(root, OUT)}`,
)
if (publicPaths.length) console.log("   public:", publicPaths.join(", "))
