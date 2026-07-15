import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { RecentEmojiSection } from './RecentEmojiSection'

afterEach(() => {
  cleanup()
})

describe('RecentEmojiSection', () => {
  it('is entirely absent when there are no recent emojis', () => {
    const { container } = render(
      <RecentEmojiSection
        emojis={[]}
        onCopy={() => {}}
        onMenu={() => {}}
      />,
    )

    expect(container.firstChild).toBeNull()
    expect(
      screen.queryByRole('heading', {
        name: 'Recently used',
      }),
    ).toBeNull()
  })

  it('renders stored emojis accessibly in their stored order', () => {
    render(
      <RecentEmojiSection
        emojis={[
          { char: '🚀', name: 'rocket' },
          { char: '🎉', name: 'party popper' },
          { char: '🔒', name: 'locked' },
        ]}
        onCopy={() => {}}
        onMenu={() => {}}
      />,
    )

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Recently used',
      }),
    ).toBeTruthy()

    const list = screen.getByRole('list', {
      name: 'Recently used',
    })
    expect(list.className).toContain('grid')
    expect(list.className).toContain('auto-fill')
    expect(list.className).not.toContain('overflow-x-auto')
    const buttons = within(list).getAllByRole('button')

    expect(
      buttons.map((button) =>
        button.getAttribute('aria-label'),
      ),
    ).toEqual([
      'Copy rocket emoji',
      'Copy party popper emoji',
      'Copy locked emoji',
    ])
  })

  it('forwards copy and menu interactions for stored emojis', () => {
    const onCopy = vi.fn()
    const onMenu = vi.fn()
    const emoji = {
      char: '🚀',
      name: 'rocket',
    }

    render(
      <RecentEmojiSection
        emojis={[emoji]}
        onCopy={onCopy}
        onMenu={onMenu}
      />,
    )

    const button = screen.getByRole('button', {
      name: 'Copy rocket emoji',
    })
    fireEvent.click(button)
    fireEvent.contextMenu(button)

    expect(onCopy).toHaveBeenCalledWith(emoji)
    expect(onMenu).toHaveBeenCalledWith(emoji)
  })
})
