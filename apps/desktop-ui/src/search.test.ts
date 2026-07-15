import { describe, expect, it } from "vitest"
import { getQuickPicks, searchEmoji } from "./search"

describe("desktop emoji search", () => {
  it("returns a real curated quick-pick set for an empty query", () => {
    const results = getQuickPicks()

    expect(results).toHaveLength(18)
    expect(results[0]).toMatchObject({ emoji: "😂", label: "face with tears of joy" })
    expect(results.every((result) => result.keywords.length > 0)).toBe(true)
  })

  it("ranks an exact CLDR-style name first", () => {
    expect(searchEmoji("thinking face")[0]?.emoji).toBe("🤔")
  })

  it("requires every query term while matching synonyms", () => {
    expect(searchEmoji("laugh tears")[0]?.emoji).toBe("😂")
  })

  it("returns an empty state for an unknown term", () => {
    expect(searchEmoji("definitelynotanemojikeyword")).toEqual([])
  })
})
