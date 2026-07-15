const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("fetchmojiHost", {
  insertEmoji(emoji) {
    return ipcRenderer.invoke("fetchmoji:insert-emoji", emoji)
  },
  dismiss() {
    return ipcRenderer.invoke("fetchmoji:dismiss")
  },
})
