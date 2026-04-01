import {
  buildEmojiCopyMessage,
  copyEmojiToClipboard,
} from './copyEmoji'

const ROOT_SELECTOR = '[data-emoji-copy-root]'
const BUTTON_SELECTOR = '[data-copy-emoji]'
const TOAST_SELECTOR = '[data-emoji-copy-toast]'

function bindRoot(root: HTMLElement) {
  if (root.dataset.copyBound === 'true') {
    return
  }

  root.dataset.copyBound = 'true'

  const toast = root.querySelector<HTMLElement>(
    TOAST_SELECTOR,
  )
  let toastTimer: number | null = null

  root.addEventListener('click', async (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) {
      return
    }

    const button = target.closest<HTMLElement>(
      BUTTON_SELECTOR,
    )
    if (!button || !root.contains(button)) {
      return
    }

    const char = button.dataset.copyEmoji ?? ''
    const name = button.dataset.copyName ?? 'emoji'
    if (!char) {
      return
    }

    await copyEmojiToClipboard(char)

    if (!toast) {
      return
    }

    toast.textContent = buildEmojiCopyMessage({
      char,
      name,
    })
    toast.dataset.active = 'true'

    if (toastTimer != null) {
      window.clearTimeout(toastTimer)
    }

    toastTimer = window.setTimeout(() => {
      toast.dataset.active = 'false'
    }, 1200)
  })
}

export function bindEmojiCopySurface(
  root: ParentNode = document,
) {
  root
    .querySelectorAll<HTMLElement>(ROOT_SELECTOR)
    .forEach(bindRoot)
}
