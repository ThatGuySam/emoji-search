import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { ResultGrid } from './ResultGrid'

afterEach(() => {
  cleanup()
})

describe('ResultGrid', () => {
  it('uses a resolved emoji name for emoji-only rows', () => {
    render(
      <ResultGrid
        results={['🚀']}
        onCopy={() => {}}
        onMenu={() => {}}
      />,
    )

    expect(
      screen.getByRole('button', {
        name: 'Copy rocket emoji',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('img', {
        name: 'rocket',
      }),
    ).toBeTruthy()
  })

  it('passes the resolved name to the copy handler', () => {
    const onCopy = vi.fn()

    render(
      <ResultGrid
        results={['🚀']}
        onCopy={onCopy}
        onMenu={() => {}}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Copy rocket emoji',
      }),
    )

    expect(onCopy).toHaveBeenCalledWith({
      char: '🚀',
      name: 'rocket',
    })
  })

  it('exposes desktop keyboard selection without moving focus', () => {
    const onActiveIndexChange = vi.fn()

    render(
      <ResultGrid
        results={['🚀 rocket', '🎉 party popper']}
        selectedIndex={1}
        onActiveIndexChange={onActiveIndexChange}
        onCopy={() => {}}
        onMenu={() => {}}
      />,
    )

    const rocket = screen.getByRole('button', {
      name: 'Copy rocket emoji',
    })
    const party = screen.getByRole('button', {
      name: 'Copy party popper emoji',
    })

    expect(rocket.getAttribute('data-active')).toBeNull()
    expect(party.getAttribute('data-active')).toBe('true')
    expect(party.id).toBe('emoji-result-1')

    fireEvent.pointerEnter(rocket)
    expect(onActiveIndexChange).toHaveBeenCalledWith(0)
  })
})
