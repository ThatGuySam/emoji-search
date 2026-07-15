import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { EmojiSearchView } from '@/components/EmojiSearchView'

import { getDesktopHost } from './host'
import { searchEmoji } from './search'

type EmojiValue = {
  char: string
  name: string
}

export function shouldBypassPaletteKey(event: {
  key: string
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  isComposing: boolean
}): boolean {
  return event.isComposing ||
    event.key === 'Process' ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
}

function renderedColumnCount(): number {
  const buttons = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-emoji-result]',
    ),
  )
  const first = buttons[0]
  if (!first) return 1

  const firstTop = first.getBoundingClientRect().top
  const count = buttons.findIndex((button) =>
    Math.abs(
      button.getBoundingClientRect().top - firstTop,
    ) > 1,
  )

  return count === -1 ? buttons.length : count
}

export function App() {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] =
    useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] =
    useState('Ready')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const hasQuery = query.trim().length > 0
  const results = useMemo(
    () => hasQuery ? searchEmoji(query, 21) : [],
    [hasQuery, query],
  )
  const rows = useMemo(
    () => results.map((result) =>
      `${result.emoji} ${result.label}`),
    [results],
  )

  const prepareForSearch = useCallback(() => {
    setQuery('')
    setSelectedIndex(null)
    setStatusMessage('Ready')
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  useEffect(() => {
    prepareForSearch()
    window.addEventListener('focus', prepareForSearch)
    window.addEventListener(
      'fetchmoji:open',
      prepareForSearch,
    )

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        prepareForSearch()
      }
    }
    document.addEventListener(
      'visibilitychange',
      handleVisibility,
    )

    return () => {
      window.removeEventListener('focus', prepareForSearch)
      window.removeEventListener(
        'fetchmoji:open',
        prepareForSearch,
      )
      document.removeEventListener(
        'visibilitychange',
        handleVisibility,
      )
    }
  }, [prepareForSearch])

  useEffect(() => {
    if (
      selectedIndex != null &&
      selectedIndex >= results.length
    ) {
      setSelectedIndex(
        results.length === 0 ? null : results.length - 1,
      )
    }
  }, [results.length, selectedIndex])

  const insertEmoji = useCallback(async (
    emoji: EmojiValue | undefined,
  ) => {
    if (!emoji || isSubmitting) return
    setIsSubmitting(true)

    try {
      const outcome = await getDesktopHost()
        .insertEmoji(emoji.char)
      setStatusMessage(outcome.message)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Could not insert the emoji'
      setStatusMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting])

  const moveSelection = useCallback((delta: number) => {
    if (results.length === 0) return
    setSelectedIndex((current) => {
      if (current == null) return 0
      return Math.min(
        results.length - 1,
        Math.max(0, current + delta),
      )
    })
  }, [results.length])

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (shouldBypassPaletteKey({
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      isComposing: event.nativeEvent.isComposing,
    })) {
      return
    }

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        moveSelection(1)
        break
      case 'ArrowLeft':
        event.preventDefault()
        moveSelection(-1)
        break
      case 'ArrowDown':
        event.preventDefault()
        moveSelection(renderedColumnCount())
        break
      case 'ArrowUp':
        event.preventDefault()
        moveSelection(-renderedColumnCount())
        break
      case 'Home':
        event.preventDefault()
        setSelectedIndex(results.length > 0 ? 0 : null)
        break
      case 'End':
        event.preventDefault()
        setSelectedIndex(
          results.length > 0 ? results.length - 1 : null,
        )
        break
      case 'Enter': {
        event.preventDefault()
        const index = selectedIndex ?? 0
        const result = results[index]
        void insertEmoji(result ? {
          char: result.emoji,
          name: result.label,
        } : undefined)
        break
      }
      case 'Escape':
        event.preventDefault()
        void getDesktopHost().dismiss()
        break
    }
  }

  const selectEmoji = (emoji: EmojiValue) => {
    void insertEmoji(emoji)
  }

  const updateQuery = (next: string) => {
    setQuery(next)
    setSelectedIndex(null)
  }

  const resultSummary = hasQuery
    ? `${results.length} result${
        results.length === 1 ? '' : 's'
      } for ${query}`
    : 'Ready to search'

  return (
    <>
      <EmojiSearchView
        query={query}
        results={rows}
        isCentered={!hasQuery}
        selectedIndex={selectedIndex}
        searchInputRef={inputRef}
        onQueryChange={updateQuery}
        onClear={() => updateQuery('')}
        onChip={updateQuery}
        onPick={selectEmoji}
        onMenu={selectEmoji}
        onSearchKeyDown={handleKeyDown}
        onActiveIndexChange={setSelectedIndex}
      />
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {resultSummary}. {statusMessage}
      </p>
    </>
  )
}
