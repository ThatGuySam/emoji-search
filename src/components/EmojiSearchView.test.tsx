import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import { createRef } from 'react'
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { EmojiSearchView } from './EmojiSearchView'

afterEach(() => {
  cleanup()
})

describe('EmojiSearchView', () => {
  it('shares the search field and active result contract', () => {
    const inputRef = createRef<HTMLInputElement>()
    const onQueryChange = vi.fn()
    const onSearchKeyDown = vi.fn()

    render(
      <EmojiSearchView
        query="shout"
        results={['🗣️ speaking head', '📢 loudspeaker']}
        selectedIndex={1}
        searchInputRef={inputRef}
        onQueryChange={onQueryChange}
        onClear={() => {}}
        onChip={() => {}}
        onPick={() => {}}
        onMenu={() => {}}
        onSearchKeyDown={onSearchKeyDown}
      />,
    )

    const input = screen.getByRole('searchbox', {
      name: 'Search emojis by meaning',
    })

    expect(inputRef.current).toBe(input)
    expect(
      input.getAttribute('aria-activedescendant'),
    ).toBe('emoji-result-1')
    expect(screen.getByText('Results')).toBeTruthy()

    fireEvent.change(input, {
      target: { value: 'loud' },
    })
    fireEvent.keyDown(input, { key: 'ArrowDown' })

    expect(onQueryChange).toHaveBeenCalledWith('loud')
    expect(onSearchKeyDown).toHaveBeenCalledOnce()
  })
})
