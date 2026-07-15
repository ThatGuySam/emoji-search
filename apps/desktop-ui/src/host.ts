import { invoke } from "@tauri-apps/api/core"
import type { DesktopHost, HostActionResult } from "./types"

const browserHost: DesktopHost = {
  async insertEmoji(emoji) {
    await navigator.clipboard.writeText(emoji)
    return {
      mode: "copied",
      message: `${emoji} copied to the clipboard`,
    }
  },
  async dismiss() {
    window.close()
  },
}

const tauriHost: DesktopHost = {
  insertEmoji(emoji) {
    return invoke<HostActionResult>("insert_emoji", { emoji })
  },
  async dismiss() {
    await invoke("dismiss_palette")
  },
}

export function getDesktopHost(): DesktopHost {
  if (window.fetchmojiHost) {
    return window.fetchmojiHost
  }

  if (window.__TAURI_INTERNALS__) {
    return tauriHost
  }

  return browserHost
}
