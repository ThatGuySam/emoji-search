import {
  type KeyboardEventHandler,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react'

import type { RecentEmoji } from '@/lib/recentEmojis'

import { Button } from './Button'
import { Input } from './Input'
import { RecentEmojiSection } from './RecentEmojiSection'
import { ResultGrid, emojiResultId } from './ResultGrid'

type EmojiValue = {
  char: string
  name: string
}

export type EmojiSearchViewProps = {
  query: string
  results: string[]
  recentEmojis?: RecentEmoji[]
  isSearching?: boolean
  backendError?: string | null
  searchError?: string | null
  isCentered?: boolean
  selectedIndex?: number | null
  searchInputRef?: RefObject<HTMLInputElement | null>
  onQueryChange: (next: string) => void
  onClear: () => void
  onChip: (chip: string) => void
  onPick: (emoji: EmojiValue) => void
  onMenu: (emoji: EmojiValue) => void
  onSearchKeyDown?: KeyboardEventHandler<HTMLInputElement>
  onActiveIndexChange?: (index: number) => void
}

/**
 * Shared FetchMoji search surface.
 *
 * The website and desktop hosts provide different search and insertion
 * controllers, but render this exact component tree and stylesheet.
 */
export function EmojiSearchView(props: EmojiSearchViewProps) {
  const {
    query,
    results,
    recentEmojis = [],
    isSearching = false,
    backendError = null,
    searchError = null,
    isCentered = false,
    selectedIndex,
    searchInputRef,
    onQueryChange,
    onClear,
    onChip,
    onPick,
    onMenu,
    onSearchKeyDown,
    onActiveIndexChange,
  } = props
  const [spacerHeight, setSpacerHeight] = useState(0)
  const headerRef = useRef<HTMLElement | null>(null)
  const hasQuery = query.trim().length > 0
  const showResultsMeta =
    hasQuery ||
    results.length > 0 ||
    isSearching ||
    Boolean(searchError)

  useEffect(() => {
    const updateSpacer = () => {
      if (!headerRef.current) return
      if (!isCentered) {
        setSpacerHeight(0)
        return
      }

      const headerBox =
        headerRef.current.getBoundingClientRect()
      const target = Math.max(
        0,
        window.innerHeight / 2 -
          headerBox.height / 2 -
          12,
      )
      setSpacerHeight(Math.floor(target))
    }

    updateSpacer()
    window.addEventListener('resize', updateSpacer)
    return () =>
      window.removeEventListener('resize', updateSpacer)
  }, [isCentered])

  return (
    <div className="min-h-dvh max-w-xl grid grid-rows-[auto_auto_minmax(0,1fr)] mx-auto p-4">
      <div
        aria-hidden
        className="transition-[height] duration-300"
        style={{ height: `${spacerHeight}px` }}
      />
      <header
        className="sticky top-0 z-10 border-b backdrop-blur
        bg-background/80 supports-[backdrop-filter]:bg-background/60
        px-3 pt-[max(8px,env(safe-area-inset-top))] pb-2"
        ref={headerRef}
      >
        <SearchHeader
          query={query}
          showSpinner={isSearching}
          selectedIndex={selectedIndex}
          inputRef={searchInputRef}
          onChange={onQueryChange}
          onClear={onClear}
          onChip={onChip}
          onKeyDown={onSearchKeyDown}
        />
      </header>

      <main className="min-h-0 overflow-y-auto p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <h1 className="sr-only">Emoji search</h1>
        {!hasQuery ? (
          <RecentEmojiSection
            emojis={recentEmojis}
            onCopy={onPick}
            onMenu={onMenu}
          />
        ) : null}
        {showResultsMeta ? (
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Results
            {backendError ? (
              <span className="ml-2 text-xs font-normal text-amber-700">
                fallback
              </span>
            ) : null}
          </h2>
        ) : null}
        {searchError ? (
          <p
            role="status"
            aria-live="polite"
            className="mb-3 text-sm text-amber-700"
          >
            {searchError}
          </p>
        ) : null}
        <ResultGrid
          results={results}
          selectedIndex={selectedIndex}
          onActiveIndexChange={onActiveIndexChange}
          onCopy={onPick}
          onMenu={onMenu}
        />
        {isSearching ? (
          <div className="sr-only" aria-live="polite">
            Loading...
          </div>
        ) : null}
      </main>
    </div>
  )
}

function SearchHeader(props: {
  query: string
  showSpinner: boolean
  selectedIndex?: number | null
  inputRef?: RefObject<HTMLInputElement | null>
  onChange: (next: string) => void
  onClear: () => void
  onChip: (chip: string) => void
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>
}) {
  const {
    query,
    showSpinner,
    selectedIndex,
    inputRef: externalInputRef,
    onChange,
    onClear,
    onChip,
    onKeyDown,
  } = props
  const localInputRef = useRef<HTMLInputElement | null>(null)
  const inputRef = externalInputRef ?? localInputRef
  const chips = (!query ? [
    'shout',
    'attach',
    'copy',
    'celebrate',
    'secure',
    'search',
  ] : []).slice(0, 6)

  useEffect(() => {
    if (!inputRef.current) return
    if (document.activeElement === inputRef.current) return

    inputRef.current.focus({
      preventScroll: true,
    })
  }, [])

  return (
    <>
      <label className="flex items-center gap-2 whitespace-nowrap">
        <Input
          ref={inputRef}
          placeholder="Search emojis by meaning… try shout, attach, celebrate"
          aria-label="Search emojis by meaning"
          aria-activedescendant={
            selectedIndex == null
              ? undefined
              : emojiResultId(selectedIndex)
          }
          aria-controls="emoji-results"
          autoFocus
          value={query}
          onChange={(event) =>
            onChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <Button
          variant="outline"
          disabled={query.length === 0}
          onClick={onClear}
          aria-label="Clear search"
          title="Clear"
        >
          ✕
        </Button>
        {showSpinner ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span
              aria-hidden="true"
              className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
            />
            <span>Searching…</span>
          </span>
        ) : null}
      </label>
      <div
        className="mt-2 flex flex-wrap gap-2"
        aria-live="polite"
      >
        {chips.map((chip) => (
          <Button
            key={chip}
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => onChip(chip)}
          >
            {chip}
          </Button>
        ))}
      </div>
    </>
  )
}
