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
})
