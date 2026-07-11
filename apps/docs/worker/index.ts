/**
 * docs-auth — portable Hono auth gate for the Starlight docs-as-spec fleet.
 *
 * One Worker fronts the static `dist/` assets and enforces:
 *   - Private by default. A page is public only if its build-time entry is in
 *     `/_private-manifest.json` (`publicPaths`), produced by
 *     scripts/build-visibility-manifest.mjs. Static assets (CSS/JS/img/fonts)
 *     are always public so public pages render; `/llms*.txt` are private (they
 *     concatenate every page, including private ones).
 *   - Three ways to authenticate, so humans and agents each get a clean path:
 *       1. `Authorization: Bearer <AUTH_SECRET>`  → agents via curl/Bash
 *       2. `?key=<AUTH_SECRET>`                    → agents via tools that can't
 *          set headers (e.g. a fetch-by-URL tool); also the human bootstrap link
 *       3. an HMAC-signed `auth` cookie scoped to COOKIE_DOMAIN → humans, set
 *          once from the `?key=` bootstrap, shared across *.docs.samcarlton.com
 *   - Anonymous viewers never see private content referenced: private page URLs
 *     return the styled 404 (existence not confirmed), and on public pages every
 *     `<a>` pointing at a private page is unwrapped to plain text via HTMLRewriter.
 *
 * Portable: pure Web-platform APIs (Hono, Web Crypto, HTMLRewriter, Fetch) + an
 * `ASSETS` fetcher binding. Copy this file + the wrangler keys into any docs app.
 */
import { Hono } from "hono"

type Bindings = {
  ASSETS: Fetcher
  /** Shared secret. Set via `wrangler secret put AUTH_SECRET`. */
  AUTH_SECRET: string
  /** e.g. ".docs.samcarlton.com" to share the login cookie across the fleet.
   *  Omit (host-only cookie) on a single workers.dev host. */
  COOKIE_DOMAIN?: string
  /** Signed-cookie lifetime in days. Default 365. */
  SESSION_TTL_DAYS?: string
}

const MANIFEST_PATH = "/_private-manifest.json"
const LLMS_PATHS = new Set(["/llms.txt", "/llms-full.txt", "/llms-small.txt"])
const COOKIE_NAME = "docs_auth"

const app = new Hono<{ Bindings: Bindings }>()

app.all("*", async (c) => {
  const env = c.env
  const req = c.req.raw
  const url = new URL(req.url)
  const path = normalizePath(url.pathname)

  // Never expose the manifest itself.
  if (path === MANIFEST_PATH || path.endsWith("/_private-manifest.json")) return notFound(env, url)

  const publicPaths = await getPublicPaths(env)

  // Resolve auth: bearer header, ?key= bootstrap, or a valid signed cookie.
  const key = url.searchParams.get("key")
  const bearer = bearerToken(req)
  const viaKey = !!key && ctEq(key, env.AUTH_SECRET)
  const viaBearer = !!bearer && ctEq(bearer, env.AUTH_SECRET)
  const viaCookie = await cookieValid(req, env)
  const authed = viaKey || viaBearer || viaCookie

  // `?key=` bootstrap: mint the cookie. Browsers get a clean redirect; agents
  // (no cookie jar) get the content directly so a header-less fetch still works.
  if (viaKey) {
    const cookie = await mintCookie(env)
    if (wantsHtml(req)) {
      url.searchParams.delete("key")
      return new Response(null, {
        status: 302,
        headers: { Location: url.toString(), "Set-Cookie": cookie },
      })
    }
    const res = await env.ASSETS.fetch(assetReq(url))
    return withHeaders(res, { "Set-Cookie": cookie, "Cache-Control": "private, no-store" })
  }

  const cls = classify(path, publicPaths)

  // Private resource + not authenticated → indistinguishable from a 404.
  if (cls === "private" && !authed) return notFound(env, url)

  const res = await env.ASSETS.fetch(assetReq(url))

  // Public pages seen by anonymous viewers: strip links to private pages so
  // nav/inline references to private content become plain text.
  const isHtml = (res.headers.get("content-type") || "").includes("text/html")
  if (!authed && isHtml) {
    const rewritten = neutralizePrivateLinks(res, publicPaths)
    return withHeaders(rewritten, { "Cache-Control": "private, no-cache" })
  }
  return res
})

export default app

// ---------- classification ----------

type Class = "asset" | "private" | "public"

function classify(path: string, publicPaths: Set<string>): Class {
  if (isSensitive(path)) return "private" // dumps/sitemap/search index enumerate pages
  if (isAssetPath(path)) return "asset" // CSS/JS/img/fonts — needed to render
  return publicPaths.has(path) ? "public" : "private"
}

/** Files that would let an anonymous viewer enumerate or read private pages:
 *  the llms.txt dumps, the sitemap, and the Pagefind client search index. */
function isSensitive(p: string): boolean {
  return LLMS_PATHS.has(p) || p.startsWith("/pagefind/") || /^\/sitemap[^/]*\.xml$/.test(p)
}

function isAssetPath(p: string): boolean {
  if (p.startsWith("/_astro/")) return true
  if (isSensitive(p)) return false
  if (/\.html?$/i.test(p)) return false // pages are gated by the manifest, never assets
  return /\.[a-z0-9]+$/i.test(p) // other extensions → a static file
}

// ---------- link neutralization ----------

function neutralizePrivateLinks(res: Response, publicPaths: Set<string>): Response {
  const rewriter = new HTMLRewriter()
    // Side nav: the Sidebar template tags private links AND fully-private groups
    // with data-private. Remove them outright so they're absent from the HTML —
    // not shown, not referenced (no label, no href) — for anonymous viewers.
    .on("[data-private]", {
      element(el) {
        el.remove()
      },
    })
    // Inline/body links to private pages → plain text (keep the words, drop the link).
    .on("a[href]", {
      element(el) {
        const href = el.getAttribute("href")
        if (!href || !href.startsWith("/") || href.startsWith("//")) return // external/anchor
        const p = normalizePath(href)
        if (isAssetPath(p) || isSensitive(p)) return // leave asset/sensitive links intact
        if (!publicPaths.has(p)) el.removeAndKeepContent() // <a>text</a> → text
      },
    })
  return rewriter.transform(res)
}

// ---------- manifest ----------

let cachedPublic: Set<string> | null = null

async function getPublicPaths(env: Bindings): Promise<Set<string>> {
  if (cachedPublic) return cachedPublic
  try {
    const res = await env.ASSETS.fetch(new Request("https://assets.local" + MANIFEST_PATH))
    if (res.ok) {
      const data = (await res.json()) as { publicPaths?: string[] }
      cachedPublic = new Set((data.publicPaths || []).map(normalizePath))
    } else {
      cachedPublic = new Set()
    }
  } catch {
    cachedPublic = new Set()
  }
  return cachedPublic
}

// ---------- auth primitives ----------

function bearerToken(req: Request): string | null {
  const h = req.headers.get("Authorization") || ""
  return h.startsWith("Bearer ") ? h.slice(7) : null
}

async function cookieValid(req: Request, env: Bindings): Promise<boolean> {
  const raw = parseCookie(req.headers.get("Cookie") || "")[COOKIE_NAME]
  if (!raw) return false
  const dot = raw.lastIndexOf(".")
  if (dot < 0) return false
  const exp = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  const expNum = Number(exp)
  if (!Number.isFinite(expNum) || expNum < Date.now()) return false
  const expected = await hmac(env.AUTH_SECRET, exp)
  return ctEq(sig, expected)
}

async function mintCookie(env: Bindings): Promise<string> {
  const ttlDays = Number(env.SESSION_TTL_DAYS || "365")
  const maxAge = Math.floor(ttlDays * 24 * 60 * 60)
  const exp = String(Date.now() + maxAge * 1000)
  const sig = await hmac(env.AUTH_SECRET, exp)
  const attrs = [
    `${COOKIE_NAME}=${exp}.${sig}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ]
  if (env.COOKIE_DOMAIN) attrs.push(`Domain=${env.COOKIE_DOMAIN}`)
  return attrs.join("; ")
}

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg))
  return base64url(new Uint8Array(sig))
}

function ctEq(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a)
  const bb = new TextEncoder().encode(b)
  if (ab.length !== bb.length) return false
  let r = 0
  for (let i = 0; i < ab.length; i++) r |= ab[i] ^ bb[i]
  return r === 0
}

// ---------- helpers ----------

function notFound(env: Bindings, url: URL): Promise<Response> | Response {
  // Serve the site's styled 404 (not_found_handling: "404-page") with a 404
  // status by requesting a guaranteed-missing path.
  return env.ASSETS.fetch(new Request(new URL("/__notfound__", url.origin))).then(
    (r) => new Response(r.body, { status: 404, headers: r.headers }),
  )
}

function assetReq(url: URL): Request {
  // Strip the ?key= before handing off so it never reaches logs as a "real" URL.
  const clean = new URL(url.toString())
  clean.searchParams.delete("key")
  return new Request(clean.toString())
}

function withHeaders(res: Response, extra: Record<string, string>): Response {
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(extra)) headers.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

function wantsHtml(req: Request): boolean {
  return (req.headers.get("Accept") || "").includes("text/html")
}

function normalizePath(input: string): string {
  let p = input
  const q = p.search(/[?#]/)
  if (q >= 0) p = p.slice(0, q)
  if (!p.startsWith("/")) p = "/" + p
  // Collapse the literal static-object form of a page to its canonical path, so
  // /foo/index.html and /foo.html gate exactly like /foo/ — closing the
  // index.html bypass where the asset layer would serve the object directly.
  if (p.endsWith("/index.html")) p = p.slice(0, -"index.html".length)
  else if (p === "/index.html") p = "/"
  else if (/\.html?$/i.test(p)) p = p.replace(/\.html?$/i, "/")
  // Page paths (no file extension) get a trailing slash.
  if (p !== "/" && !/\.[a-z0-9]+$/i.test(p) && !p.endsWith("/")) p += "/"
  return p
}

function parseCookie(header: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of header.split(";")) {
    const i = part.indexOf("=")
    if (i < 0) continue
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  return out
}

function base64url(bytes: Uint8Array): string {
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
