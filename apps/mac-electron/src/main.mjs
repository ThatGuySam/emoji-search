import { execFile } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  globalShortcut,
  ipcMain,
  screen,
  systemPreferences,
} from "electron"
import { isTrustedRendererUrl, validateEmoji } from "./emoji.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SHORTCUT = "Control+Command+."
const PASTE_SCRIPT = 'tell application "System Events" to keystroke "v" using command down'
let paletteWindow
let isQuitting = false

function rendererIndex() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "desktop-ui", "index.html")
  }
  return path.resolve(__dirname, "../../desktop-ui/dist/index.html")
}

function assertTrustedSender(event) {
  if (!event.senderFrame || !isTrustedRendererUrl(event.senderFrame.url, rendererIndex())) {
    throw new Error("Rejected IPC from an untrusted renderer.")
  }
}

function positionPalette() {
  if (!paletteWindow) return
  const pointer = screen.getCursorScreenPoint()
  const { workArea } = screen.getDisplayNearestPoint(pointer)
  const [width, height] = paletteWindow.getSize()
  const x = Math.round(workArea.x + (workArea.width - width) / 2)
  const y = Math.round(workArea.y + Math.max(24, (workArea.height - height) * 0.28))
  paletteWindow.setPosition(x, y, false)
}

function showPalette() {
  if (!paletteWindow) return
  positionPalette()
  paletteWindow.show()
  paletteWindow.focus()
  void paletteWindow.webContents.executeJavaScript(
    "window.dispatchEvent(new Event('fetchmoji:open'))",
    true,
  )
}

function hidePalette() {
  paletteWindow?.hide()
  app.hide()
}

function togglePalette() {
  if (paletteWindow?.isVisible()) hidePalette()
  else showPalette()
}

function sendPasteShortcut() {
  return new Promise((resolve) => {
    execFile(
      "/usr/bin/osascript",
      ["-e", PASTE_SCRIPT],
      { timeout: 2500, windowsHide: true },
      (error) => resolve(error === null),
    )
  })
}

async function insertEmoji(emoji) {
  validateEmoji(emoji)
  clipboard.writeText(emoji)
  hidePalette()

  if (!systemPreferences.isTrustedAccessibilityClient(true)) {
    return {
      mode: "copied",
      message: `${emoji} copied — allow Accessibility access to paste automatically`,
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 90))
  const pasted = await sendPasteShortcut()
  return pasted
    ? { mode: "pasted", message: `${emoji} pasted` }
    : {
        mode: "copied",
        message: `${emoji} copied — allow Automation access to paste automatically`,
      }
}

function createPaletteWindow() {
  paletteWindow = new BrowserWindow({
    width: 680,
    height: 430,
    minWidth: 680,
    minHeight: 430,
    maxWidth: 680,
    maxHeight: 430,
    show: false,
    frame: false,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hiddenInMissionControl: true,
    backgroundColor: "#f5f3fb",
    title: "FetchMoji",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  paletteWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  paletteWindow.on("blur", () => hidePalette())
  paletteWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault()
      hidePalette()
    }
  })
  paletteWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  paletteWindow.webContents.on("will-attach-webview", (event) => event.preventDefault())
  paletteWindow.webContents.on("will-navigate", (event, targetUrl) => {
    if (!isTrustedRendererUrl(targetUrl, rendererIndex())) event.preventDefault()
  })
  void paletteWindow.loadFile(rendererIndex())
}

ipcMain.handle("fetchmoji:insert-emoji", (event, emoji) => {
  assertTrustedSender(event)
  return insertEmoji(emoji)
})

ipcMain.handle("fetchmoji:dismiss", (event) => {
  assertTrustedSender(event)
  hidePalette()
})

app.on("before-quit", () => {
  isQuitting = true
})

app.on("will-quit", () => {
  globalShortcut.unregisterAll()
})

app.on("window-all-closed", () => {
  // The global shortcut remains available until the user explicitly quits.
})

await app.whenReady()
app.setName("FetchMoji Electron")
app.dock?.hide()
createPaletteWindow()

if (!globalShortcut.register(SHORTCUT, togglePalette)) {
  dialog.showErrorBox(
    "FetchMoji shortcut unavailable",
    "Control-Command-. could not be registered. Another app may already use it.",
  )
}

if (process.env.FETCHMOJI_SHOW_ON_LAUNCH === "1") {
  paletteWindow.webContents.once("did-finish-load", showPalette)
}
