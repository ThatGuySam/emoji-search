import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { bindEmojiCopySurface } from './emojiCopySurface'
import {
  RECENT_EMOJIS_STORAGE_KEY,
  loadRecentEmojis,
} from './recentEmojis'

const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  'clipboard',
)
const originalLocalStorage = Object.getOwnPropertyDescriptor(
  window,
  'localStorage',
)
let storage: Storage

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key) {
      return values.get(key) ?? null
    },
    key(index) {
      return [...values.keys()][index] ?? null
    },
    removeItem(key) {
      values.delete(key)
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

function renderCopySurface() {
  document.body.innerHTML = `
    <section data-emoji-copy-root>
      <button
        type="button"
        data-copy-emoji="🚀"
        data-copy-name="rocket"
      >
        🚀
      </button>
      <div data-emoji-copy-toast></div>
    </section>
  `

  bindEmojiCopySurface(document)

  return document.querySelector<HTMLButtonElement>(
    '[data-copy-emoji]',
  )
}

beforeEach(() => {
  storage = createMemoryStorage()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: storage,
  })
})

afterEach(() => {
  document.body.replaceChildren()
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

  if (originalLocalStorage) {
    Object.defineProperty(
      window,
      'localStorage',
      originalLocalStorage,
    )
  } else {
    Reflect.deleteProperty(window, 'localStorage')
  }
})

describe('bindEmojiCopySurface', () => {
  it('records a successfully copied intent-page emoji', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })

    renderCopySurface()?.click()

    await vi.waitFor(() => {
      expect(loadRecentEmojis(storage)).toEqual([
        { char: '🚀', name: 'rocket' },
      ])
    })
    expect(
      document.querySelector('[data-emoji-copy-toast]')
        ?.textContent,
    ).toBe('Copied rocket 🚀')
  })

  it('does not record a rejected clipboard write', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(
          new DOMException('Denied', 'NotAllowedError'),
        ),
      },
    })

    renderCopySurface()?.click()

    await vi.waitFor(() => {
      expect(
        navigator.clipboard.writeText,
      ).toHaveBeenCalled()
    })
    expect(
      storage.getItem(
        RECENT_EMOJIS_STORAGE_KEY,
      ),
    ).toBeNull()
  })
})
