/**
 * visibility.ts — single source of truth for which docs pages are public.
 *
 * Private by default: a page is public only if its frontmatter sets
 * `public: true` (alias `private: false`). Derived from the content collection
 * at build time, so new pages and visibility changes are picked up automatically
 * — no hand-maintained lists. The auth Worker enforces the same rule at runtime
 * from dist/_private-manifest.json; this module is the build-time twin used by
 * the sidebar template to mark private nav entries.
 */
import { getCollection } from "astro:content"

let cache: Set<string> | null = null

/** Set of normalized, public page paths (e.g. "/", "/overview/introduction/"). */
export async function getPublicPaths(): Promise<Set<string>> {
  if (cache) return cache
  const docs = await getCollection("docs")
  const set = new Set<string>()
  for (const entry of docs) {
    const isPublic = entry.data.public === true || entry.data.private === false
    if (isPublic) set.add(idToPath((entry.data as { slug?: string }).slug ?? entry.id))
  }
  cache = set
  return set
}

/** content-collection id/slug ("overview/introduction", "index") → URL path. */
function idToPath(id: string): string {
  let s = String(id).replace(/^\/+|\/+$/g, "")
  s = s.replace(/\/index$/, "")
  if (s === "index") s = ""
  return s === "" ? "/" : `/${s}/`
}

/** Normalize a sidebar href to the same shape as getPublicPaths() entries. */
export function hrefToPath(href: string): string {
  let p = href
  const m = p.match(/^[a-z]+:\/\/[^/]+(\/.*)$/i)
  if (m) p = m[1]
  const cut = p.search(/[?#]/)
  if (cut >= 0) p = p.slice(0, cut)
  if (!p.startsWith("/")) p = "/" + p
  if (p !== "/" && !/\.[a-z0-9]+$/i.test(p) && !p.endsWith("/")) p += "/"
  return p
}

export function isPublicHref(href: string, pub: Set<string>): boolean {
  return pub.has(hrefToPath(href))
}

/** A sidebar entry is private if it's a non-public link, or a group whose every
 *  descendant is private (so fully-private groups get removed wholesale). */
export function isEntryPrivate(entry: any, pub: Set<string>): boolean {
  if (entry?.type === "link") return !isPublicHref(entry.href, pub)
  const kids = entry?.entries ?? []
  return kids.length > 0 && kids.every((e: any) => isEntryPrivate(e, pub))
}

export function entriesHaveCurrent(entries: any[]): boolean {
  return entries.some((e) =>
    e?.type === "link" ? e.isCurrent : entriesHaveCurrent(e?.entries ?? []),
  )
}
