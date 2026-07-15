import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { copyEmojiToClipboard } from './copyEmoji'

const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  'clipboard',
)
const originalVibrate = Object.getOwnPropertyDescriptor(
  navigator,
  'vibrate',
)

afterEach(() => {
  vi.restoreAllMocks()

  if (originalClipboard) {
    Object.defineProperty(
      navigator,
      'clipboard',
      originalClipboard,
    )
  } else {
    Reflect.deleteProperty(navigator, 'clipboard')
  }

  if (originalVibrate) {
    Object.defineProperty(
      navigator,
      'vibrate',
      originalVibrate,
    )
  } else {
    Reflect.deleteProperty(navigator, 'vibrate')
  }
})

describe('copyEmojiToClipboard', () => {
  it('reports a successful copy and provides light feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: vibrate,
    })

    await expect(
      copyEmojiToClipboard('🚀'),
    ).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('🚀')
    expect(vibrate).toHaveBeenCalledWith(10)
  })

  it('reports a rejected clipboard write', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(
          new DOMException('Denied', 'NotAllowedError'),
        ),
      },
    })

    await expect(
      copyEmojiToClipboard('🚀'),
    ).resolves.toBe(false)
  })
})
