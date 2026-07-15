import assert from "node:assert/strict"
import path from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"
import { isTrustedRendererUrl, validateEmoji } from "../src/emoji.mjs"

test("accepts multi-code-point emoji sequences", () => {
  assert.equal(validateEmoji("👨‍👩‍👧‍👦"), "👨‍👩‍👧‍👦")
  assert.equal(validateEmoji("👍🏽"), "👍🏽")
})

test("rejects empty, oversized, and control-character values", () => {
  assert.throws(() => validateEmoji(""), /No emoji/)
  assert.throws(() => validateEmoji("🙂\n"), /control characters/)
  assert.throws(() => validateEmoji("🙂".repeat(17)), /unexpectedly long/)
})

test("trusts only the exact local renderer document", () => {
  const renderer = path.resolve("/tmp/fetchmoji/desktop-ui/index.html")
  assert.equal(isTrustedRendererUrl(pathToFileURL(renderer).href, renderer), true)
  assert.equal(
    isTrustedRendererUrl(pathToFileURL(path.dirname(renderer)).href, renderer),
    false,
  )
  assert.equal(isTrustedRendererUrl("https://example.com/index.html", renderer), false)
})
