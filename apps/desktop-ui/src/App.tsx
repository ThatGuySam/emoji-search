import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { getDesktopHost } from "./host"
import { searchEmoji } from "./search"
import type { EmojiResult } from "./types"

const GRID_COLUMNS = 6

function resultId(result: EmojiResult, index: number): string {
  const codePoints = Array.from(result.emoji, (character) =>
    character.codePointAt(0)?.toString(16),
  ).join("-")
  return `emoji-${codePoints}-${index}`
}

export function App() {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState("Ready")
  const inputRef = useRef<HTMLInputElement>(null)
  const results = useMemo(() => searchEmoji(query), [query])
  const selectedResult = results[selectedIndex]

  const prepareForSearch = useCallback(() => {
    setQuery("")
    setSelectedIndex(0)
    setStatusMessage("Ready")
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  useEffect(() => {
    prepareForSearch()
    window.addEventListener("focus", prepareForSearch)
    window.addEventListener("fetchmoji:open", prepareForSearch)

    const handleVisibility = () => {
      if (document.visibilityState === "visible") prepareForSearch()
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.removeEventListener("focus", prepareForSearch)
      window.removeEventListener("fetchmoji:open", prepareForSearch)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [prepareForSearch])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (selectedIndex >= results.length) setSelectedIndex(Math.max(0, results.length - 1))
  }, [results.length, selectedIndex])

  const insertEmoji = useCallback(async (result: EmojiResult | undefined) => {
    if (!result || isSubmitting) return
    setIsSubmitting(true)

    try {
      const outcome = await getDesktopHost().insertEmoji(result.emoji)
      setStatusMessage(outcome.message)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not insert the emoji"
      setStatusMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting])

  const moveSelection = useCallback((delta: number) => {
    if (results.length === 0) return
    setSelectedIndex((current) => {
      const next = current + delta
      return Math.min(results.length - 1, Math.max(0, next))
    })
  }, [results.length])

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault()
        moveSelection(1)
        break
      case "ArrowLeft":
        event.preventDefault()
        moveSelection(-1)
        break
      case "ArrowDown":
        event.preventDefault()
        moveSelection(GRID_COLUMNS)
        break
      case "ArrowUp":
        event.preventDefault()
        moveSelection(-GRID_COLUMNS)
        break
      case "Home":
        event.preventDefault()
        setSelectedIndex(0)
        break
      case "End":
        event.preventDefault()
        setSelectedIndex(Math.max(0, results.length - 1))
        break
      case "Enter":
        event.preventDefault()
        void insertEmoji(selectedResult)
        break
      case "Escape":
        event.preventDefault()
        void getDesktopHost().dismiss()
        break
    }
  }

  const handlePointerSelection = (
    event: PointerEvent<HTMLLIElement>,
    result: EmojiResult,
  ) => {
    event.preventDefault()
    void insertEmoji(result)
  }

  const resultSummary = query.trim()
    ? `${results.length} result${results.length === 1 ? "" : "s"} for ${query}`
    : "Quick picks"

  return (
    <main className="palette" aria-label="FetchMoji emoji palette">
      <header className="search-region">
        <span className="app-mark" aria-hidden="true">F</span>
        <label className="visually-hidden" htmlFor="emoji-query">
          Describe the emoji you want
        </label>
        <input
          ref={inputRef}
          id="emoji-query"
          type="search"
          role="combobox"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck="false"
          enterKeyHint="go"
          placeholder="Describe the emoji…"
          value={query}
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls="emoji-results"
          aria-activedescendant={
            selectedResult ? resultId(selectedResult, selectedIndex) : undefined
          }
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
        />
        <kbd aria-label="Control Command Period">⌃⌘.</kbd>
      </header>

      <div className="results-heading" aria-hidden="true">
        <span>{query.trim() ? "Matches" : "Quick picks"}</span>
        <span>{results.length}</span>
      </div>

      {results.length > 0 ? (
        <ul id="emoji-results" className="results-grid" role="listbox" aria-label={resultSummary}>
          {results.map((result, index) => {
            const isSelected = index === selectedIndex
            return (
              <li
                id={resultId(result, index)}
                key={result.emoji}
                role="option"
                aria-label={`${result.label}, ${result.emoji}`}
                aria-selected={isSelected}
                className="emoji-result"
                data-selected={isSelected || undefined}
                onPointerEnter={() => setSelectedIndex(index)}
                onPointerDown={(event) => handlePointerSelection(event, result)}
              >
                <span className="emoji-glyph" aria-hidden="true">{result.emoji}</span>
                <span className="emoji-label" aria-hidden="true">{result.label}</span>
              </li>
            )
          })}
        </ul>
      ) : (
        <section className="empty-state" aria-label="No emoji found">
          <span className="empty-glyph" aria-hidden="true">⌕</span>
          <h1>No emoji found</h1>
          <p>Try a feeling, object, gesture, or phrase.</p>
        </section>
      )}

      <footer className="shortcut-help" aria-hidden="true">
        <span><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> navigate</span>
        <span><kbd>↵</kbd> insert</span>
        <span><kbd>esc</kbd> close</span>
      </footer>

      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {resultSummary}. {statusMessage}
      </p>
    </main>
  )
}
