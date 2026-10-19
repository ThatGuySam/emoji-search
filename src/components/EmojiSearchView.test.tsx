import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import { act, createRef } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
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

  it('keeps text typed into the server-rendered field before hydration', async () => {
    const onQueryChange = vi.fn()
    const view = (
      <EmojiSearchView
        query=""
        results={[]}
        selectedIndex={null}
        onQueryChange={onQueryChange}
        onClear={() => {}}
        onChip={() => {}}
        onPick={() => {}}
        onMenu={() => {}}
      />
    )
    const container = document.createElement('div')
    container.innerHTML = renderToString(view)
    document.body.append(container)
    container.querySelector('input')!.value = 's'

    await act(async () => {
      hydrateRoot(container, view)
    })

    expect(onQueryChange).toHaveBeenCalledWith('s')
    container.remove()
  })
})
