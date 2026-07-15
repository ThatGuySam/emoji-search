export type InsertMode = "pasted" | "copied"

export interface HostActionResult {
  mode: InsertMode
  message: string
}

export interface DesktopHost {
  insertEmoji(emoji: string): Promise<HostActionResult>
  dismiss(): Promise<void>
}

export interface EmojiResult {
  emoji: string
  label: string
  keywords: readonly string[]
}

declare global {
  interface Window {
    fetchmojiHost?: DesktopHost
    __TAURI_INTERNALS__?: unknown
  }
}
