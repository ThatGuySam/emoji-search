import path from "node:path"
import { fileURLToPath } from "node:url"

export function validateEmoji(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError("No emoji was selected.")
  }

  if (Buffer.byteLength(value, "utf8") > 64) {
    throw new TypeError("The selected emoji sequence is unexpectedly long.")
  }

  for (const character of value) {
    const codePoint = character.codePointAt(0)
    if (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)) {
      throw new TypeError("The selected value contains control characters.")
    }
  }

  return value
}

export function isTrustedRendererUrl(candidateUrl, rendererIndex) {
  try {
    if (new URL(candidateUrl).protocol !== "file:") return false
    return path.resolve(fileURLToPath(candidateUrl)) === path.resolve(rendererIndex)
  } catch {
    return false
  }
}
